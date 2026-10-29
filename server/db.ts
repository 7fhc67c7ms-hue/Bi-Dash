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
  InsertStockMovement,
  users,
  products,
  customers,
  suppliers,
  equipment,
  purchaseOrders,
  purchaseOrderItems,
  qualityInspections,
  maintenanceRecords,
  financeEntries,
  salesOrders,
  InsertProduct,
  InsertCustomer,
  InsertSupplier,
  InsertEquipment,
  InsertPurchaseOrder,
  InsertPurchaseOrderItem,
  InsertQualityInspection,
  InsertMaintenanceRecord,
  InsertFinanceEntry,
  InsertSalesOrder,
  billsOfMaterials,
  billOfMaterialItems,
  productionOrders,
  costEntries,
  InsertBillOfMaterials,
  InsertBillOfMaterialItem,
  InsertProductionOrder,
  InsertCostEntry,
  auditEvents,
  InsertAuditEvent,
  productPrices,
  supplies,
  supplyConsumptions,
  customerLocations,
  masterUnits,
  masterCategories,
  storageLocations,
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

/** Remove uma importação e suas linhas em uma única transação, sempre isolada pelo utilizador. */
export async function deleteProductionUploadWithData(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async tx => {
    await tx.delete(productionData)
      .where(and(eq(productionData.uploadId, id), eq(productionData.userId, userId)));
    return tx.delete(productionUploads)
      .where(and(eq(productionUploads.id, id), eq(productionUploads.userId, userId)));
  });
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

export async function insertStockMovement(data: InsertStockMovement) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(stockMovements).values(data);
  return Number((result as any)[0]?.insertId ?? 0);
}

export async function deleteStockMovement(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(stockMovements)
    .where(and(eq(stockMovements.id, id), eq(stockMovements.userId, userId)));
}

function insertedId(result: unknown) {
  return Number((result as any)?.[0]?.insertId ?? 0);
}

export async function listProducts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products).where(eq(products.userId, userId)).orderBy(products.name);
}

export async function insertProduct(data: InsertProduct) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return insertedId(await db.insert(products).values(data));
}

export async function listCustomers(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(customers).where(eq(customers.userId, userId)).orderBy(customers.name);
}

export async function insertCustomer(data: InsertCustomer) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return insertedId(await db.insert(customers).values(data));
}

export async function listSuppliers(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(suppliers).where(eq(suppliers.userId, userId)).orderBy(suppliers.name);
}

export async function insertSupplier(data: InsertSupplier) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return insertedId(await db.insert(suppliers).values(data));
}

export async function listEquipment(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(equipment).where(eq(equipment.userId, userId)).orderBy(equipment.name);
}

export async function insertEquipment(data: InsertEquipment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return insertedId(await db.insert(equipment).values(data));
}

export async function listPurchaseOrders(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(purchaseOrders).where(eq(purchaseOrders.userId, userId)).orderBy(desc(purchaseOrders.createdAt));
}

export async function insertPurchaseOrder(data: InsertPurchaseOrder, items: InsertPurchaseOrderItem[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async tx => {
    const result = await tx.insert(purchaseOrders).values(data);
    const id = insertedId(result);
    if (items.length) await tx.insert(purchaseOrderItems).values(items.map(item => ({ ...item, purchaseOrderId: id })));
    return id;
  });
}

export async function listQualityInspections(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(qualityInspections).where(eq(qualityInspections.userId, userId)).orderBy(desc(qualityInspections.inspectedAt));
}

export async function insertQualityInspection(data: InsertQualityInspection) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return insertedId(await db.insert(qualityInspections).values(data));
}

export async function listMaintenanceRecords(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(maintenanceRecords).where(eq(maintenanceRecords.userId, userId)).orderBy(desc(maintenanceRecords.createdAt));
}

export async function insertMaintenanceRecord(data: InsertMaintenanceRecord) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return insertedId(await db.insert(maintenanceRecords).values(data));
}

export async function listFinanceEntries(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(financeEntries).where(eq(financeEntries.userId, userId)).orderBy(desc(financeEntries.dueAt));
}

export async function insertFinanceEntry(data: InsertFinanceEntry) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return insertedId(await db.insert(financeEntries).values(data));
}

export async function listSalesOrders(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(salesOrders).where(eq(salesOrders.userId, userId)).orderBy(desc(salesOrders.createdAt));
}

export async function insertSalesOrder(data: InsertSalesOrder) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return insertedId(await db.insert(salesOrders).values(data));
}

export async function listBillsOfMaterials(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(billsOfMaterials).where(eq(billsOfMaterials.userId, userId)).orderBy(desc(billsOfMaterials.createdAt));
}

export async function insertBillOfMaterials(data: InsertBillOfMaterials, items: InsertBillOfMaterialItem[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async tx => {
    const result = await tx.insert(billsOfMaterials).values(data);
    const id = insertedId(result);
    if (items.length) await tx.insert(billOfMaterialItems).values(items.map(item => ({ ...item, billOfMaterialsId: id })));
    return id;
  });
}

export async function listProductionOrders(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(productionOrders).where(eq(productionOrders.userId, userId)).orderBy(desc(productionOrders.createdAt));
}

export async function insertProductionOrder(data: InsertProductionOrder) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return insertedId(await db.insert(productionOrders).values(data));
}

export async function listCostEntries(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(costEntries).where(eq(costEntries.userId, userId)).orderBy(desc(costEntries.occurredAt));
}

export async function insertCostEntry(data: InsertCostEntry) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return insertedId(await db.insert(costEntries).values(data));
}

export async function listAuditEvents(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditEvents).where(eq(auditEvents.userId, userId)).orderBy(desc(auditEvents.createdAt));
}

export async function insertAuditEvent(data: InsertAuditEvent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return insertedId(await db.insert(auditEvents).values(data));
}

export async function receivePurchaseOrder(
  userId: number,
  orderId: number,
  receipts: Array<{ itemId: number; quantity: string }>,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async tx => {
    const order = (await tx.select().from(purchaseOrders).where(and(eq(purchaseOrders.id, orderId), eq(purchaseOrders.userId, userId))).limit(1))[0];
    if (!order) throw new Error("Pedido de compra não encontrado");
    const items = await tx.select().from(purchaseOrderItems).where(and(eq(purchaseOrderItems.purchaseOrderId, orderId), eq(purchaseOrderItems.userId, userId)));
    const productsById = new Map((await tx.select().from(products).where(and(eq(products.userId, userId), inArray(products.id, items.map(item => item.productId))))).map(item => [item.id, item]));
    const existingMovements = await tx.select({ operationKey: stockMovements.operationKey }).from(stockMovements).where(and(eq(stockMovements.userId, userId), eq(stockMovements.sourceType, "purchase_receipt"), eq(stockMovements.sourceId, orderId)));
    const existingKeys = new Set(existingMovements.map(item => item.operationKey));
    const groupedReceipts = Array.from(receipts.reduce((groups, receipt) => {
      groups.set(receipt.itemId, (groups.get(receipt.itemId) ?? 0) + Number(receipt.quantity));
      return groups;
    }, new Map<number, number>()).entries()).map(([itemId, quantity]) => ({ itemId, quantity: quantity.toString() }));
    for (const receipt of groupedReceipts) {
      const item = items.find(candidate => candidate.id === receipt.itemId);
      if (!item) throw new Error("Item de compra inválido");
      const quantity = Number(receipt.quantity);
      const remaining = Number(item.quantity) - Number(item.receivedQuantity);
      if (!Number.isFinite(quantity) || quantity <= 0 || quantity > remaining) throw new Error("Quantidade recebida inválida ou superior ao saldo do pedido");
      const product = productsById.get(item.productId);
      if (!product) throw new Error("Produto do pedido não encontrado");
      const operationKey = `purchase:${orderId}:item:${item.id}`;
      if (existingKeys.has(operationKey)) continue;
      await tx.insert(stockMovements).values({ userId, tipoPlaca: product.code, movimento: "entrada", quantidade: Math.ceil(quantity), observacao: `Recebimento do pedido ${order.number}`, sourceType: "purchase_receipt", sourceId: orderId, operationKey });
      await tx.update(purchaseOrderItems).set({ receivedQuantity: (Number(item.receivedQuantity) + quantity).toFixed(3) }).where(and(eq(purchaseOrderItems.id, item.id), eq(purchaseOrderItems.userId, userId)));
    }
    const refreshedItems = await tx.select().from(purchaseOrderItems).where(and(eq(purchaseOrderItems.purchaseOrderId, orderId), eq(purchaseOrderItems.userId, userId)));
    const complete = refreshedItems.every(item => Number(item.receivedQuantity) >= Number(item.quantity));
    await tx.update(purchaseOrders).set({ status: complete ? "recebido" : "parcial", receivedAt: complete ? new Date() : null }).where(and(eq(purchaseOrders.id, orderId), eq(purchaseOrders.userId, userId)));
    const financeExisting = await tx.select({ id: financeEntries.id }).from(financeEntries).where(and(eq(financeEntries.userId, userId), eq(financeEntries.sourceType, "purchase_order"), eq(financeEntries.sourceId, orderId))).limit(1);
    if (!financeExisting.length) await tx.insert(financeEntries).values({ userId, type: "pagar", description: `Pedido de compra ${order.number}`, amount: order.totalAmount, dueAt: order.expectedAt ?? new Date(), sourceType: "purchase_order", sourceId: orderId });
    await tx.insert(auditEvents).values({ userId, action: "receive", entityType: "purchase_order", entityId: orderId, details: JSON.stringify({ receipts }) });
    return { status: complete ? "recebido" : "parcial" };
  });
}

export async function completeProductionOrder(userId: number, orderId: number, producedQuantity: string, rejectedQuantity: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async tx => {
    const order = (await tx.select().from(productionOrders).where(and(eq(productionOrders.id, orderId), eq(productionOrders.userId, userId))).limit(1))[0];
    if (!order) throw new Error("Ordem de produção não encontrada");
    if (!order.billOfMaterialsId) throw new Error("A ordem não possui ficha técnica vinculada");
    const quantity = Number(producedQuantity);
    const rejected = Number(rejectedQuantity);
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(rejected) || rejected < 0) throw new Error("Quantidade produzida inválida");
    const bom = (await tx.select().from(billsOfMaterials).where(and(eq(billsOfMaterials.id, order.billOfMaterialsId), eq(billsOfMaterials.userId, userId))).limit(1))[0];
    if (!bom) throw new Error("Ficha técnica não encontrada");
    const items = await tx.select().from(billOfMaterialItems).where(and(eq(billOfMaterialItems.billOfMaterialsId, bom.id), eq(billOfMaterialItems.userId, userId)));
    const productIds = [order.productId, ...items.map(item => item.componentProductId)];
    const productRows = await tx.select().from(products).where(and(eq(products.userId, userId), inArray(products.id, productIds)));
    const byId = new Map(productRows.map(item => [item.id, item]));
    const movements = await tx.select().from(stockMovements).where(eq(stockMovements.userId, userId));
    const balance = (code: string) => movements.filter(item => item.tipoPlaca === code).reduce((sum, item) => sum + ((item.movimento === "entrada" || item.movimento === "devolucao") ? item.quantidade : -item.quantidade), 0);
    const factor = quantity / Number(bom.yieldQuantity);
    for (const item of items) {
      const product = byId.get(item.componentProductId);
      if (!product) throw new Error("Componente da ficha técnica não encontrado");
      const required = Math.ceil(Number(item.quantity) * factor * (1 + Number(bom.expectedLossPercent) / 100));
      if (balance(product.code) < required) throw new Error(`Estoque insuficiente para ${product.name}`);
      const operationKey = `production:${orderId}:component:${item.id}`;
      if (!movements.some(movement => movement.operationKey === operationKey)) await tx.insert(stockMovements).values({ userId, tipoPlaca: product.code, movimento: "saida", quantidade: required, observacao: `Consumo da ordem ${order.number}`, sourceType: "production_consumption", sourceId: orderId, operationKey });
    }
    const finished = byId.get(order.productId);
    if (!finished) throw new Error("Produto acabado da ordem não encontrado");
    const outputKey = `production:${orderId}:output`;
    if (!movements.some(movement => movement.operationKey === outputKey)) await tx.insert(stockMovements).values({ userId, tipoPlaca: finished.code, movimento: "entrada", quantidade: Math.ceil(quantity), observacao: `Produção concluída na ordem ${order.number}`, sourceType: "production_output", sourceId: orderId, operationKey: outputKey });
    await tx.update(productionOrders).set({ status: "concluida", producedQuantity: quantity.toFixed(3), rejectedQuantity: rejected.toFixed(3), completedAt: new Date() }).where(and(eq(productionOrders.id, orderId), eq(productionOrders.userId, userId)));
    await tx.insert(auditEvents).values({ userId, action: "complete", entityType: "production_order", entityId: orderId, details: JSON.stringify({ producedQuantity, rejectedQuantity }) });
    return { status: "concluida" as const };
  });
}

export async function updatePurchaseOrderStatus(userId: number, id: number, status: "rascunho" | "pendente" | "aprovado" | "parcial" | "recebido" | "cancelado") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(purchaseOrders).set({ status }).where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.userId, userId)));
  await db.insert(auditEvents).values({ userId, action: "status_change", entityType: "purchase_order", entityId: id, details: JSON.stringify({ status }) });
  return { success: true };
}

export async function updateQualityInspectionStatus(userId: number, id: number, status: "pendente" | "aprovado" | "reprovado" | "bloqueado") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(qualityInspections).set({ status }).where(and(eq(qualityInspections.id, id), eq(qualityInspections.userId, userId)));
  await db.insert(auditEvents).values({ userId, action: "status_change", entityType: "quality_inspection", entityId: id, details: JSON.stringify({ status }) });
  return { success: true };
}

export async function updateMaintenanceStatus(userId: number, id: number, status: "aberta" | "em_execucao" | "concluida" | "cancelada") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(maintenanceRecords).set({ status, completedAt: status === "concluida" ? new Date() : null }).where(and(eq(maintenanceRecords.id, id), eq(maintenanceRecords.userId, userId)));
  await db.insert(auditEvents).values({ userId, action: "status_change", entityType: "maintenance_record", entityId: id, details: JSON.stringify({ status }) });
  return { success: true };
}

export async function updateFinanceStatus(userId: number, id: number, status: "aberto" | "pago" | "vencido" | "cancelado") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(financeEntries).set({ status, paidAt: status === "pago" ? new Date() : null }).where(and(eq(financeEntries.id, id), eq(financeEntries.userId, userId)));
  await db.insert(auditEvents).values({ userId, action: "status_change", entityType: "finance_entry", entityId: id, details: JSON.stringify({ status }) });
  return { success: true };
}

export async function updateSalesOrderStatus(userId: number, id: number, status: "rascunho" | "confirmado" | "separacao" | "expedido" | "entregue" | "cancelado") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(salesOrders).set({ status, deliveredAt: status === "entregue" ? new Date() : null }).where(and(eq(salesOrders.id, id), eq(salesOrders.userId, userId)));
  await db.insert(auditEvents).values({ userId, action: "status_change", entityType: "sales_order", entityId: id, details: JSON.stringify({ status }) });
  return { success: true };
}

export async function updateProductionOrderStatus(userId: number, id: number, status: "planejada" | "reservada" | "em_producao" | "pausada" | "concluida" | "cancelada") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const timestamps = status === "em_producao" ? { startedAt: new Date() } : {};
  await db.update(productionOrders).set({ status, ...timestamps }).where(and(eq(productionOrders.id, id), eq(productionOrders.userId, userId)));
  await db.insert(auditEvents).values({ userId, action: "status_change", entityType: "production_order", entityId: id, details: JSON.stringify({ status }) });
  return { success: true };
}


// Adapter ZIP: todas as operações filtram userId; o chamador expõe estes métodos sob uploaded.
export async function listProductPrices(userId: number) { const db = await getDb(); if (!db) return []; return db.select().from(productPrices).where(eq(productPrices.userId, userId)).orderBy(desc(productPrices.vigenteDesde)); }
export async function createProductPrice(userId: number, value: { tipoPlaca: string; custoCompraCentavos: number; precoVendaCentavos: number; vigenteDesde?: string; observacao?: string | null }) { const db = await getDb(); if (!db) throw new Error("Database not available"); const r = await db.insert(productPrices).values({ userId, ...value, vigenteDesde: value.vigenteDesde ? new Date(value.vigenteDesde) : new Date(), observacao: value.observacao ?? null }); return { success: true, id: insertedId(r) }; }
export async function deleteProductPrice(id: number, userId: number) { const db = await getDb(); if (!db) throw new Error("Database not available"); await db.delete(productPrices).where(and(eq(productPrices.id, id), eq(productPrices.userId, userId))); return { success: true }; }
export async function listSupplies(userId: number) { const db = await getDb(); if (!db) return []; return db.select().from(supplies).where(eq(supplies.userId, userId)).orderBy(supplies.nome); }
export async function createSupply(userId: number, value: { nome: string; unidade: string; custoUnitarioCentavos: number; observacao?: string | null }) { const db = await getDb(); if (!db) throw new Error("Database not available"); const r = await db.insert(supplies).values({ userId, ...value, ativo: 1, observacao: value.observacao ?? null }); return { success: true, id: insertedId(r) }; }
export async function updateSupply(id: number, userId: number, ativo: boolean) { const db = await getDb(); if (!db) throw new Error("Database not available"); await db.update(supplies).set({ ativo: ativo ? 1 : 0 }).where(and(eq(supplies.id, id), eq(supplies.userId, userId))); return { success: true }; }
export async function deleteSupply(id: number, userId: number) { const db = await getDb(); if (!db) throw new Error("Database not available"); await db.delete(supplies).where(and(eq(supplies.id, id), eq(supplies.userId, userId))); return { success: true }; }
export async function listSupplyConsumptions(userId: number) { const db = await getDb(); if (!db) return []; return db.select().from(supplyConsumptions).where(eq(supplyConsumptions.userId, userId)).orderBy(desc(supplyConsumptions.referenciaEm)); }
export async function createSupplyConsumption(userId: number, value: { supplyId: number; periodicidade: "diaria" | "semanal" | "por_placas"; quantidade: number; custoUnitarioCentavos: number; placasProduzidas?: number | null; referenciaEm?: string; observacao?: string | null }) { const db = await getDb(); if (!db) throw new Error("Database not available"); return db.transaction(async tx => { const owner = await tx.select({ id: supplies.id }).from(supplies).where(and(eq(supplies.id, value.supplyId), eq(supplies.userId, userId))).limit(1); if (!owner.length) throw new Error("Insumo não encontrado"); const r = await tx.insert(supplyConsumptions).values({ userId, supplyId: value.supplyId, periodicidade: value.periodicidade, quantidade: String(value.quantidade), custoUnitarioCentavos: value.custoUnitarioCentavos, placasProduzidas: value.placasProduzidas ?? null, referenciaEm: value.referenciaEm ? new Date(value.referenciaEm) : new Date(), observacao: value.observacao ?? null }); return { success: true, id: insertedId(r) }; }); }
export async function deleteSupplyConsumption(id: number, userId: number) { const db = await getDb(); if (!db) throw new Error("Database not available"); await db.delete(supplyConsumptions).where(and(eq(supplyConsumptions.id, id), eq(supplyConsumptions.userId, userId))); return { success: true }; }
export async function listCustomerLocations(userId: number) { const db = await getDb(); if (!db) return []; return db.select().from(customerLocations).where(eq(customerLocations.userId, userId)).orderBy(customerLocations.nome); }
export async function createCustomerLocation(userId: number, value: { nome: string; cep?: string | null; cidade?: string | null; uf?: string | null }) { const db = await getDb(); if (!db) throw new Error("Database not available"); const r = await db.insert(customerLocations).values({ userId, ...value, cep: value.cep ?? null, cidade: value.cidade ?? null, uf: value.uf ?? null }); return { success: true, id: insertedId(r) }; }
export async function deleteCustomerLocation(id: number, userId: number) { const db = await getDb(); if (!db) throw new Error("Database not available"); await db.delete(customerLocations).where(and(eq(customerLocations.id, id), eq(customerLocations.userId, userId))); return { success: true }; }
export async function createMasterUnit(userId: number, value: { codigo: string; nome: string; casasDecimais: number }) { const db = await getDb(); if (!db) throw new Error("Database not available"); const r = await db.insert(masterUnits).values({ userId, ...value, ativo: 1 }); return { success: true, id: insertedId(r) }; }
export async function createMasterCategory(userId: number, nome: string) { const db = await getDb(); if (!db) throw new Error("Database not available"); const r = await db.insert(masterCategories).values({ userId, nome, ativo: 1 }); return { success: true, id: insertedId(r) }; }
export async function createStorageLocation(userId: number, value: { nome: string; tipo: string }) { const db = await getDb(); if (!db) throw new Error("Database not available"); const r = await db.insert(storageLocations).values({ userId, ...value, ativo: 1 }); return { success: true, id: insertedId(r) }; }
export async function getMasterData(userId: number) { const db = await getDb(); if (!db) return { units: [], categories: [], locations: [] }; return { units: await db.select().from(masterUnits).where(eq(masterUnits.userId, userId)), categories: await db.select().from(masterCategories).where(eq(masterCategories.userId, userId)), locations: await db.select().from(storageLocations).where(eq(storageLocations.userId, userId)) }; }
