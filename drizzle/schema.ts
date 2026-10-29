import {
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Tabela para armazenar dados de produção extraídos de PDFs
 */
export const productionUploads = mysqlTable("production_uploads", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileUrl: text("fileUrl"),
  fileHash: varchar("fileHash", { length: 64 }).notNull(),
  status: mysqlEnum("status", ["processing", "completed", "failed"])
    .default("processing")
    .notNull(),
  rowsExtracted: int("rowsExtracted").default(0).notNull(),
  rowsRejected: int("rowsRejected").default(0).notNull(),
  duplicatesAvoided: int("duplicatesAvoided").default(0).notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const productionData = mysqlTable("production_data", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id),
  uploadId: int("uploadId").references(() => productionUploads.id),
  romaneio: varchar("romaneio", { length: 64 }),
  cliente: varchar("cliente", { length: 255 }).notNull(),
  tipoPlaca: varchar("tipoPlaca", { length: 255 }).notNull(),
  quantidade: int("quantidade").notNull(),
  mes: varchar("mes", { length: 32 }).notNull(),
  ano: int("ano").notNull(),
  pdfFileName: varchar("pdfFileName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProductionUpload = typeof productionUploads.$inferSelect;
export type InsertProductionUpload = typeof productionUploads.$inferInsert;

export type ProductionData = typeof productionData.$inferSelect;
export type InsertProductionData = typeof productionData.$inferInsert;

/** Movimentos independentes do estoque físico, sem alterar a produção importada. */
export const stockMovements = mysqlTable("stock_movements", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id),
  tipoPlaca: varchar("tipoPlaca", { length: 255 }).notNull(),
  movimento: mysqlEnum("movimento", [
    "entrada",
    "saida",
    "descarte",
    "devolucao",
  ]).notNull(),
  quantidade: int("quantidade").notNull(),
  observacao: text("observacao"),
  sourceType: varchar("sourceType", { length: 64 }),
  sourceId: int("sourceId"),
  operationKey: varchar("operationKey", { length: 128 }).unique(),
  ocorridoEm: timestamp("ocorridoEm").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StockMovement = typeof stockMovements.$inferSelect;
export type InsertStockMovement = typeof stockMovements.$inferInsert;
export type StockMovementKind = "entrada" | "saida" | "descarte" | "devolucao";

export const auditEvents = mysqlTable("audit_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id),
  action: varchar("action", { length: 64 }).notNull(),
  entityType: varchar("entityType", { length: 64 }).notNull(),
  entityId: int("entityId"),
  details: text("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditEvent = typeof auditEvents.$inferSelect;
export type InsertAuditEvent = typeof auditEvents.$inferInsert;

/** Cadastros mestres reutilizados pelos módulos operacionais. */
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id),
  code: varchar("code", { length: 64 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  kind: mysqlEnum("kind", [
    "acabado",
    "intermediario",
    "insumo",
    "embalagem",
  ]).notNull(),
  unit: varchar("unit", { length: 16 }).notNull().default("UN"),
  category: varchar("category", { length: 128 }),
  minimumStock: decimal("minimumStock", { precision: 14, scale: 3 })
    .notNull()
    .default("0"),
  maximumStock: decimal("maximumStock", { precision: 14, scale: 3 })
    .notNull()
    .default("0"),
  reorderPoint: decimal("reorderPoint", { precision: 14, scale: 3 })
    .notNull()
    .default("0"),
  active: int("active").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  document: varchar("document", { length: 32 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  active: int("active").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const suppliers = mysqlTable("suppliers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  document: varchar("document", { length: 32 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  paymentTerms: varchar("paymentTerms", { length: 128 }),
  active: int("active").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const equipment = mysqlTable("equipment", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 64 }),
  sector: varchar("sector", { length: 128 }),
  status: mysqlEnum("status", ["ativo", "parado", "manutencao", "inativo"])
    .notNull()
    .default("ativo"),
  maintenanceIntervalDays: int("maintenanceIntervalDays"),
  lastMaintenanceAt: timestamp("lastMaintenanceAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const purchaseOrders = mysqlTable("purchase_orders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id),
  supplierId: int("supplierId").references(() => suppliers.id),
  number: varchar("number", { length: 64 }).notNull(),
  status: mysqlEnum("status", [
    "rascunho",
    "pendente",
    "aprovado",
    "parcial",
    "recebido",
    "cancelado",
  ])
    .notNull()
    .default("rascunho"),
  expectedAt: timestamp("expectedAt"),
  receivedAt: timestamp("receivedAt"),
  totalAmount: decimal("totalAmount", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const purchaseOrderItems = mysqlTable("purchase_order_items", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id),
  purchaseOrderId: int("purchaseOrderId")
    .notNull()
    .references(() => purchaseOrders.id),
  productId: int("productId")
    .notNull()
    .references(() => products.id),
  quantity: decimal("quantity", { precision: 14, scale: 3 }).notNull(),
  receivedQuantity: decimal("receivedQuantity", { precision: 14, scale: 3 })
    .notNull()
    .default("0"),
  unitPrice: decimal("unitPrice", { precision: 14, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const qualityInspections = mysqlTable("quality_inspections", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id),
  productId: int("productId").references(() => products.id),
  lot: varchar("lot", { length: 128 }),
  inspectionType: mysqlEnum("inspectionType", [
    "recebimento",
    "processo",
    "acabado",
    "devolucao",
  ]).notNull(),
  status: mysqlEnum("status", [
    "pendente",
    "aprovado",
    "reprovado",
    "bloqueado",
  ])
    .notNull()
    .default("pendente"),
  sampleSize: decimal("sampleSize", { precision: 14, scale: 3 }),
  rejectedQuantity: decimal("rejectedQuantity", { precision: 14, scale: 3 }),
  criteria: text("criteria"),
  result: text("result"),
  inspectedAt: timestamp("inspectedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const maintenanceRecords = mysqlTable("maintenance_records", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id),
  equipmentId: int("equipmentId")
    .notNull()
    .references(() => equipment.id),
  type: mysqlEnum("type", ["preventiva", "corretiva", "preditiva"]).notNull(),
  status: mysqlEnum("status", [
    "aberta",
    "em_execucao",
    "concluida",
    "cancelada",
  ])
    .notNull()
    .default("aberta"),
  priority: mysqlEnum("priority", ["baixa", "media", "alta", "critica"])
    .notNull()
    .default("media"),
  description: text("description").notNull(),
  scheduledAt: timestamp("scheduledAt"),
  completedAt: timestamp("completedAt"),
  costAmount: decimal("costAmount", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const financeEntries = mysqlTable("finance_entries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id),
  type: mysqlEnum("type", ["pagar", "receber"]).notNull(),
  status: mysqlEnum("status", ["aberto", "pago", "vencido", "cancelado"])
    .notNull()
    .default("aberto"),
  description: varchar("description", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
  dueAt: timestamp("dueAt").notNull(),
  paidAt: timestamp("paidAt"),
  sourceType: varchar("sourceType", { length: 64 }),
  sourceId: int("sourceId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const salesOrders = mysqlTable("sales_orders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id),
  customerId: int("customerId").references(() => customers.id),
  number: varchar("number", { length: 64 }).notNull(),
  status: mysqlEnum("status", [
    "rascunho",
    "confirmado",
    "separacao",
    "expedido",
    "entregue",
    "cancelado",
  ])
    .notNull()
    .default("rascunho"),
  totalAmount: decimal("totalAmount", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  promisedAt: timestamp("promisedAt"),
  deliveredAt: timestamp("deliveredAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;
export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = typeof suppliers.$inferInsert;
export type Equipment = typeof equipment.$inferSelect;
export type InsertEquipment = typeof equipment.$inferInsert;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = typeof purchaseOrders.$inferInsert;
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type InsertPurchaseOrderItem = typeof purchaseOrderItems.$inferInsert;
export type QualityInspection = typeof qualityInspections.$inferSelect;
export type InsertQualityInspection = typeof qualityInspections.$inferInsert;
export type MaintenanceRecord = typeof maintenanceRecords.$inferSelect;
export type InsertMaintenanceRecord = typeof maintenanceRecords.$inferInsert;
export type FinanceEntry = typeof financeEntries.$inferSelect;
export type InsertFinanceEntry = typeof financeEntries.$inferInsert;
export type SalesOrder = typeof salesOrders.$inferSelect;
export type InsertSalesOrder = typeof salesOrders.$inferInsert;

export const billsOfMaterials = mysqlTable("bills_of_materials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id),
  productId: int("productId")
    .notNull()
    .references(() => products.id),
  version: varchar("version", { length: 32 }).notNull().default("1"),
  status: mysqlEnum("status", ["rascunho", "ativa", "encerrada"])
    .notNull()
    .default("rascunho"),
  yieldQuantity: decimal("yieldQuantity", { precision: 14, scale: 3 })
    .notNull()
    .default("1"),
  expectedLossPercent: decimal("expectedLossPercent", {
    precision: 7,
    scale: 3,
  })
    .notNull()
    .default("0"),
  validFrom: timestamp("validFrom"),
  validUntil: timestamp("validUntil"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const billOfMaterialItems = mysqlTable("bill_of_material_items", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id),
  billOfMaterialsId: int("billOfMaterialsId")
    .notNull()
    .references(() => billsOfMaterials.id),
  componentProductId: int("componentProductId")
    .notNull()
    .references(() => products.id),
  quantity: decimal("quantity", { precision: 14, scale: 3 }).notNull(),
  unit: varchar("unit", { length: 16 }).notNull().default("UN"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const productionOrders = mysqlTable("production_orders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id),
  number: varchar("number", { length: 64 }).notNull(),
  productId: int("productId")
    .notNull()
    .references(() => products.id),
  billOfMaterialsId: int("billOfMaterialsId").references(
    () => billsOfMaterials.id
  ),
  status: mysqlEnum("status", [
    "planejada",
    "reservada",
    "em_producao",
    "pausada",
    "concluida",
    "cancelada",
  ])
    .notNull()
    .default("planejada"),
  plannedQuantity: decimal("plannedQuantity", {
    precision: 14,
    scale: 3,
  }).notNull(),
  producedQuantity: decimal("producedQuantity", { precision: 14, scale: 3 })
    .notNull()
    .default("0"),
  rejectedQuantity: decimal("rejectedQuantity", { precision: 14, scale: 3 })
    .notNull()
    .default("0"),
  plannedStartAt: timestamp("plannedStartAt"),
  plannedEndAt: timestamp("plannedEndAt"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const costEntries = mysqlTable("cost_entries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id),
  productionOrderId: int("productionOrderId").references(
    () => productionOrders.id
  ),
  productId: int("productId").references(() => products.id),
  category: mysqlEnum("category", [
    "material",
    "mao_obra",
    "energia",
    "manutencao",
    "terceiros",
    "indireto",
    "perda",
    "outro",
  ]).notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
  occurredAt: timestamp("occurredAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BillOfMaterials = typeof billsOfMaterials.$inferSelect;
export type InsertBillOfMaterials = typeof billsOfMaterials.$inferInsert;
export type BillOfMaterialItem = typeof billOfMaterialItems.$inferSelect;
export type InsertBillOfMaterialItem = typeof billOfMaterialItems.$inferInsert;
export type ProductionOrder = typeof productionOrders.$inferSelect;
export type InsertProductionOrder = typeof productionOrders.$inferInsert;
export type CostEntry = typeof costEntries.$inferSelect;
export type InsertCostEntry = typeof costEntries.$inferInsert;

// Entidades aditivas do contrato ZIP; não substituem tabelas industriais existentes.
export const productPrices = mysqlTable("uploaded_product_prices", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id),
  tipoPlaca: varchar("tipoPlaca", { length: 255 }).notNull(),
  custoCompraCentavos: int("custoCompraCentavos").notNull(),
  precoVendaCentavos: int("precoVendaCentavos").notNull(),
  vigenteDesde: timestamp("vigenteDesde").defaultNow().notNull(),
  observacao: text("observacao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export const supplies = mysqlTable("uploaded_supplies", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id),
  nome: varchar("nome", { length: 255 }).notNull(),
  unidade: varchar("unidade", { length: 64 }).notNull(),
  custoUnitarioCentavos: int("custoUnitarioCentavos").notNull(),
  observacao: text("observacao"),
  ativo: int("ativo").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export const supplyConsumptions = mysqlTable("uploaded_supply_consumptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id),
  supplyId: int("supplyId")
    .notNull()
    .references(() => supplies.id),
  periodicidade: varchar("periodicidade", { length: 32 }).notNull(),
  quantidade: decimal("quantidade", { precision: 14, scale: 3 }).notNull(),
  custoUnitarioCentavos: int("custoUnitarioCentavos").notNull(),
  placasProduzidas: int("placasProduzidas"),
  referenciaEm: timestamp("referenciaEm").defaultNow().notNull(),
  observacao: text("observacao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export const customerLocations = mysqlTable("uploaded_customer_locations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id),
  nome: varchar("nome", { length: 255 }).notNull(),
  cep: varchar("cep", { length: 9 }),
  cidade: varchar("cidade", { length: 255 }),
  uf: varchar("uf", { length: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export const masterUnits = mysqlTable("uploaded_master_units", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id),
  codigo: varchar("codigo", { length: 32 }).notNull(),
  nome: varchar("nome", { length: 64 }).notNull(),
  casasDecimais: int("casasDecimais").notNull().default(0),
  ativo: int("ativo").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export const masterCategories = mysqlTable("uploaded_master_categories", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id),
  nome: varchar("nome", { length: 128 }).notNull(),
  ativo: int("ativo").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export const storageLocations = mysqlTable("uploaded_storage_locations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id),
  nome: varchar("nome", { length: 128 }).notNull(),
  tipo: varchar("tipo", { length: 32 }).notNull(),
  ativo: int("ativo").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/** Contratos uploaded persistidos; mantidos separados das tabelas legadas/industriais. */
export const uploadedFormulas = mysqlTable("uploaded_formulas", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id),
  produtoId: int("produtoId").notNull(),
  versao: varchar("versao", { length: 32 }).notNull(),
  status: varchar("status", { length: 16 }).notNull().default("rascunho"),
  rendimento: decimal("rendimento", { precision: 14, scale: 3 }).notNull(),
  perdaPercentual: decimal("perdaPercentual", { precision: 7, scale: 3 })
    .notNull()
    .default("0"),
  vigenteDesde: timestamp("vigenteDesde").defaultNow().notNull(),
  observacao: text("observacao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export const uploadedFormulaComponents = mysqlTable(
  "uploaded_formula_components",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id),
    formulaId: int("formulaId")
      .notNull()
      .references(() => uploadedFormulas.id),
    componenteId: int("componenteId").notNull(),
    quantidade: decimal("quantidade", { precision: 14, scale: 3 }).notNull(),
    perdaPercentual: decimal("perdaPercentual", { precision: 7, scale: 3 })
      .notNull()
      .default("0"),
    observacao: text("observacao"),
  }
);
export const uploadedProductionOrders = mysqlTable(
  "uploaded_production_orders",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id),
    codigo: varchar("codigo", { length: 64 }).notNull(),
    produtoId: int("produtoId").notNull(),
    formulaId: int("formulaId"),
    formulaSnapshot: text("formulaSnapshot"),
    status: varchar("status", { length: 16 }).notNull().default("rascunho"),
    quantidadePlanejada: decimal("quantidadePlanejada", {
      precision: 14,
      scale: 3,
    }).notNull(),
    prioridade: int("prioridade").notNull().default(3),
    observacao: text("observacao"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  }
);
export const uploadedProductionEvents = mysqlTable(
  "uploaded_production_events",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id),
    orderId: int("orderId")
      .notNull()
      .references(() => uploadedProductionOrders.id),
    evento: varchar("evento", { length: 16 }).notNull(),
    quantidade: decimal("quantidade", { precision: 14, scale: 3 }),
    chaveIdempotencia: varchar("chaveIdempotencia", { length: 128 })
      .notNull()
      .unique(),
    observacao: text("observacao"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  }
);
export const uploadedPurchaseOrders = mysqlTable("uploaded_purchase_orders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id),
  codigo: varchar("codigo", { length: 64 }).notNull(),
  supplierId: int("supplierId").notNull(),
  status: varchar("status", { length: 16 }).notNull().default("rascunho"),
  observacao: text("observacao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export const uploadedPurchaseItems = mysqlTable("uploaded_purchase_items", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id),
  orderId: int("orderId")
    .notNull()
    .references(() => uploadedPurchaseOrders.id),
  itemId: int("itemId").notNull(),
  quantidadeSolicitada: decimal("quantidadeSolicitada", {
    precision: 14,
    scale: 3,
  }).notNull(),
  quantidadeRecebida: decimal("quantidadeRecebida", { precision: 14, scale: 3 })
    .notNull()
    .default("0"),
  custoUnitarioCentavos: int("custoUnitarioCentavos").notNull(),
});
export const uploadedPurchaseReceipts = mysqlTable(
  "uploaded_purchase_receipts",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id),
    orderId: int("orderId").notNull(),
    itemId: int("itemId").notNull(),
    quantidadeRecebida: decimal("quantidadeRecebida", {
      precision: 14,
      scale: 3,
    }).notNull(),
    chaveIdempotencia: varchar("chaveIdempotencia", { length: 128 })
      .notNull()
      .unique(),
    observacao: text("observacao"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  }
);
export const uploadedQualityInspections = mysqlTable(
  "uploaded_quality_inspections",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id),
    productionOrderId: int("productionOrderId"),
    purchaseReceiptId: int("purchaseReceiptId"),
    itemId: int("itemId").notNull(),
    status: varchar("status", { length: 16 }).notNull().default("aberta"),
    criterio: text("criterio").notNull(),
    resultado: text("resultado"),
    quantidadeAmostra: decimal("quantidadeAmostra", {
      precision: 14,
      scale: 3,
    }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  }
);
export const uploadedNonConformities = mysqlTable("uploaded_non_conformities", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id),
  inspectionId: int("inspectionId")
    .notNull()
    .references(() => uploadedQualityInspections.id),
  codigo: varchar("codigo", { length: 64 }).notNull(),
  causa: text("causa"),
  acaoCorretiva: text("acaoCorretiva"),
  status: varchar("status", { length: 16 }).notNull().default("aberta"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
