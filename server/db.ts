import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertProductionData,
  InsertProductionUpload,
  InsertUser,
  User,
  productionData,
  productionUploads,
  stockMovements,
  stockMovementAudit,
  InsertStockMovement,
  productPrices,
  supplies,
  supplyConsumptions,
  customerLocations,
  masterUnits,
  masterCategories,
  catalogItems,
  storageLocations,
  productFormulas,
  formulaComponents,
  productionOrders,
  productionOrderEvents,
  suppliers,
  purchaseOrders,
  purchaseOrderItems,
  purchaseReceipts,
  qualityInspections,
  qualityNonConformities,
  auditEvents,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { movimentoParaDelta } from "./stock";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;

  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

/** Shared operational identity used only by the signed desktop client mode. */
export async function getOrCreateDesktopUser(): Promise<User | undefined> {
  const openId = "desktop-local-operacao";
  const existing = await getUserByOpenId(openId);
  if (existing) return existing;

  await upsertUser({
    openId,
    name: "Operação Fotoporcelana",
    email: "operacao-local@fotoporcelana.invalid",
    loginMethod: "desktop",
    role: "admin",
  });

  return getUserByOpenId(openId);
}

export async function getProductionDataByUser(userId: number, months?: string[]) {
  const db = await getDb();
  if (!db) return [];
  const userFilter = eq(productionData.userId, userId);
  const where = months && months.length > 0
    ? and(userFilter, inArray(productionData.mes, months))
    : userFilter;
  return db.select().from(productionData).where(where).orderBy(desc(productionData.createdAt));
}

export async function getProductionUploadsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(productionUploads)
    .where(eq(productionUploads.userId, userId))
    .orderBy(desc(productionUploads.createdAt));
}

export async function getProductionUploadByHash(userId: number, fileHash: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(productionUploads)
    .where(and(eq(productionUploads.userId, userId), eq(productionUploads.fileHash, fileHash)))
    .limit(1);
  return result[0];
}

export function isDuplicateKeyError(error: unknown) {
  const candidate = error as { code?: unknown; errno?: unknown };
  return candidate.code === "ER_DUP_ENTRY" || candidate.errno === 1062;
}

/**
 * Claims a production upload using the database uniqueness constraint.
 * Application-level lookup alone is not enough because two devices can race.
 */
export async function claimProductionUpload(data: InsertProductionUpload) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const result = await db.insert(productionUploads).values(data);
    return {
      duplicate: false as const,
      uploadId: Number((result as any)[0]?.insertId ?? 0),
      reprocessed: false as const,
    };
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;

    const claim = await db.transaction(async tx => {
      const existingResult = await tx.select().from(productionUploads)
        .where(and(eq(productionUploads.userId, data.userId), eq(productionUploads.fileHash, data.fileHash)))
        .limit(1);
      const existing = existingResult[0];
      if (!existing) return { kind: "missing" as const };

      if (existing.status !== "failed") {
        return {
          kind: "duplicate" as const,
          uploadId: existing.id,
          rowsExtracted: existing.rowsExtracted,
        };
      }

      const reset = await tx.update(productionUploads)
        .set({
          fileName: data.fileName,
          status: "processing",
          rowsExtracted: 0,
          rowsRejected: 0,
          duplicatesAvoided: 0,
          errorMessage: null,
        })
        .where(and(
          eq(productionUploads.id, existing.id),
          eq(productionUploads.userId, data.userId),
          eq(productionUploads.status, "failed"),
        ));
      const affectedRows = Number((reset as any)[0]?.affectedRows ?? (reset as any).affectedRows ?? 0);
      if (affectedRows !== 1) return { kind: "raced" as const };

      await tx.delete(productionData).where(and(
        eq(productionData.uploadId, existing.id),
        eq(productionData.userId, data.userId),
      ));
      return { kind: "claimed" as const, uploadId: existing.id };
    });

    if (claim.kind === "duplicate") {
      return {
        duplicate: true as const,
        uploadId: claim.uploadId,
        registrosInseridos: claim.rowsExtracted,
      };
    }
    if (claim.kind === "claimed") {
      return {
        duplicate: false as const,
        uploadId: claim.uploadId,
        reprocessed: true as const,
      };
    }

    const current = await getProductionUploadByHash(data.userId, data.fileHash);
    if (current && current.status !== "failed") {
      return {
        duplicate: true as const,
        uploadId: current.id,
        registrosInseridos: current.rowsExtracted,
      };
    }
    throw error;
  }
}

export async function insertProductionUpload(data: InsertProductionUpload) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(productionUploads).values(data);
  return Number((result as any)[0]?.insertId ?? 0);
}

export async function updateProductionUpload(
  id: number,
  userId: number,
  data: Partial<Pick<InsertProductionUpload, "status" | "rowsExtracted" | "rowsRejected" | "duplicatesAvoided" | "errorMessage" | "fileUrl">>,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(productionUploads).set(data)
    .where(and(eq(productionUploads.id, id), eq(productionUploads.userId, userId)));
}

export async function insertProductionData(data: InsertProductionData) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(productionData).values(data);
  return Number((result as any)[0]?.insertId ?? 0);
}

export async function updateProductionData(
  id: number,
  userId: number,
  data: Partial<Pick<InsertProductionData, "romaneio" | "cliente" | "tipoPlaca" | "quantidade" | "mes" | "ano">>,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(productionData).set(data)
    .where(and(eq(productionData.id, id), eq(productionData.userId, userId)));
}

export async function deleteProductionData(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(productionData)
    .where(and(eq(productionData.id, id), eq(productionData.userId, userId)));
}

export async function deleteProductionUpload(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(productionUploads)
    .where(and(eq(productionUploads.id, id), eq(productionUploads.userId, userId)));
}

export async function countProductionDataByUpload(uploadId: number, userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ id: productionData.id }).from(productionData)
    .where(and(eq(productionData.uploadId, uploadId), eq(productionData.userId, userId)));
  return result.length;
}

export async function deleteProductionDataByUpload(uploadId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(productionData)
    .where(and(eq(productionData.uploadId, uploadId), eq(productionData.userId, userId)));
}

export async function deleteProductionUploadCascade(uploadId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async tx => {
    await tx.delete(productionData).where(and(eq(productionData.uploadId, uploadId), eq(productionData.userId, userId)));
    return tx.delete(productionUploads).where(and(eq(productionUploads.id, uploadId), eq(productionUploads.userId, userId)));
  });
}

export async function getProductPricesByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(productPrices)
    .where(eq(productPrices.userId, userId))
    .orderBy(desc(productPrices.vigenteDesde), desc(productPrices.id));
}

export async function insertProductPrice(data: typeof productPrices.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(productPrices).values(data);
  return Number((result as any)[0]?.insertId ?? 0);
}

export async function deleteProductPrice(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(productPrices).where(and(eq(productPrices.id, id), eq(productPrices.userId, userId)));
}

export async function getSuppliesByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(supplies)
    .where(eq(supplies.userId, userId))
    .orderBy(desc(supplies.ativo), supplies.nome);
}

export async function insertSupply(data: typeof supplies.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(supplies).values(data);
  return Number((result as any)[0]?.insertId ?? 0);
}

export async function updateSupply(id: number, userId: number, data: Partial<Pick<typeof supplies.$inferInsert, "nome" | "unidade" | "custoUnitarioCentavos" | "ativo" | "observacao">>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(supplies).set(data)
    .where(and(eq(supplies.id, id), eq(supplies.userId, userId)));
}

export async function deleteSupply(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async tx => {
    await tx.delete(supplyConsumptions).where(and(eq(supplyConsumptions.supplyId, id), eq(supplyConsumptions.userId, userId)));
    return tx.delete(supplies).where(and(eq(supplies.id, id), eq(supplies.userId, userId)));
  });
}

export async function getSupplyConsumptionsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: supplyConsumptions.id,
    userId: supplyConsumptions.userId,
    supplyId: supplyConsumptions.supplyId,
    periodicidade: supplyConsumptions.periodicidade,
    quantidade: supplyConsumptions.quantidade,
    custoUnitarioCentavos: supplyConsumptions.custoUnitarioCentavos,
    placasProduzidas: supplyConsumptions.placasProduzidas,
    referenciaEm: supplyConsumptions.referenciaEm,
    observacao: supplyConsumptions.observacao,
    createdAt: supplyConsumptions.createdAt,
    supplyNome: supplies.nome,
    supplyUnidade: supplies.unidade,
  }).from(supplyConsumptions)
    .innerJoin(supplies, eq(supplyConsumptions.supplyId, supplies.id))
    .where(eq(supplyConsumptions.userId, userId))
    .orderBy(desc(supplyConsumptions.referenciaEm), desc(supplyConsumptions.id));
}

export async function insertSupplyConsumption(data: typeof supplyConsumptions.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(supplyConsumptions).values(data);
  return Number((result as any)[0]?.insertId ?? 0);
}

export async function deleteSupplyConsumption(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(supplyConsumptions)
    .where(and(eq(supplyConsumptions.id, id), eq(supplyConsumptions.userId, userId)));
}

export async function getCustomerLocationsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(customerLocations)
    .where(eq(customerLocations.userId, userId))
    .orderBy(customerLocations.estado, customerLocations.cidade, customerLocations.nome);
}

export async function insertCustomerLocation(data: typeof customerLocations.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(customerLocations).values(data);
  return Number((result as any)[0]?.insertId ?? 0);
}

export async function upsertCustomerLocationFromPdf(data: {
  userId: number;
  nome: string;
  cep: string | null;
  endereco: string | null;
  cidade: string;
  uf: string;
  estado: string;
  codigoIbge: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(customerLocations)
    .where(and(eq(customerLocations.userId, data.userId), eq(customerLocations.nome, data.nome)))
    .limit(1);
  const payload = {
    cep: data.cep,
    endereco: data.endereco,
    cidade: data.cidade,
    uf: data.uf,
    estado: data.estado,
    codigoIbge: data.codigoIbge,
    fonteLocalizacao: data.cep ? "cep" as const : "cidade_uf" as const,
  };
  if (existing[0]) {
    await db.update(customerLocations).set(payload)
      .where(and(eq(customerLocations.id, existing[0].id), eq(customerLocations.userId, data.userId)));
    return { id: existing[0].id, action: "updated" as const };
  }
  const result = await db.insert(customerLocations).values({ ...data, ...payload });
  return { id: Number((result as any)[0]?.insertId ?? 0), action: "created" as const };
}

export async function deleteCustomerLocation(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(customerLocations)
    .where(and(eq(customerLocations.id, id), eq(customerLocations.userId, userId)));
}

export async function getMasterDataByUser(userId: number) {
  const db = await getDb();
  if (!db) return { units: [], categories: [], items: [], locations: [] };
  const [units, categories, items, locations] = await Promise.all([
    db.select().from(masterUnits).where(eq(masterUnits.userId, userId)).orderBy(masterUnits.codigo),
    db.select().from(masterCategories).where(eq(masterCategories.userId, userId)).orderBy(masterCategories.nome),
    db.select().from(catalogItems).where(eq(catalogItems.userId, userId)).orderBy(catalogItems.nome),
    db.select().from(storageLocations).where(eq(storageLocations.userId, userId)).orderBy(storageLocations.tipo, storageLocations.nome),
  ]);
  return { units, categories, items, locations };
}

export async function insertMasterUnit(data: typeof masterUnits.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(masterUnits).values(data);
  return Number((result as any)[0]?.insertId ?? 0);
}

export async function updateMasterUnit(id: number, userId: number, data: Partial<Pick<typeof masterUnits.$inferInsert, "codigo" | "nome" | "casasDecimais" | "ativo">>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(masterUnits).set(data).where(and(eq(masterUnits.id, id), eq(masterUnits.userId, userId)));
}

export async function insertMasterCategory(data: typeof masterCategories.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(masterCategories).values(data);
  return Number((result as any)[0]?.insertId ?? 0);
}

export async function updateMasterCategory(id: number, userId: number, data: Partial<Pick<typeof masterCategories.$inferInsert, "nome" | "ativo">>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(masterCategories).set(data).where(and(eq(masterCategories.id, id), eq(masterCategories.userId, userId)));
}

export async function insertCatalogItem(data: typeof catalogItems.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(catalogItems).values(data);
  return Number((result as any)[0]?.insertId ?? 0);
}

export async function updateCatalogItem(id: number, userId: number, data: Partial<Pick<typeof catalogItems.$inferInsert, "codigo" | "nome" | "tipo" | "unidadeId" | "categoriaId" | "tipoPlacaLegado" | "ativo">>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(catalogItems).set(data).where(and(eq(catalogItems.id, id), eq(catalogItems.userId, userId)));
}

export async function insertStorageLocation(data: typeof storageLocations.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(storageLocations).values(data);
  return Number((result as any)[0]?.insertId ?? 0);
}

export async function updateStorageLocation(id: number, userId: number, data: Partial<Pick<typeof storageLocations.$inferInsert, "nome" | "tipo" | "ativo">>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(storageLocations).set(data).where(and(eq(storageLocations.id, id), eq(storageLocations.userId, userId)));
}

export async function getProductFormulasByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const [formulas, components, items] = await Promise.all([
    db.select().from(productFormulas).where(eq(productFormulas.userId, userId)).orderBy(desc(productFormulas.createdAt), desc(productFormulas.versao)),
    db.select().from(formulaComponents).where(eq(formulaComponents.userId, userId)).orderBy(formulaComponents.id),
    db.select().from(catalogItems).where(eq(catalogItems.userId, userId)),
  ]);
  const itemById = new Map(items.map(item => [item.id, item]));
  return formulas.map(formula => ({
    ...formula,
    produto: itemById.get(formula.produtoId) ?? null,
    componentes: components
      .filter(component => component.formulaId === formula.id)
      .map(component => ({ ...component, componente: itemById.get(component.componenteId) ?? null })),
  }));
}

export async function insertProductFormula(
  userId: number,
  data: Omit<typeof productFormulas.$inferInsert, "userId" | "versao">,
  components: Array<Omit<typeof formulaComponents.$inferInsert, "userId" | "formulaId">>,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async tx => {
    const latest = await tx.select({ versao: productFormulas.versao })
      .from(productFormulas)
      .where(and(eq(productFormulas.userId, userId), eq(productFormulas.produtoId, data.produtoId)))
      .orderBy(desc(productFormulas.versao))
      .limit(1);
    const versao = Number(latest[0]?.versao ?? 0) + 1;
    if (data.status === "ativa") {
      await tx.update(productFormulas)
        .set({ status: "inativa" })
        .where(and(eq(productFormulas.userId, userId), eq(productFormulas.produtoId, data.produtoId), eq(productFormulas.status, "ativa")));
    }
    const result = await tx.insert(productFormulas).values({ ...data, userId, versao });
    const formulaId = Number((result as any)[0]?.insertId ?? 0);
    if (components.length > 0) {
      await tx.insert(formulaComponents).values(components.map(component => ({ ...component, userId, formulaId })));
    }
    return { id: formulaId, versao };
  });
}

export async function setProductFormulaStatus(id: number, userId: number, status: "rascunho" | "ativa" | "inativa") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async tx => {
    const currentResult = await tx.select().from(productFormulas)
      .where(and(eq(productFormulas.id, id), eq(productFormulas.userId, userId)))
      .limit(1);
    const current = currentResult[0];
    if (!current) return false;
    if (status === "ativa") {
      await tx.update(productFormulas)
        .set({ status: "inativa" })
        .where(and(eq(productFormulas.userId, userId), eq(productFormulas.produtoId, current.produtoId), eq(productFormulas.status, "ativa")));
    }
    await tx.update(productFormulas).set({ status }).where(and(eq(productFormulas.id, id), eq(productFormulas.userId, userId)));
    return true;
  });
}

export async function getProductionOrdersByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const [orders, events, items] = await Promise.all([
    db.select().from(productionOrders).where(eq(productionOrders.userId, userId)).orderBy(desc(productionOrders.createdAt), desc(productionOrders.id)),
    db.select().from(productionOrderEvents).where(eq(productionOrderEvents.userId, userId)).orderBy(desc(productionOrderEvents.ocorridoEm), desc(productionOrderEvents.id)),
    db.select().from(catalogItems).where(eq(catalogItems.userId, userId)),
  ]);
  const itemById = new Map(items.map(item => [item.id, item]));
  return orders.map(order => ({
    ...order,
    produto: itemById.get(order.produtoId) ?? null,
    eventos: events.filter(event => event.orderId === order.id),
  }));
}

export async function createProductionOrder(
  userId: number,
  data: Omit<typeof productionOrders.$inferInsert, "userId">,
  eventKey: string,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async tx => {
    const result = await tx.insert(productionOrders).values({ ...data, userId });
    const orderId = Number((result as any)[0]?.insertId ?? 0);
    await tx.insert(productionOrderEvents).values({ userId, orderId, evento: "criada", chaveIdempotencia: eventKey, observacao: data.observacao ?? null });
    return orderId;
  });
}

export async function transitionProductionOrder(
  id: number,
  userId: number,
  data: Pick<typeof productionOrderEvents.$inferInsert, "evento" | "quantidade" | "chaveIdempotencia" | "observacao">,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async tx => {
    const currentRows = await tx.select().from(productionOrders).where(and(eq(productionOrders.id, id), eq(productionOrders.userId, userId))).limit(1);
    const current = currentRows[0];
    if (!current) return { found: false, duplicate: false };
    const duplicate = await tx.select({ id: productionOrderEvents.id }).from(productionOrderEvents)
      .where(and(eq(productionOrderEvents.userId, userId), eq(productionOrderEvents.chaveIdempotencia, data.chaveIdempotencia))).limit(1);
    if (duplicate.length) return { found: true, duplicate: true };
    const quantity = data.quantidade ? Number(data.quantidade) : 0;
    const changes: Partial<typeof productionOrders.$inferInsert> = {};
    if (data.evento === "planejada") changes.status = "planejada";
    if (data.evento === "iniciada" || data.evento === "retomada") { changes.status = "em_producao"; changes.quantidadeIniciada = String(Number(current.quantidadeIniciada) + quantity); }
    if (data.evento === "pausada") changes.status = "pausada";
    if (data.evento === "produzida") { changes.status = "em_producao"; changes.quantidadeProduzida = String(Number(current.quantidadeProduzida) + quantity); }
    if (data.evento === "aprovada") { changes.quantidadeAprovada = String(Number(current.quantidadeAprovada) + quantity); }
    if (data.evento === "rejeitada") { changes.quantidadeRejeitada = String(Number(current.quantidadeRejeitada) + quantity); }
    if (data.evento === "concluida") changes.status = "concluida";
    if (data.evento === "cancelada") changes.status = "cancelada";
    await tx.insert(productionOrderEvents).values({ userId, orderId: id, ...data, quantidade: data.quantidade ?? null });
    await tx.update(productionOrders).set(changes).where(and(eq(productionOrders.id, id), eq(productionOrders.userId, userId)));
    return { found: true, duplicate: false };
  });
}

export async function getPurchasingDataByUser(userId: number) {
  const db = await getDb();
  if (!db) return { suppliers: [], orders: [] };
  const [supplierRows, orders, orderItems, items] = await Promise.all([
    db.select().from(suppliers).where(eq(suppliers.userId, userId)).orderBy(suppliers.nome),
    db.select().from(purchaseOrders).where(eq(purchaseOrders.userId, userId)).orderBy(desc(purchaseOrders.createdAt)),
    db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.userId, userId)),
    db.select().from(catalogItems).where(eq(catalogItems.userId, userId)),
  ]);
  const supplierById = new Map(supplierRows.map(item => [item.id, item]));
  const itemById = new Map(items.map(item => [item.id, item]));
  return { suppliers: supplierRows, orders: orders.map(order => ({ ...order, fornecedor: supplierById.get(order.supplierId) ?? null, itens: orderItems.filter(item => item.purchaseOrderId === order.id).map(item => ({ ...item, produto: itemById.get(item.itemId) ?? null })) })) };
}

export async function insertSupplier(data: typeof suppliers.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(suppliers).values(data);
  return Number((result as any)[0]?.insertId ?? 0);
}

export async function createPurchaseOrder(userId: number, data: Omit<typeof purchaseOrders.$inferInsert, "userId">, items: Array<Omit<typeof purchaseOrderItems.$inferInsert, "userId" | "purchaseOrderId">>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async tx => {
    const result = await tx.insert(purchaseOrders).values({ ...data, userId });
    const orderId = Number((result as any)[0]?.insertId ?? 0);
    await tx.insert(purchaseOrderItems).values(items.map(item => ({ ...item, userId, purchaseOrderId: orderId })));
    return orderId;
  });
}

export async function setPurchaseOrderStatus(id: number, userId: number, status: "solicitado" | "aprovado" | "cancelado") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(purchaseOrders).set({ status }).where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.userId, userId)));
}

export async function confirmPurchaseReceipt(userId: number, input: { purchaseOrderId: number; itemId: number; quantidadeRecebida: number; chaveIdempotencia: string; observacao: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async tx => {
    const duplicate = await tx.select({ id: purchaseReceipts.id }).from(purchaseReceipts).where(and(eq(purchaseReceipts.userId, userId), eq(purchaseReceipts.chaveIdempotencia, input.chaveIdempotencia))).limit(1);
    if (duplicate.length) return { duplicate: true };
    const rows = await tx.select({ order: purchaseOrders, line: purchaseOrderItems, item: catalogItems }).from(purchaseOrderItems).innerJoin(purchaseOrders, eq(purchaseOrderItems.purchaseOrderId, purchaseOrders.id)).innerJoin(catalogItems, eq(purchaseOrderItems.itemId, catalogItems.id)).where(and(eq(purchaseOrderItems.userId, userId), eq(purchaseOrderItems.purchaseOrderId, input.purchaseOrderId), eq(purchaseOrderItems.itemId, input.itemId))).limit(1);
    const row = rows[0];
    if (!row) throw new Error("Item do pedido não encontrado");
    if (!["aprovado", "parcial", "solicitado"].includes(row.order.status)) throw new Error("O pedido não está disponível para recebimento");
    const next = Number(row.line.quantidadeRecebida) + input.quantidadeRecebida;
    if (next > Number(row.line.quantidadeSolicitada)) throw new Error("O recebimento excede a quantidade solicitada");
    await tx.insert(purchaseReceipts).values({ userId, purchaseOrderId: input.purchaseOrderId, itemId: input.itemId, quantidadeRecebida: String(input.quantidadeRecebida), chaveIdempotencia: input.chaveIdempotencia, observacao: input.observacao });
    await tx.update(purchaseOrderItems).set({ quantidadeRecebida: String(next) }).where(and(eq(purchaseOrderItems.id, row.line.id), eq(purchaseOrderItems.userId, userId)));
    await tx.insert(stockMovements).values({ userId, tipoPlaca: row.item.codigo, movimento: "entrada", quantidade: Math.round(input.quantidadeRecebida), observacao: `Recebimento ${row.order.codigo}${input.observacao ? ` · ${input.observacao}` : ""}` });
    const allLines = await tx.select().from(purchaseOrderItems).where(and(eq(purchaseOrderItems.purchaseOrderId, input.purchaseOrderId), eq(purchaseOrderItems.userId, userId)));
    const complete = allLines.every(line => Number(line.id === row.line.id ? next : line.quantidadeRecebida) >= Number(line.quantidadeSolicitada));
    await tx.update(purchaseOrders).set({ status: complete ? "recebido" : "parcial" }).where(and(eq(purchaseOrders.id, input.purchaseOrderId), eq(purchaseOrders.userId, userId)));
    return { duplicate: false };
  });
}

export async function listQualityByUser(userId: number) {
  const db = await getDb();
  if (!db) return { inspections: [], nonConformities: [], audit: [] };
  const [inspections, nonConformities, audit] = await Promise.all([
    db.select().from(qualityInspections).where(eq(qualityInspections.userId, userId)).orderBy(desc(qualityInspections.inspecionadaEm)),
    db.select().from(qualityNonConformities).where(eq(qualityNonConformities.userId, userId)).orderBy(desc(qualityNonConformities.createdAt)),
    db.select().from(auditEvents).where(eq(auditEvents.userId, userId)).orderBy(desc(auditEvents.ocorridoEm)).limit(200),
  ]);
  return { inspections, nonConformities, audit };
}

export async function createQualityInspection(data: typeof qualityInspections.$inferInsert) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  const result = await db.insert(qualityInspections).values(data); return Number((result as any)[0]?.insertId ?? 0);
}

export async function updateQualityInspection(id: number, userId: number, status: "aberta" | "aprovada" | "reprovada" | "bloqueada", resultado: string | null) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.update(qualityInspections).set({ status, resultado }).where(and(eq(qualityInspections.id, id), eq(qualityInspections.userId, userId)));
}

export async function createNonConformity(data: typeof qualityNonConformities.$inferInsert) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  const result = await db.insert(qualityNonConformities).values(data); return Number((result as any)[0]?.insertId ?? 0);
}

export async function createAuditEvent(data: typeof auditEvents.$inferInsert) {
  const db = await getDb(); if (!db) return;
  await db.insert(auditEvents).values(data);
}

export async function insertManyProductionData(data: InsertProductionData[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.length === 0) return;
  await db.transaction(async (tx) => {
    await tx.insert(productionData).values(data);
  });
}

export async function completeProductionUpload(
  uploadId: number,
  userId: number,
  data: InsertProductionData[],
  summary: Pick<InsertProductionUpload, "rowsExtracted" | "rowsRejected" | "duplicatesAvoided">,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.transaction(async tx => {
    await tx.delete(productionData).where(and(
      eq(productionData.uploadId, uploadId),
      eq(productionData.userId, userId),
    ));
    if (data.length > 0) {
      await tx.insert(productionData).values(data);
    }
    await tx.update(productionUploads)
      .set({
        status: "completed",
        ...summary,
        errorMessage: null,
      })
      .where(and(eq(productionUploads.id, uploadId), eq(productionUploads.userId, userId)));
  });
}

export async function getStockMovementsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(stockMovements)
    .where(eq(stockMovements.userId, userId))
    .orderBy(desc(stockMovements.ocorridoEm), desc(stockMovements.id));
}

export async function getStockMovementById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(stockMovements)
    .where(and(eq(stockMovements.id, id), eq(stockMovements.userId, userId)))
    .limit(1);
  return result[0];
}

export async function getStockMovementAuditByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(stockMovementAudit)
    .where(eq(stockMovementAudit.userId, userId))
    .orderBy(desc(stockMovementAudit.registradoEm), desc(stockMovementAudit.id));
}

export class StockMovementConflictError extends Error {
  constructor(message = "O movimento de estoque foi alterado ou removido por outro dispositivo. Recarregue os dados e tente novamente.") {
    super(message);
    this.name = "StockMovementConflictError";
  }
}

export class StockBalanceError extends Error {
  constructor(tipoPlaca: string, saldoProjetado: number) {
    super(`Movimento rejeitado: o saldo de ${tipoPlaca} ficaria negativo (${saldoProjetado}). Registre uma entrada ou revise a quantidade.`);
    this.name = "StockBalanceError";
  }
}

async function assertStockBalance(
  tx: any,
  userId: number,
  tipoPlaca: string,
  delta: number,
  excludedMovementId?: number,
) {
  // Serialize mutations for the same user so two devices cannot both spend
  // the same available balance between the read and the insert/update.
  await tx.execute(sql`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`);
  const where = excludedMovementId === undefined
    ? and(eq(stockMovements.userId, userId), eq(stockMovements.tipoPlaca, tipoPlaca))
    : and(
      eq(stockMovements.userId, userId),
      eq(stockMovements.tipoPlaca, tipoPlaca),
      ne(stockMovements.id, excludedMovementId),
    );
  const result = await tx.select({
    saldo: sql<number>`COALESCE(SUM(CASE WHEN ${stockMovements.movimento} = 'entrada' THEN ${stockMovements.quantidade} ELSE -${stockMovements.quantidade} END), 0)`,
  }).from(stockMovements).where(where);
  const saldoProjetado = Number(result[0]?.saldo ?? 0) + delta;
  if (saldoProjetado < 0) throw new StockBalanceError(tipoPlaca, saldoProjetado);
}

export async function insertStockMovement(data: InsertStockMovement) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async tx => {
    await assertStockBalance(tx, data.userId, data.tipoPlaca, movimentoParaDelta(data.movimento, data.quantidade));
    const result = await tx.insert(stockMovements).values(data);
    const id = Number((result as any)[0]?.insertId ?? 0);
    await tx.insert(stockMovementAudit).values({
      movementId: id,
      userId: data.userId,
      acao: "create",
      tipoPlaca: data.tipoPlaca,
      movimento: data.movimento,
      quantidade: data.quantidade,
      observacao: data.observacao ?? null,
      ocorridoEm: data.ocorridoEm ?? new Date(),
    });
    return id;
  });
}

export async function updateStockMovement(
  id: number,
  userId: number,
  expectedVersion: number,
  data: Omit<InsertStockMovement, "userId">,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async tx => {
    await tx.execute(sql`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`);
    const currentResult = await tx.select().from(stockMovements)
      .where(and(eq(stockMovements.id, id), eq(stockMovements.userId, userId)))
      .limit(1);
    const current = currentResult[0];
    if (!current || current.version !== expectedVersion) {
      throw new StockMovementConflictError();
    }

    await assertStockBalance(
      tx,
      userId,
      data.tipoPlaca,
      movimentoParaDelta(data.movimento, data.quantidade),
      id,
    );

    const updated = await tx.update(stockMovements)
      .set({ ...data, version: sql`${stockMovements.version} + 1` })
      .where(and(
        eq(stockMovements.id, id),
        eq(stockMovements.userId, userId),
        eq(stockMovements.version, expectedVersion),
      ));
    const affectedRows = Number((updated as any)[0]?.affectedRows ?? (updated as any).affectedRows ?? 0);
    if (affectedRows !== 1) throw new StockMovementConflictError();

    await tx.insert(stockMovementAudit).values({
      movementId: id,
      userId,
      acao: "update",
      tipoPlaca: data.tipoPlaca,
      movimento: data.movimento,
      quantidade: data.quantidade,
      observacao: data.observacao ?? null,
      ocorridoEm: data.ocorridoEm ?? current.ocorridoEm,
    });
  });
}

export async function deleteStockMovement(id: number, userId: number, expectedVersion: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async tx => {
    await tx.execute(sql`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`);
    const currentResult = await tx.select().from(stockMovements)
      .where(and(eq(stockMovements.id, id), eq(stockMovements.userId, userId)))
      .limit(1);
    const current = currentResult[0];
    if (!current || current.version !== expectedVersion) {
      throw new StockMovementConflictError();
    }

    await assertStockBalance(tx, userId, current.tipoPlaca, 0, id);

    await tx.insert(stockMovementAudit).values({
      movementId: current.id,
      userId,
      acao: "delete",
      tipoPlaca: current.tipoPlaca,
      movimento: current.movimento,
      quantidade: current.quantidade,
      observacao: current.observacao,
      ocorridoEm: current.ocorridoEm,
    });
    const deleted = await tx.delete(stockMovements)
      .where(and(
        eq(stockMovements.id, id),
        eq(stockMovements.userId, userId),
        eq(stockMovements.version, expectedVersion),
      ));
    const affectedRows = Number((deleted as any)[0]?.affectedRows ?? (deleted as any).affectedRows ?? 0);
    if (affectedRows !== 1) throw new StockMovementConflictError();
  });
}
