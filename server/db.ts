import { and, desc, eq, inArray, sql } from "drizzle-orm";
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
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
let _schemaReady: Promise<void> | null = null;

async function ensureProductionUploadColumns(db: ReturnType<typeof drizzle>) {
  try {
    const [rows] = await db.execute(sql`
      SELECT COLUMN_NAME AS columnName
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'production_uploads'
        AND COLUMN_NAME IN ('rowsRejected', 'duplicatesAvoided')
    `);
    const columns = new Set(
      (rows as unknown as Array<{ columnName?: string }>).map(row => row.columnName)
    );
    if (!columns.has("rowsRejected")) {
      await db.execute(sql`ALTER TABLE production_uploads ADD COLUMN rowsRejected INT NOT NULL DEFAULT 0`);
    }
    if (!columns.has("duplicatesAvoided")) {
      await db.execute(sql`ALTER TABLE production_uploads ADD COLUMN duplicatesAvoided INT NOT NULL DEFAULT 0`);
    }
  } catch (error) {
    // A deploy with an older schema must not crash the whole server. The
    // original error remains visible to the caller and can be repaired by the
    // next retry or by applying the Drizzle migration manually.
    console.warn("[Database] Could not reconcile production_uploads schema:", error);
  }
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
      _schemaReady = ensureProductionUploadColumns(_db);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  if (_db && _schemaReady) await _schemaReady;
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

export async function insertManyProductionData(data: InsertProductionData[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.length === 0) return;
  await db.transaction(async (tx) => {
    await tx.insert(productionData).values(data);
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

export async function insertStockMovement(data: InsertStockMovement) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async tx => {
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
    const currentResult = await tx.select().from(stockMovements)
      .where(and(eq(stockMovements.id, id), eq(stockMovements.userId, userId)))
      .limit(1);
    const current = currentResult[0];
    if (!current || current.version !== expectedVersion) {
      throw new StockMovementConflictError();
    }

    await tx.update(stockMovements)
      .set({ ...data, version: sql`${stockMovements.version} + 1` })
      .where(and(
        eq(stockMovements.id, id),
        eq(stockMovements.userId, userId),
        eq(stockMovements.version, expectedVersion),
      ));

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
    const currentResult = await tx.select().from(stockMovements)
      .where(and(eq(stockMovements.id, id), eq(stockMovements.userId, userId)))
      .limit(1);
    const current = currentResult[0];
    if (!current || current.version !== expectedVersion) {
      throw new StockMovementConflictError();
    }

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
    await tx.delete(stockMovements)
      .where(and(
        eq(stockMovements.id, id),
        eq(stockMovements.userId, userId),
        eq(stockMovements.version, expectedVersion),
      ));
  });
}
