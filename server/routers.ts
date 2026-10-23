import { createHash } from "node:crypto";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { storagePut } from "./storage";
import { extrairDadosDoPDFComQualidade } from "./pdfExtraction";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { filterProductionData } from "./filters";
import { z } from "zod";
import * as db from "./db";
import { invokeLLM, type Message as LLMMessage } from "./_core/llm";
import { analisarEstoque } from "./stock";
import { analisarProducaoCliente } from "./clientAnalysis";
import {
  agruparPorMes,
  agruparPorMesOrdenado,
  calcularKPIs,
  calcularMetricasAvancadas,
  analisarMixModelos,
  compararMeses,
  criarRanking,
  criarMatrizModeloMes,
  calcularResumoMensal,
  formatarTabelaProducao,
  obterModelosPorMes,
  obterTopProdutos,
  analisarClientes,
  analisarTipos,
  calcularMetricasExecutivas,
  compararPeriodos,
  gerarRelatorioDeterministico,
  obterPeriodosDisponiveis,
  analisarConcentracao,
  analisarMixCategorias,
  analisarAcumulado,
  analisarSazonalidade,
  criarMatrizClienteTipo,
} from "./analytics";

const productionInput = z.object({
  romaneio: z.string().trim().max(64).optional().nullable(),
  cliente: z.string().trim().min(1).max(255),
  tipoPlaca: z.string().trim().min(1).max(255),
  quantidade: z.number().int().positive(),
  mes: z.string().trim().min(1).max(32),
  ano: z.number().int().min(2000).max(2100),
});

const periodSelectionInput = z.object({
  ano: z.number().int().min(2000).max(2100),
  mesInicio: z.string().trim().min(1).max(32),
  mesFim: z.string().trim().min(1).max(32),
});

const analyticsInput = z.object({
  months: z.array(z.string()).optional(),
  years: z.array(z.number().int().min(2000).max(2100)).optional(),
  cliente: z.string().optional(),
  selectedClients: z.array(z.string().trim().min(1).max(255)).default([]),
  clientFilterMode: z.enum(["INCLUIR", "EXCLUIR"]).default("INCLUIR"),
  tipoPlaca: z.string().optional(),
  tiposPlaca: z.array(z.string().trim().min(1).max(255)).optional(),
  categoria: z.enum(["TODOS", "OBRAS", "COMUNS"]).default("TODOS"),
  periodoA: periodSelectionInput.optional(),
  periodoB: periodSelectionInput.optional(),
});
const stockMovementInput = z.object({
  tipoPlaca: z.string().trim().min(1).max(255),
  movimento: z.enum(["entrada", "saida", "descarte", "devolucao"]),
  quantidade: z.number().int().positive(),
  observacao: z.string().trim().max(1000).optional().nullable(),
  ocorridoEm: z.string().datetime().optional(),
});

function decodePdf(fileBase64: string) {
  const normalized = fileBase64.replace(/^data:application\/pdf;base64,/, "");
  const buffer = Buffer.from(normalized, "base64");
  if (buffer.length === 0 || buffer.length > 15 * 1024 * 1024) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "O PDF deve ter entre 1 byte e 15 MB.",
    });
  }
  return buffer;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  assistant: router({
    chat: protectedProcedure
      .input(z.object({
        messages: z.array(z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string().trim().min(1).max(6000),
        })).min(1).max(12),
        context: z.string().trim().max(16000).default(""),
      }))
      .mutation(async ({ input }) => {
        const messages: LLMMessage[] = [
          {
            role: "system",
            content: [
              "Você é o Assistente do BI Produção — Fotoporcelana.",
              "Responda em português do Brasil, de forma objetiva e útil para uma decisão operacional.",
              "Use exclusivamente o contexto analítico enviado pelo sistema e a pergunta do usuário.",
              "Nunca invente preço, custo, margem, datas diárias, capacidade, prazo ou qualquer campo que não esteja no contexto.",
              "Quando o dado não existir, diga claramente que ele não está disponível na base atual e explique qual campo seria necessário.",
              "Diferencie quantidade produzida de valor financeiro.",
              "Ao citar números, preserve o recorte e os filtros informados.",
              `CONTEXTO ATUAL DO BI:\n${input.context || "Nenhum contexto foi fornecido."}`,
            ].join("\n\n"),
          },
          ...input.messages.map(message => ({
            role: message.role,
            content: message.content,
          })),
        ];
        const response = await invokeLLM({ messages });
        const content = response.choices[0]?.message.content;
        if (typeof content !== "string" || !content.trim()) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "O assistente não retornou uma resposta válida." });
        }
        return { content };
      }),
  }),

  production: router({
    getData: protectedProcedure
      .input(analyticsInput)
      .query(async ({ ctx, input }) => {
        const data = await db.getProductionDataByUser(
          ctx.user.id,
          input.months
        );
        return filterProductionData(data, input);
      }),

    getAnalytics: protectedProcedure
      .input(analyticsInput)
      .query(async ({ ctx, input }) => {
        const allHistoricalData = await db.getProductionDataByUser(ctx.user.id);
        const allData = input.months?.length
          ? allHistoricalData.filter(item => input.months?.includes(item.mes))
          : allHistoricalData;
        const data = filterProductionData(allData, input);
        // A comparação A/B mantém clientes, tipos e segmento globais, mas usa o
        // histórico completo: mês/ano são definidos pelos dois períodos reais.
        const historicalFilteredData = filterProductionData(allHistoricalData, {
          selectedClients: input.selectedClients,
          clientFilterMode: input.clientFilterMode,
          tipoPlaca: input.tipoPlaca,
          tiposPlaca: input.tiposPlaca,
          categoria: input.categoria,
        });
        const uploads = await db.getProductionUploadsByUser(ctx.user.id);
        const quality = uploads.reduce(
          (summary, upload) => ({
            validas: summary.validas + upload.rowsExtracted,
            rejeitadas: summary.rejeitadas + upload.rowsRejected,
            duplicados: summary.duplicados + upload.duplicatesAvoided,
          }),
          { validas: 0, rejeitadas: 0, duplicados: 0 }
        );
        const kpis = calcularKPIs(data);
        const metricasExecutivas = calcularMetricasExecutivas(data);
        const comparacaoPeriodos = compararPeriodos(
          historicalFilteredData,
          input.periodoA,
          input.periodoB
        );
        return {
          kpis,
          metricasAvancadas: {
            ...calcularMetricasAvancadas(data),
            mediaPorPedido: kpis.ticketMedio,
            qualidadeImportacao: quality,
          },
          metricasExecutivas,
          analiseClientes: analisarClientes(data),
          analiseTipos: analisarTipos(data),
          concentracao: analisarConcentracao(data),
          mixCategorias: analisarMixCategorias(data),
          evolucaoAcumulada: analisarAcumulado(data),
          sazonalidade: analisarSazonalidade(data),
          matrizClienteTipo: criarMatrizClienteTipo(data),
          comparacaoPeriodos,
          relatorioDeterministico: gerarRelatorioDeterministico(
            comparacaoPeriodos,
            data
          ),
          periodosDisponiveis: obterPeriodosDisponiveis(historicalFilteredData),
          rankingComuns: criarRanking(data, false),
          rankingObras: criarRanking(data, true),
          topProdutos: obterTopProdutos(data, 10),
          comparacaoMensalCronologica: agruparPorMes(data),
          comparacaoMensalOrdenada: agruparPorMesOrdenado(data),
          modelosPorMes: obterModelosPorMes(data),
          matrizModeloMes: criarMatrizModeloMes(data),
          resumoMensal: calcularResumoMensal(data),
          analiseMixModelos: analisarMixModelos(data),
          comparacaoMeses: compararMeses(data, input.months),
          tabelaProducao: formatarTabelaProducao(data),
          totalRegistros: data.length,
          clientes: Array.from(
            new Set(allHistoricalData.map(item => item.cliente))
          ).sort(),
          tiposPlaca: Array.from(
            new Set(allHistoricalData.map(item => item.tipoPlaca))
          ).sort(),
          mesesDisponiveis: Array.from(
            new Set(allHistoricalData.map(item => item.mes))
          ),
        };
      }),

    createRecord: protectedProcedure
      .input(productionInput)
      .mutation(async ({ ctx, input }) => {
        const id = await db.insertProductionData({
          userId: ctx.user.id,
          ...input,
        });
        return { success: true, id };
      }),

    updateRecord: protectedProcedure
      .input(
        z.object({ id: z.number().int().positive(), data: productionInput })
      )
      .mutation(async ({ ctx, input }) => {
        await db.updateProductionData(input.id, ctx.user.id, input.data);
        return { success: true };
      }),

    deleteRecord: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteProductionData(input.id, ctx.user.id);
        return { success: true };
      }),

    listUploads: protectedProcedure.query(({ ctx }) =>
      db.getProductionUploadsByUser(ctx.user.id)
    ),

    deleteUpload: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteProductionDataByUpload(input.id, ctx.user.id);
        await db.deleteProductionUpload(input.id, ctx.user.id);
        return { success: true };
      }),

    getStockAnalysis: protectedProcedure
      .input(z.object({ coberturaMeses: z.number().int().min(1).max(24).default(1) }))
      .query(async ({ ctx, input }) => {
        const [producao, movimentos] = await Promise.all([
          db.getProductionDataByUser(ctx.user.id),
          db.getStockMovementsByUser(ctx.user.id),
        ]);
        return analisarEstoque(producao, movimentos, input.coberturaMeses);
      }),

    getClientProductionAnalysis: protectedProcedure
      .input(z.object({ cliente: z.string().trim().min(1).max(255) }))
      .query(async ({ ctx, input }) => {
        const producao = await db.getProductionDataByUser(ctx.user.id);
        return analisarProducaoCliente(producao, input.cliente);
      }),

    listStockMovements: protectedProcedure.query(({ ctx }) =>
      db.getStockMovementsByUser(ctx.user.id)
    ),

    createStockMovement: protectedProcedure
      .input(stockMovementInput)
      .mutation(async ({ ctx, input }) => {
        const id = await db.insertStockMovement({
          userId: ctx.user.id,
          tipoPlaca: input.tipoPlaca,
          movimento: input.movimento,
          quantidade: input.quantidade,
          observacao: input.observacao ?? null,
          ocorridoEm: input.ocorridoEm ? new Date(input.ocorridoEm) : new Date(),
        });
        return { success: true, id };
      }),

    deleteStockMovement: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteStockMovement(input.id, ctx.user.id);
        return { success: true };
      }),

    uploadPDF: protectedProcedure
      .input(
        z.object({
          fileBase64: z.string().min(1),
          fileName: z.string().trim().min(1).max(255),
          ano: z
            .number()
            .int()
            .min(2000)
            .max(2100)
            .default(new Date().getFullYear()),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const pdfBuffer = decodePdf(input.fileBase64);
        const fileHash = createHash("sha256").update(pdfBuffer).digest("hex");
        const existing = await db.getProductionUploadByHash(
          ctx.user.id,
          fileHash
        );
        // Uploads concluídos ou ainda em processamento são idempotentes.
        // Uma falha anterior deve poder ser reprocessada sem alterar o PDF.
        if (existing && existing.status !== "failed") {
          return {
            success: true,
            duplicate: true,
            uploadId: existing.id,
            registrosInseridos: existing.rowsExtracted,
          };
        }

        const safeFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const fileKey = `${ctx.user.id}/production-pdfs/${Date.now()}-${safeFileName}`;
        const uploadId = await db.insertProductionUpload({
          userId: ctx.user.id,
          fileName: input.fileName,
          fileHash,
          status: "processing",
          rowsExtracted: 0,
        });

        try {
          const { url } = await storagePut(
            fileKey,
            pdfBuffer,
            "application/pdf"
          );
          await db.updateProductionUpload(uploadId, ctx.user.id, {
            fileUrl: url,
          });
          const extraction = await extrairDadosDoPDFComQualidade(url);
          const extracted = extraction.dados;
          await db.insertManyProductionData(
            extracted.map(item => ({
              userId: ctx.user.id,
              uploadId,
              romaneio: item.romaneio ?? null,
              cliente: item.cliente,
              tipoPlaca: item.tipoPlaca,
              quantidade: item.quantidade,
              mes: item.mes,
              ano: item.ano ?? input.ano,
              pdfFileName: input.fileName,
            }))
          );
          await db.updateProductionUpload(uploadId, ctx.user.id, {
            status: "completed",
            rowsExtracted: extracted.length,
            rowsRejected: extraction.linhasRejeitadas,
            duplicatesAvoided: extraction.duplicadosEvitados,
          });
          return {
            success: true,
            duplicate: false,
            uploadId,
            registrosInseridos: extracted.length,
            linhasRejeitadas: extraction.linhasRejeitadas,
            duplicadosEvitados: extraction.duplicadosEvitados,
            pdfUrl: url,
          };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Erro desconhecido";
          await db.updateProductionUpload(uploadId, ctx.user.id, {
            status: "failed",
            errorMessage: message,
          });
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Falha ao processar PDF: ${message}`,
          });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
