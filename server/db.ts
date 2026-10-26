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
  customerLocations,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

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

function isDuplicateKeyError(error: unknown) {
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

export async function deleteCustomerLocation(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(customerLocations)
    .where(and(eq(customerLocations.id, id), eq(customerLocations.userId, userId)));
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
