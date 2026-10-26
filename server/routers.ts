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
import { analisarCustos } from "./costs";
import { lookupCustomerLocation, summarizeCustomerLocations } from "./customerLocations";
import { analisarProducaoCliente } from "./clientAnalysis";
import { calcularConsumoTeorico } from "./formulas";
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
const productPriceInput = z.object({
  tipoPlaca: z.string().trim().min(1).max(255),
  custoCompraCentavos: z.number().int().nonnegative(),
  precoVendaCentavos: z.number().int().nonnegative(),
  vigenteDesde: z.string().datetime().optional(),
  observacao: z.string().trim().max(1000).optional().nullable(),
});
const supplyInput = z.object({
  nome: z.string().trim().min(1).max(255),
  unidade: z.string().trim().min(1).max(64),
  custoUnitarioCentavos: z.number().int().nonnegative(),
  observacao: z.string().trim().max(1000).optional().nullable(),
});
const supplyConsumptionInput = z.object({
  supplyId: z.number().int().positive(),
  periodicidade: z.enum(["diaria", "semanal", "por_placas"]),
  quantidade: z.number().positive().max(100000000),
  custoUnitarioCentavos: z.number().int().nonnegative(),
  placasProduzidas: z.number().int().nonnegative().optional().nullable(),
  referenciaEm: z.string().datetime().optional(),
  observacao: z.string().trim().max(1000).optional().nullable(),
});
const customerLocationInput = z.object({
  nome: z.string().trim().min(1).max(255),
  cep: z.string().trim().max(9).optional().nullable(),
  cidade: z.string().trim().max(255).optional().nullable(),
  uf: z.string().trim().max(2).optional().nullable(),
});
const locationLookupInput = z.object({
  cep: z.string().trim().max(9).optional().nullable(),
  cidade: z.string().trim().max(255).optional().nullable(),
  uf: z.string().trim().max(2).optional().nullable(),
});
const masterUnitInput = z.object({
  codigo: z.string().trim().min(1).max(32).regex(/^[A-Za-z0-9._-]+$/),
  nome: z.string().trim().min(1).max(64),
  casasDecimais: z.number().int().min(0).max(6).default(0),
});
const masterCategoryInput = z.object({
  nome: z.string().trim().min(1).max(128),
});
const catalogItemInput = z.object({
  codigo: z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9._-]+$/),
  nome: z.string().trim().min(1).max(255),
  tipo: z.enum(["produto_acabado", "intermediario", "em_processo", "materia_prima", "insumo", "componente", "embalagem"]),
  unidadeId: z.number().int().positive(),
  categoriaId: z.number().int().positive().optional().nullable(),
  tipoPlacaLegado: z.string().trim().max(255).optional().nullable(),
});
const storageLocationInput = z.object({
  nome: z.string().trim().min(1).max(128),
  tipo: z.enum(["deposito", "setor", "localizacao"]),
});
const formulaComponentInput = z.object({
  componenteId: z.number().int().positive(),
  quantidade: z.number().positive().max(100000000),
  perdaPercentual: z.number().min(0).max(100).default(0),
  observacao: z.string().trim().max(1000).optional().nullable(),
});
const formulaInput = z.object({
  produtoId: z.number().int().positive(),
  rendimento: z.number().positive().max(100000000),
  perdaPercentual: z.number().min(0).max(100).default(0),
  vigenteDesde: z.string().datetime().optional(),
  observacao: z.string().trim().max(1000).optional().nullable(),
  status: z.enum(["rascunho", "ativa"]).default("rascunho"),
  componentes: z.array(formulaComponentInput).min(1).max(100),
});
const productionOrderInput = z.object({
  codigo: z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9._-]+$/),
  produtoId: z.number().int().positive(),
  formulaId: z.number().int().positive().optional().nullable(),
  quantidadePlanejada: z.number().positive().max(100000000),
  prioridade: z.number().int().min(1).max(5).default(3),
  setorId: z.number().int().positive().optional().nullable(),
  responsavel: z.string().trim().max(255).optional().nullable(),
  planejadaPara: z.string().datetime().optional().nullable(),
  prazoEm: z.string().datetime().optional().nullable(),
  observacao: z.string().trim().max(2000).optional().nullable(),
  eventKey: z.string().trim().min(8).max(128),
});
const productionOrderTransitionInput = z.object({
  id: z.number().int().positive(),
  evento: z.enum(["planejada", "iniciada", "pausada", "retomada", "produzida", "aprovada", "rejeitada", "concluida", "cancelada"]),
  quantidade: z.number().positive().optional().nullable(),
  chaveIdempotencia: z.string().trim().min(8).max(128),
  observacao: z.string().trim().max(2000).optional().nullable(),
});
const supplierInput = z.object({
  codigo: z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9._-]+$/),
  nome: z.string().trim().min(1).max(255),
  documento: z.string().trim().max(32).optional().nullable(),
  contato: z.string().trim().max(255).optional().nullable(),
});
const purchaseOrderInput = z.object({
  codigo: z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9._-]+$/),
  supplierId: z.number().int().positive(),
  observacao: z.string().trim().max(2000).optional().nullable(),
  itens: z.array(z.object({ itemId: z.number().int().positive(), quantidadeSolicitada: z.number().int().positive(), custoUnitarioCentavos: z.number().int().nonnegative() })).min(1).max(100),
});
const purchaseReceiptInput = z.object({
  purchaseOrderId: z.number().int().positive(),
  itemId: z.number().int().positive(),
  quantidadeRecebida: z.number().int().positive(),
  chaveIdempotencia: z.string().trim().min(8).max(128),
  observacao: z.string().trim().max(2000).optional().nullable(),
});
const qualityInspectionInput = z.object({
  productionOrderId: z.number().int().positive().optional().nullable(),
  purchaseReceiptId: z.number().int().positive().optional().nullable(),
  itemId: z.number().int().positive(),
  criterio: z.string().trim().min(1).max(2000),
  quantidadeAmostra: z.number().positive().optional().nullable(),
});
const nonConformityInput = z.object({
  inspectionId: z.number().int().positive(),
  codigo: z.string().trim().min(1).max(64),
  causa: z.string().trim().max(2000).optional().nullable(),
  acaoCorretiva: z.string().trim().max(2000).optional().nullable(),
});

function rethrowStockMutationError(error: unknown): never {
  if (error instanceof db.StockMovementConflictError) {
    throw new TRPCError({ code: "CONFLICT", message: error.message });
  }
  if (error instanceof db.StockBalanceError) {
    throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
  }
  throw error;
}

function rethrowMasterDataError(error: unknown): never {
  if (db.isDuplicateKeyError(error)) {
    throw new TRPCError({ code: "CONFLICT", message: "Já existe um cadastro com o mesmo identificador neste usuário." });
  }
  throw error;
}

function rethrowFormulaError(error: unknown): never {
  if (db.isDuplicateKeyError(error)) {
    throw new TRPCError({ code: "CONFLICT", message: "A versão ou componente já existe nesta ficha técnica." });
  }
  throw error;
}

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

  costs: router({
    getOverview: protectedProcedure.query(async ({ ctx }) => {
      const [production, prices, supplies, consumptions] = await Promise.all([
        db.getProductionDataByUser(ctx.user.id),
        db.getProductPricesByUser(ctx.user.id),
        db.getSuppliesByUser(ctx.user.id),
        db.getSupplyConsumptionsByUser(ctx.user.id),
      ]);
      return {
        prices,
        supplies,
        consumptions,
        analysis: analisarCustos(production, prices, consumptions, supplies),
      };
    }),

    createPrice: protectedProcedure
      .input(productPriceInput)
      .mutation(async ({ ctx, input }) => {
        const id = await db.insertProductPrice({
          userId: ctx.user.id,
          tipoPlaca: input.tipoPlaca,
          custoCompraCentavos: input.custoCompraCentavos,
          precoVendaCentavos: input.precoVendaCentavos,
          vigenteDesde: input.vigenteDesde ? new Date(input.vigenteDesde) : new Date(),
          observacao: input.observacao ?? null,
        });
        return { success: true, id };
      }),

    createSupply: protectedProcedure
      .input(supplyInput)
      .mutation(async ({ ctx, input }) => {
        const id = await db.insertSupply({
          userId: ctx.user.id,
          nome: input.nome,
          unidade: input.unidade,
          custoUnitarioCentavos: input.custoUnitarioCentavos,
          observacao: input.observacao ?? null,
          ativo: true,
        });
        return { success: true, id };
      }),

    updateSupply: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), ativo: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        await db.updateSupply(input.id, ctx.user.id, { ativo: input.ativo });
        return { success: true };
      }),

    createConsumption: protectedProcedure
      .input(supplyConsumptionInput)
      .mutation(async ({ ctx, input }) => {
        const supplies = await db.getSuppliesByUser(ctx.user.id);
        const supply = supplies.find(item => item.id === input.supplyId);
        if (!supply) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Insumo não encontrado." });
        }
        const id = await db.insertSupplyConsumption({
          userId: ctx.user.id,
          supplyId: supply.id,
          periodicidade: input.periodicidade,
          quantidade: String(input.quantidade),
          custoUnitarioCentavos: input.custoUnitarioCentavos,
          placasProduzidas: input.placasProduzidas ?? null,
          referenciaEm: input.referenciaEm ? new Date(input.referenciaEm) : new Date(),
          observacao: input.observacao ?? null,
        });
        return { success: true, id };
      }),

    deleteConsumption: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteSupplyConsumption(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  customers: router({
    getOverview: protectedProcedure.query(async ({ ctx }) => {
      const locations = await db.getCustomerLocationsByUser(ctx.user.id);
      return { locations, summary: summarizeCustomerLocations(locations) };
    }),

    lookupLocation: protectedProcedure
      .input(locationLookupInput)
      .mutation(async ({ input }) => lookupCustomerLocation({ cep: input.cep ?? undefined, cidade: input.cidade ?? undefined, uf: input.uf ?? undefined })),

    create: protectedProcedure
      .input(customerLocationInput)
      .mutation(async ({ ctx, input }) => {
        const location = await lookupCustomerLocation({ cep: input.cep ?? undefined, cidade: input.cidade ?? undefined, uf: input.uf ?? undefined });
        const id = await db.insertCustomerLocation({
          userId: ctx.user.id,
          nome: input.nome,
          cep: location.cep,
          cidade: location.cidade,
          uf: location.uf,
          estado: location.estado,
          codigoIbge: location.codigoIbge,
          fonteLocalizacao: location.fonteLocalizacao,
        });
        return { success: true, id, location };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteCustomerLocation(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  masterData: router({
    overview: protectedProcedure.query(({ ctx }) => db.getMasterDataByUser(ctx.user.id)),

    createUnit: protectedProcedure
      .input(masterUnitInput)
      .mutation(async ({ ctx, input }) => {
        try {
          const id = await db.insertMasterUnit({ userId: ctx.user.id, ...input, ativo: true });
          return { success: true, id };
        } catch (error) {
          return rethrowMasterDataError(error);
        }
      }),

    setUnitActive: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), ativo: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        await db.updateMasterUnit(input.id, ctx.user.id, { ativo: input.ativo });
        return { success: true };
      }),

    createCategory: protectedProcedure
      .input(masterCategoryInput)
      .mutation(async ({ ctx, input }) => {
        try {
          const id = await db.insertMasterCategory({ userId: ctx.user.id, ...input, ativo: true });
          return { success: true, id };
        } catch (error) {
          return rethrowMasterDataError(error);
        }
      }),

    setCategoryActive: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), ativo: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        await db.updateMasterCategory(input.id, ctx.user.id, { ativo: input.ativo });
        return { success: true };
      }),

    createItem: protectedProcedure
      .input(catalogItemInput)
      .mutation(async ({ ctx, input }) => {
        const masterData = await db.getMasterDataByUser(ctx.user.id);
        const unit = masterData.units.find(item => item.id === input.unidadeId && item.ativo);
        const category = input.categoriaId === null || input.categoriaId === undefined
          ? undefined
          : masterData.categories.find(item => item.id === input.categoriaId && item.ativo);
        if (!unit) throw new TRPCError({ code: "BAD_REQUEST", message: "Unidade de medida não encontrada ou inativa." });
        if (input.categoriaId && !category) throw new TRPCError({ code: "BAD_REQUEST", message: "Categoria não encontrada ou inativa." });
        try {
          const id = await db.insertCatalogItem({
            userId: ctx.user.id,
            ...input,
            categoriaId: input.categoriaId ?? null,
            tipoPlacaLegado: input.tipoPlacaLegado ?? null,
            ativo: true,
          });
          return { success: true, id };
        } catch (error) {
          return rethrowMasterDataError(error);
        }
      }),

    setItemActive: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), ativo: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        await db.updateCatalogItem(input.id, ctx.user.id, { ativo: input.ativo });
        return { success: true };
      }),

    createLocation: protectedProcedure
      .input(storageLocationInput)
      .mutation(async ({ ctx, input }) => {
        try {
          const id = await db.insertStorageLocation({ userId: ctx.user.id, ...input, ativo: true });
          return { success: true, id };
        } catch (error) {
          return rethrowMasterDataError(error);
        }
      }),

    setLocationActive: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), ativo: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        await db.updateStorageLocation(input.id, ctx.user.id, { ativo: input.ativo });
        return { success: true };
    }),
  }),

  formulas: router({
    list: protectedProcedure.query(({ ctx }) => db.getProductFormulasByUser(ctx.user.id)),

    calculateTheoretical: protectedProcedure
      .input(z.object({ formulaId: z.number().int().positive(), quantidadeProduzir: z.number().positive().max(100000000) }))
      .query(async ({ ctx, input }) => {
        const formulas = await db.getProductFormulasByUser(ctx.user.id);
        const formula = formulas.find(value => value.id === input.formulaId);
        if (!formula) throw new TRPCError({ code: "NOT_FOUND", message: "Ficha técnica não encontrada." });
        return {
          formulaId: formula.id,
          versao: formula.versao,
          produtoId: formula.produtoId,
          quantidadeProduzir: input.quantidadeProduzir,
          componentes: calcularConsumoTeorico({
            rendimento: Number(formula.rendimento),
            perdaPercentual: Number(formula.perdaPercentual),
            componentes: formula.componentes.map(component => ({
              componenteId: component.componenteId,
              quantidade: Number(component.quantidade),
              perdaPercentual: Number(component.perdaPercentual),
            })),
          }, input.quantidadeProduzir),
        };
      }),

    create: protectedProcedure
      .input(formulaInput)
      .mutation(async ({ ctx, input }) => {
        const masterData = await db.getMasterDataByUser(ctx.user.id);
        const product = masterData.items.find(item => item.id === input.produtoId && item.ativo);
        if (!product) throw new TRPCError({ code: "BAD_REQUEST", message: "Produto ativo não encontrado para a ficha técnica." });
        const componentIds = input.componentes.map(component => component.componenteId);
        if (new Set(componentIds).size !== componentIds.length) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cada componente deve aparecer apenas uma vez na ficha técnica." });
        }
        const invalidComponent = input.componentes.some(component => {
          const item = masterData.items.find(value => value.id === component.componenteId);
          return !item || !item.ativo || item.id === product.id;
        });
        if (invalidComponent) throw new TRPCError({ code: "BAD_REQUEST", message: "Todos os componentes devem ser itens ativos e diferentes do produto." });
        try {
          const result = await db.insertProductFormula(
            ctx.user.id,
            {
              produtoId: input.produtoId,
              status: input.status,
              rendimento: String(input.rendimento),
              perdaPercentual: String(input.perdaPercentual),
              vigenteDesde: input.vigenteDesde ? new Date(input.vigenteDesde) : new Date(),
              observacao: input.observacao ?? null,
            },
            input.componentes.map(component => ({
              componenteId: component.componenteId,
              quantidade: String(component.quantidade),
              perdaPercentual: String(component.perdaPercentual),
              observacao: component.observacao ?? null,
            })),
          );
          return { success: true, ...result };
        } catch (error) {
          return rethrowFormulaError(error);
        }
      }),

    setStatus: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), status: z.enum(["rascunho", "ativa", "inativa"]) }))
      .mutation(async ({ ctx, input }) => {
        const updated = await db.setProductFormulaStatus(input.id, ctx.user.id, input.status);
        if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Ficha técnica não encontrada." });
        return { success: true };
      }),
  }),

  productionOrders: router({
    list: protectedProcedure.query(({ ctx }) => db.getProductionOrdersByUser(ctx.user.id)),

    create: protectedProcedure.input(productionOrderInput).mutation(async ({ ctx, input }) => {
      const masterData = await db.getMasterDataByUser(ctx.user.id);
      const product = masterData.items.find(item => item.id === input.produtoId && item.ativo);
      if (!product) throw new TRPCError({ code: "BAD_REQUEST", message: "Produto ativo não encontrado." });
      if (input.setorId && !masterData.locations.some(location => location.id === input.setorId && location.ativo && location.tipo === "setor")) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Setor ativo não encontrado." });
      }
      const formulas = await db.getProductFormulasByUser(ctx.user.id);
      const formula = input.formulaId ? formulas.find(value => value.id === input.formulaId && value.produtoId === product.id && value.status === "ativa") : undefined;
      if (input.formulaId && !formula) throw new TRPCError({ code: "BAD_REQUEST", message: "A ficha técnica deve estar ativa e pertencer ao produto." });
      const formulaSnapshot = formula ? JSON.stringify({ id: formula.id, versao: formula.versao, produtoId: formula.produtoId, rendimento: formula.rendimento, perdaPercentual: formula.perdaPercentual, componentes: formula.componentes }) : null;
      try {
        const id = await db.createProductionOrder(ctx.user.id, {
          codigo: input.codigo,
          produtoId: input.produtoId,
          formulaId: input.formulaId ?? null,
          formulaSnapshot,
          status: "rascunho",
          quantidadePlanejada: String(input.quantidadePlanejada),
          prioridade: input.prioridade,
          setorId: input.setorId ?? null,
          responsavel: input.responsavel ?? null,
          planejadaPara: input.planejadaPara ? new Date(input.planejadaPara) : null,
          prazoEm: input.prazoEm ? new Date(input.prazoEm) : null,
          observacao: input.observacao ?? null,
        }, input.eventKey);
        return { success: true, id };
      } catch (error) {
        return rethrowMasterDataError(error);
      }
    }),

    transition: protectedProcedure.input(productionOrderTransitionInput).mutation(async ({ ctx, input }) => {
      const quantityRequired = ["iniciada", "produzida", "aprovada", "rejeitada"].includes(input.evento);
      if (quantityRequired && (!input.quantidade || input.quantidade <= 0)) throw new TRPCError({ code: "BAD_REQUEST", message: "Informe uma quantidade positiva para este evento." });
      const result = await db.transitionProductionOrder(input.id, ctx.user.id, {
        evento: input.evento,
        quantidade: input.quantidade ? String(input.quantidade) : null,
        chaveIdempotencia: input.chaveIdempotencia,
        observacao: input.observacao ?? null,
      });
      if (!result.found) throw new TRPCError({ code: "NOT_FOUND", message: "Ordem de produção não encontrada." });
      return { success: true, duplicate: result.duplicate };
    }),
  }),

  purchasing: router({
    overview: protectedProcedure.query(({ ctx }) => db.getPurchasingDataByUser(ctx.user.id)),
    createSupplier: protectedProcedure.input(supplierInput).mutation(async ({ ctx, input }) => {
      try {
        const id = await db.insertSupplier({ userId: ctx.user.id, codigo: input.codigo, nome: input.nome, documento: input.documento ?? null, contato: input.contato ?? null, ativo: true });
        return { success: true, id };
      } catch (error) { return rethrowMasterDataError(error); }
    }),
    createOrder: protectedProcedure.input(purchaseOrderInput).mutation(async ({ ctx, input }) => {
      const master = await db.getMasterDataByUser(ctx.user.id);
      const overview = await db.getPurchasingDataByUser(ctx.user.id);
      if (!overview.suppliers.some(supplier => supplier.id === input.supplierId && supplier.ativo)) throw new TRPCError({ code: "BAD_REQUEST", message: "Fornecedor ativo não encontrado." });
      if (input.itens.some(line => !master.items.some(item => item.id === line.itemId && item.ativo))) throw new TRPCError({ code: "BAD_REQUEST", message: "Todos os itens devem estar ativos no catálogo." });
      try {
        const id = await db.createPurchaseOrder(ctx.user.id, { codigo: input.codigo, supplierId: input.supplierId, status: "rascunho", observacao: input.observacao ?? null }, input.itens.map(line => ({ itemId: line.itemId, quantidadeSolicitada: String(line.quantidadeSolicitada), quantidadeRecebida: "0", custoUnitarioCentavos: line.custoUnitarioCentavos })));
        return { success: true, id };
      } catch (error) { return rethrowMasterDataError(error); }
    }),
    setOrderStatus: protectedProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["solicitado", "aprovado", "cancelado"]) })).mutation(async ({ ctx, input }) => { await db.setPurchaseOrderStatus(input.id, ctx.user.id, input.status); return { success: true }; }),
    receive: protectedProcedure.input(purchaseReceiptInput).mutation(async ({ ctx, input }) => {
      try { return { success: true, ...(await db.confirmPurchaseReceipt(ctx.user.id, { ...input, observacao: input.observacao ?? null })) }; }
      catch (error) { if (error instanceof Error) throw new TRPCError({ code: "BAD_REQUEST", message: error.message }); throw error; }
    }),
  }),

  quality: router({
    overview: protectedProcedure.query(({ ctx }) => db.listQualityByUser(ctx.user.id)),
    createInspection: protectedProcedure.input(qualityInspectionInput).mutation(async ({ ctx, input }) => {
      const master = await db.getMasterDataByUser(ctx.user.id);
      if (!master.items.some(item => item.id === input.itemId && item.ativo)) throw new TRPCError({ code: "BAD_REQUEST", message: "Item ativo não encontrado." });
      const id = await db.createQualityInspection({ userId: ctx.user.id, productionOrderId: input.productionOrderId ?? null, purchaseReceiptId: input.purchaseReceiptId ?? null, itemId: input.itemId, status: "aberta", criterio: input.criterio, resultado: null, quantidadeAmostra: input.quantidadeAmostra ? String(input.quantidadeAmostra) : null });
      await db.createAuditEvent({ userId: ctx.user.id, acao: "create", entidade: "quality_inspection", entidadeId: id, dados: JSON.stringify({ itemId: input.itemId }) });
      return { success: true, id };
    }),
    reviewInspection: protectedProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["aberta", "aprovada", "reprovada", "bloqueada"]), resultado: z.string().trim().max(2000).optional().nullable() })).mutation(async ({ ctx, input }) => { await db.updateQualityInspection(input.id, ctx.user.id, input.status, input.resultado ?? null); await db.createAuditEvent({ userId: ctx.user.id, acao: "review", entidade: "quality_inspection", entidadeId: input.id, dados: JSON.stringify(input) }); return { success: true }; }),
    createNonConformity: protectedProcedure.input(nonConformityInput).mutation(async ({ ctx, input }) => { const id = await db.createNonConformity({ userId: ctx.user.id, inspectionId: input.inspectionId, codigo: input.codigo, causa: input.causa ?? null, acaoCorretiva: input.acaoCorretiva ?? null, status: "aberta" }); await db.createAuditEvent({ userId: ctx.user.id, acao: "create", entidade: "quality_non_conformity", entidadeId: id, dados: JSON.stringify({ inspectionId: input.inspectionId }) }); return { success: true, id }; }),
  }),

  audit: router({
    mine: protectedProcedure.query(({ ctx }) => db.listQualityByUser(ctx.user.id).then(result => result.audit)),
    admin: protectedProcedure.query(({ ctx }) => { if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem consultar a auditoria global." }); return db.listQualityByUser(ctx.user.id).then(result => result.audit); }),
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

    listStockAudit: protectedProcedure.query(({ ctx }) =>
      db.getStockMovementAuditByUser(ctx.user.id)
    ),

    createStockMovement: protectedProcedure
      .input(stockMovementInput)
      .mutation(async ({ ctx, input }) => {
        try {
          const id = await db.insertStockMovement({
            userId: ctx.user.id,
            tipoPlaca: input.tipoPlaca,
            movimento: input.movimento,
            quantidade: input.quantidade,
            observacao: input.observacao ?? null,
            ocorridoEm: input.ocorridoEm ? new Date(input.ocorridoEm) : new Date(),
          });
          return { success: true, id };
        } catch (error) {
          return rethrowStockMutationError(error);
        }
      }),

    updateStockMovement: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
        version: z.number().int().positive(),
        data: stockMovementInput,
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          await db.updateStockMovement(input.id, ctx.user.id, input.version, {
            tipoPlaca: input.data.tipoPlaca,
            movimento: input.data.movimento,
            quantidade: input.data.quantidade,
            observacao: input.data.observacao ?? null,
            ocorridoEm: input.data.ocorridoEm ? new Date(input.data.ocorridoEm) : new Date(),
          });
          return { success: true };
        } catch (error) {
          return rethrowStockMutationError(error);
        }
      }),

    deleteStockMovement: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
        version: z.number().int().positive(),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          await db.deleteStockMovement(input.id, ctx.user.id, input.version);
          return { success: true };
        } catch (error) {
          return rethrowStockMutationError(error);
        }
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
        const claim = await db.claimProductionUpload({
          userId: ctx.user.id,
          fileName: input.fileName,
          fileHash,
          status: "processing",
          rowsExtracted: 0,
        });
        if (claim.duplicate) {
          return {
            success: true,
            duplicate: true,
            uploadId: claim.uploadId,
            registrosInseridos: claim.registrosInseridos,
          };
        }

        const safeFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const fileKey = `${ctx.user.id}/production-pdfs/${fileHash}-${safeFileName}`;
        const uploadId = claim.uploadId;

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
          await db.completeProductionUpload(
            uploadId,
            ctx.user.id,
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
            })),
            {
              rowsExtracted: extracted.length,
              rowsRejected: extraction.linhasRejeitadas,
              duplicatesAvoided: extraction.duplicadosEvitados,
            },
          );
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
