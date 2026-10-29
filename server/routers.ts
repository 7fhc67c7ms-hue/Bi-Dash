import { createHash } from "node:crypto";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { storageGetSignedUrl, storagePut } from "./storage";
import { extrairDadosDoPDFComQualidade } from "./pdfExtraction";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { filterProductionData } from "./filters";
import { z } from "zod";
import * as db from "./db";
import { invokeLLM, type Message as LLMMessage } from "./_core/llm";
import { analisarEstoque, calcularSaldoAposMovimento } from "./stock";
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
import { uploadedRouter } from "./zipFeatures";

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

const productInput = z.object({
  code: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(255),
  kind: z.enum(["acabado", "intermediario", "insumo", "embalagem"]),
  unit: z.string().trim().min(1).max(16).default("UN"),
  category: z.string().trim().max(128).optional().nullable(),
  minimumStock: z
    .string()
    .regex(/^\d+(\.\d{1,3})?$/)
    .default("0"),
  maximumStock: z
    .string()
    .regex(/^\d+(\.\d{1,3})?$/)
    .default("0"),
  reorderPoint: z
    .string()
    .regex(/^\d+(\.\d{1,3})?$/)
    .default("0"),
});
const customerInput = z.object({
  name: z.string().trim().min(1).max(255),
  document: z.string().trim().max(32).optional().nullable(),
  email: z.string().email().max(320).optional().nullable(),
  phone: z.string().trim().max(32).optional().nullable(),
});
const supplierInput = customerInput.extend({
  paymentTerms: z.string().trim().max(128).optional().nullable(),
});
const equipmentInput = z.object({
  name: z.string().trim().min(1).max(255),
  code: z.string().trim().max(64).optional().nullable(),
  sector: z.string().trim().max(128).optional().nullable(),
  maintenanceIntervalDays: z
    .number()
    .int()
    .positive()
    .max(3650)
    .optional()
    .nullable(),
});
const purchaseOrderInput = z.object({
  number: z.string().trim().min(1).max(64),
  supplierId: z.number().int().positive().optional().nullable(),
  expectedAt: z.string().datetime().optional().nullable(),
  notes: z.string().trim().max(5000).optional().nullable(),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.string().regex(/^\d+(\.\d{1,3})?$/),
        unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
      })
    )
    .min(1),
});
const qualityInput = z.object({
  productId: z.number().int().positive().optional().nullable(),
  lot: z.string().trim().max(128).optional().nullable(),
  inspectionType: z.enum(["recebimento", "processo", "acabado", "devolucao"]),
  sampleSize: z
    .string()
    .regex(/^\d+(\.\d{1,3})?$/)
    .optional()
    .nullable(),
  rejectedQuantity: z
    .string()
    .regex(/^\d+(\.\d{1,3})?$/)
    .optional()
    .nullable(),
  criteria: z.string().trim().max(5000).optional().nullable(),
  result: z.string().trim().max(5000).optional().nullable(),
});
const maintenanceInput = z.object({
  equipmentId: z.number().int().positive(),
  type: z.enum(["preventiva", "corretiva", "preditiva"]),
  priority: z.enum(["baixa", "media", "alta", "critica"]).default("media"),
  description: z.string().trim().min(1).max(5000),
  scheduledAt: z.string().datetime().optional().nullable(),
  costAmount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .default("0"),
});
const financeInput = z.object({
  type: z.enum(["pagar", "receber"]),
  description: z.string().trim().min(1).max(255),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  dueAt: z.string().datetime(),
  sourceType: z.string().trim().max(64).optional().nullable(),
  sourceId: z.number().int().positive().optional().nullable(),
});
const salesOrderInput = z.object({
  number: z.string().trim().min(1).max(64),
  customerId: z.number().int().positive().optional().nullable(),
  totalAmount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .default("0"),
  promisedAt: z.string().datetime().optional().nullable(),
  notes: z.string().trim().max(5000).optional().nullable(),
});
const bomInput = z.object({
  productId: z.number().int().positive(),
  version: z.string().trim().min(1).max(32).default("1"),
  yieldQuantity: z
    .string()
    .regex(/^\d+(\.\d{1,3})?$/)
    .default("1"),
  expectedLossPercent: z
    .string()
    .regex(/^\d+(\.\d{1,3})?$/)
    .default("0"),
  items: z
    .array(
      z.object({
        componentProductId: z.number().int().positive(),
        quantity: z.string().regex(/^\d+(\.\d{1,3})?$/),
        unit: z.string().trim().min(1).max(16).default("UN"),
      })
    )
    .min(1),
});
const productionOrderInput = z.object({
  number: z.string().trim().min(1).max(64),
  productId: z.number().int().positive(),
  billOfMaterialsId: z.number().int().positive().optional().nullable(),
  plannedQuantity: z.string().regex(/^\d+(\.\d{1,3})?$/),
  plannedStartAt: z.string().datetime().optional().nullable(),
  plannedEndAt: z.string().datetime().optional().nullable(),
  notes: z.string().trim().max(5000).optional().nullable(),
});
const costEntryInput = z.object({
  productionOrderId: z.number().int().positive().optional().nullable(),
  productId: z.number().int().positive().optional().nullable(),
  category: z.enum([
    "material",
    "mao_obra",
    "energia",
    "manutencao",
    "terceiros",
    "indireto",
    "perda",
    "outro",
  ]),
  description: z.string().trim().min(1).max(255),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  occurredAt: z.string().datetime().optional(),
});
const purchaseReceiptInput = z.object({
  orderId: z.number().int().positive(),
  receipts: z
    .array(
      z.object({
        itemId: z.number().int().positive(),
        quantity: z.string().regex(/^\d+(\.\d{1,3})?$/),
      })
    )
    .min(1),
});
const completeProductionInput = z.object({
  orderId: z.number().int().positive(),
  producedQuantity: z.string().regex(/^\d+(\.\d{1,3})?$/),
  rejectedQuantity: z
    .string()
    .regex(/^\d+(\.\d{1,3})?$/)
    .default("0"),
});
const statusInput = z.object({
  id: z.number().int().positive(),
  status: z.string().trim().min(1).max(32),
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
  uploaded: uploadedRouter,
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
      .input(
        z.object({
          messages: z
            .array(
              z.object({
                role: z.enum(["user", "assistant"]),
                content: z.string().trim().min(1).max(6000),
              })
            )
            .min(1)
            .max(12),
          context: z.string().trim().max(16000).default(""),
        })
      )
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
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "O assistente não retornou uma resposta válida.",
          });
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
        await db.deleteProductionUploadWithData(input.id, ctx.user.id);
        return { success: true };
      }),

    getStockAnalysis: protectedProcedure
      .input(
        z.object({ coberturaMeses: z.number().int().min(1).max(24).default(1) })
      )
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
        const movements = await db.getStockMovementsByUser(ctx.user.id);
        const saldoAposMovimento = calcularSaldoAposMovimento(movements, {
          tipoPlaca: input.tipoPlaca,
          movimento: input.movimento,
          quantidade: input.quantidade,
        });
        if (saldoAposMovimento < 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Movimento recusado: o saldo de ${input.tipoPlaca} não pode ficar negativo.`,
          });
        }
        const id = await db.insertStockMovement({
          userId: ctx.user.id,
          tipoPlaca: input.tipoPlaca,
          movimento: input.movimento,
          quantidade: input.quantidade,
          observacao: input.observacao ?? null,
          ocorridoEm: input.ocorridoEm
            ? new Date(input.ocorridoEm)
            : new Date(),
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
          const { key: storedPdfKey, url: stablePdfUrl } = await storagePut(
            fileKey,
            pdfBuffer,
            "application/pdf"
          );
          await db.updateProductionUpload(uploadId, ctx.user.id, {
            fileUrl: stablePdfUrl,
          });
          const extractionUrl = await storageGetSignedUrl(storedPdfKey);
          const extraction = await extrairDadosDoPDFComQualidade(extractionUrl);
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
            pdfUrl: stablePdfUrl,
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

  industrial: router({
    overview: protectedProcedure.query(async ({ ctx }) => {
      const [
        purchaseOrders,
        qualityInspections,
        maintenanceRecords,
        financeEntries,
        salesOrders,
        productionOrders,
        costEntries,
      ] = await Promise.all([
        db.listPurchaseOrders(ctx.user.id),
        db.listQualityInspections(ctx.user.id),
        db.listMaintenanceRecords(ctx.user.id),
        db.listFinanceEntries(ctx.user.id),
        db.listSalesOrders(ctx.user.id),
        db.listProductionOrders(ctx.user.id),
        db.listCostEntries(ctx.user.id),
      ]);
      const payable = financeEntries
        .filter(entry => entry.type === "pagar" && entry.status !== "cancelado")
        .reduce((sum, entry) => sum + Number(entry.amount), 0);
      const receivable = financeEntries
        .filter(
          entry => entry.type === "receber" && entry.status !== "cancelado"
        )
        .reduce((sum, entry) => sum + Number(entry.amount), 0);
      const overdue = financeEntries.filter(
        entry => entry.status === "vencido"
      ).length;
      return {
        purchaseOrders: purchaseOrders.length,
        pendingPurchases: purchaseOrders.filter(order =>
          ["pendente", "aprovado", "parcial"].includes(order.status)
        ).length,
        qualityPending: qualityInspections.filter(
          item => item.status === "pendente" || item.status === "bloqueado"
        ).length,
        maintenanceOpen: maintenanceRecords.filter(
          item => item.status === "aberta" || item.status === "em_execucao"
        ).length,
        productionOpen: productionOrders.filter(
          order => !["concluida", "cancelada"].includes(order.status)
        ).length,
        salesOpen: salesOrders.filter(
          order => !["entregue", "cancelado"].includes(order.status)
        ).length,
        payable: payable.toFixed(2),
        receivable: receivable.toFixed(2),
        overdue,
        totalCosts: costEntries
          .reduce((sum, entry) => sum + Number(entry.amount), 0)
          .toFixed(2),
      };
    }),
    products: protectedProcedure.query(({ ctx }) =>
      db.listProducts(ctx.user.id)
    ),
    createProduct: protectedProcedure
      .input(productInput)
      .mutation(({ ctx, input }) =>
        db.insertProduct({ userId: ctx.user.id, ...input, active: 1 })
      ),
    customers: protectedProcedure.query(({ ctx }) =>
      db.listCustomers(ctx.user.id)
    ),
    createCustomer: protectedProcedure
      .input(customerInput)
      .mutation(({ ctx, input }) =>
        db.insertCustomer({ userId: ctx.user.id, ...input, active: 1 })
      ),
    suppliers: protectedProcedure.query(({ ctx }) =>
      db.listSuppliers(ctx.user.id)
    ),
    createSupplier: protectedProcedure
      .input(supplierInput)
      .mutation(({ ctx, input }) =>
        db.insertSupplier({ userId: ctx.user.id, ...input, active: 1 })
      ),
    equipment: protectedProcedure.query(({ ctx }) =>
      db.listEquipment(ctx.user.id)
    ),
    createEquipment: protectedProcedure
      .input(equipmentInput)
      .mutation(({ ctx, input }) =>
        db.insertEquipment({ userId: ctx.user.id, ...input, status: "ativo" })
      ),
    purchaseOrders: protectedProcedure.query(({ ctx }) =>
      db.listPurchaseOrders(ctx.user.id)
    ),
    createPurchaseOrder: protectedProcedure
      .input(purchaseOrderInput)
      .mutation(({ ctx, input }) => {
        const totalAmount = input.items
          .reduce(
            (total, item) =>
              total + Number(item.quantity) * Number(item.unitPrice),
            0
          )
          .toFixed(2);
        return db.insertPurchaseOrder(
          {
            userId: ctx.user.id,
            number: input.number,
            supplierId: input.supplierId ?? null,
            expectedAt: input.expectedAt ? new Date(input.expectedAt) : null,
            notes: input.notes ?? null,
            totalAmount,
          },
          input.items.map(item => ({
            userId: ctx.user.id,
            purchaseOrderId: 0,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            receivedQuantity: "0",
          }))
        );
      }),
    receivePurchaseOrder: protectedProcedure
      .input(purchaseReceiptInput)
      .mutation(({ ctx, input }) =>
        db.receivePurchaseOrder(ctx.user.id, input.orderId, input.receipts)
      ),
    updatePurchaseOrderStatus: protectedProcedure
      .input(
        statusInput.extend({
          status: z.enum([
            "rascunho",
            "pendente",
            "aprovado",
            "parcial",
            "recebido",
            "cancelado",
          ]),
        })
      )
      .mutation(({ ctx, input }) =>
        db.updatePurchaseOrderStatus(ctx.user.id, input.id, input.status)
      ),
    qualityInspections: protectedProcedure.query(({ ctx }) =>
      db.listQualityInspections(ctx.user.id)
    ),
    createQualityInspection: protectedProcedure
      .input(qualityInput)
      .mutation(({ ctx, input }) =>
        db.insertQualityInspection({
          userId: ctx.user.id,
          ...input,
          productId: input.productId ?? null,
          lot: input.lot ?? null,
          sampleSize: input.sampleSize ?? null,
          rejectedQuantity: input.rejectedQuantity ?? null,
          criteria: input.criteria ?? null,
          result: input.result ?? null,
        })
      ),
    updateQualityInspectionStatus: protectedProcedure
      .input(
        statusInput.extend({
          status: z.enum(["pendente", "aprovado", "reprovado", "bloqueado"]),
        })
      )
      .mutation(({ ctx, input }) =>
        db.updateQualityInspectionStatus(ctx.user.id, input.id, input.status)
      ),
    maintenanceRecords: protectedProcedure.query(({ ctx }) =>
      db.listMaintenanceRecords(ctx.user.id)
    ),
    createMaintenanceRecord: protectedProcedure
      .input(maintenanceInput)
      .mutation(({ ctx, input }) =>
        db.insertMaintenanceRecord({
          userId: ctx.user.id,
          equipmentId: input.equipmentId,
          type: input.type,
          priority: input.priority,
          description: input.description,
          scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
          costAmount: input.costAmount,
        })
      ),
    updateMaintenanceStatus: protectedProcedure
      .input(
        statusInput.extend({
          status: z.enum(["aberta", "em_execucao", "concluida", "cancelada"]),
        })
      )
      .mutation(({ ctx, input }) =>
        db.updateMaintenanceStatus(ctx.user.id, input.id, input.status)
      ),
    financeEntries: protectedProcedure.query(({ ctx }) =>
      db.listFinanceEntries(ctx.user.id)
    ),
    createFinanceEntry: protectedProcedure
      .input(financeInput)
      .mutation(({ ctx, input }) =>
        db.insertFinanceEntry({
          userId: ctx.user.id,
          type: input.type,
          description: input.description,
          amount: input.amount,
          dueAt: new Date(input.dueAt),
          sourceType: input.sourceType ?? null,
          sourceId: input.sourceId ?? null,
        })
      ),
    updateFinanceStatus: protectedProcedure
      .input(
        statusInput.extend({
          status: z.enum(["aberto", "pago", "vencido", "cancelado"]),
        })
      )
      .mutation(({ ctx, input }) =>
        db.updateFinanceStatus(ctx.user.id, input.id, input.status)
      ),
    salesOrders: protectedProcedure.query(({ ctx }) =>
      db.listSalesOrders(ctx.user.id)
    ),
    createSalesOrder: protectedProcedure
      .input(salesOrderInput)
      .mutation(({ ctx, input }) =>
        db.insertSalesOrder({
          userId: ctx.user.id,
          number: input.number,
          customerId: input.customerId ?? null,
          totalAmount: input.totalAmount,
          promisedAt: input.promisedAt ? new Date(input.promisedAt) : null,
          notes: input.notes ?? null,
        })
      ),
    updateSalesOrderStatus: protectedProcedure
      .input(
        statusInput.extend({
          status: z.enum([
            "rascunho",
            "confirmado",
            "separacao",
            "expedido",
            "entregue",
            "cancelado",
          ]),
        })
      )
      .mutation(({ ctx, input }) =>
        db.updateSalesOrderStatus(ctx.user.id, input.id, input.status)
      ),
    billsOfMaterials: protectedProcedure.query(({ ctx }) =>
      db.listBillsOfMaterials(ctx.user.id)
    ),
    createBillOfMaterials: protectedProcedure
      .input(bomInput)
      .mutation(({ ctx, input }) =>
        db.insertBillOfMaterials(
          {
            userId: ctx.user.id,
            productId: input.productId,
            version: input.version,
            yieldQuantity: input.yieldQuantity,
            expectedLossPercent: input.expectedLossPercent,
          },
          input.items.map(item => ({
            userId: ctx.user.id,
            billOfMaterialsId: 0,
            componentProductId: item.componentProductId,
            quantity: item.quantity,
            unit: item.unit,
          }))
        )
      ),
    productionOrders: protectedProcedure.query(({ ctx }) =>
      db.listProductionOrders(ctx.user.id)
    ),
    createProductionOrder: protectedProcedure
      .input(productionOrderInput)
      .mutation(({ ctx, input }) =>
        db.insertProductionOrder({
          userId: ctx.user.id,
          number: input.number,
          productId: input.productId,
          billOfMaterialsId: input.billOfMaterialsId ?? null,
          plannedQuantity: input.plannedQuantity,
          plannedStartAt: input.plannedStartAt
            ? new Date(input.plannedStartAt)
            : null,
          plannedEndAt: input.plannedEndAt
            ? new Date(input.plannedEndAt)
            : null,
          notes: input.notes ?? null,
        })
      ),
    completeProductionOrder: protectedProcedure
      .input(completeProductionInput)
      .mutation(({ ctx, input }) =>
        db.completeProductionOrder(
          ctx.user.id,
          input.orderId,
          input.producedQuantity,
          input.rejectedQuantity
        )
      ),
    updateProductionOrderStatus: protectedProcedure
      .input(
        statusInput.extend({
          status: z.enum([
            "planejada",
            "reservada",
            "em_producao",
            "pausada",
            "concluida",
            "cancelada",
          ]),
        })
      )
      .mutation(({ ctx, input }) =>
        db.updateProductionOrderStatus(ctx.user.id, input.id, input.status)
      ),
    costEntries: protectedProcedure.query(({ ctx }) =>
      db.listCostEntries(ctx.user.id)
    ),
    createCostEntry: protectedProcedure
      .input(costEntryInput)
      .mutation(({ ctx, input }) =>
        db.insertCostEntry({
          userId: ctx.user.id,
          productionOrderId: input.productionOrderId ?? null,
          productId: input.productId ?? null,
          category: input.category,
          description: input.description,
          amount: input.amount,
          occurredAt: input.occurredAt
            ? new Date(input.occurredAt)
            : new Date(),
        })
      ),
    auditEvents: protectedProcedure.query(({ ctx }) =>
      db.listAuditEvents(ctx.user.id)
    ),
  }),
});

export type AppRouter = typeof appRouter;
