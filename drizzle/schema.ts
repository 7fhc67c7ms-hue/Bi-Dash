import { boolean, decimal, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

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
  userId: int("userId").notNull().references(() => users.id),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileUrl: text("fileUrl"),
  fileHash: varchar("fileHash", { length: 64 }).notNull(),
  status: mysqlEnum("status", ["processing", "completed", "failed"]).default("processing").notNull(),
  rowsExtracted: int("rowsExtracted").default(0).notNull(),
  rowsRejected: int("rowsRejected").default(0).notNull(),
  duplicatesAvoided: int("duplicatesAvoided").default(0).notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  userFileHashUnique: uniqueIndex("production_uploads_user_file_hash_unique").on(table.userId, table.fileHash),
}));

export const productionData = mysqlTable("production_data", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
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
  userId: int("userId").notNull().references(() => users.id),
  tipoPlaca: varchar("tipoPlaca", { length: 255 }).notNull(),
  movimento: mysqlEnum("movimento", ["entrada", "saida", "descarte", "devolucao"]).notNull(),
  quantidade: int("quantidade").notNull(),
  observacao: text("observacao"),
  ocorridoEm: timestamp("ocorridoEm").defaultNow().notNull(),
  version: int("version").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StockMovement = typeof stockMovements.$inferSelect;
export type InsertStockMovement = typeof stockMovements.$inferInsert;
export type StockMovementKind = "entrada" | "saida" | "descarte" | "devolucao";

/** Snapshot imutável de cada alteração feita no estoque. */
export const stockMovementAudit = mysqlTable("stock_movement_audit", {
  id: int("id").autoincrement().primaryKey(),
  movementId: int("movementId").notNull(),
  userId: int("userId").notNull().references(() => users.id),
  acao: mysqlEnum("acao", ["create", "update", "delete"]).notNull(),
  tipoPlaca: varchar("tipoPlaca", { length: 255 }).notNull(),
  movimento: mysqlEnum("movimento", ["entrada", "saida", "descarte", "devolucao"]).notNull(),
  quantidade: int("quantidade").notNull(),
  observacao: text("observacao"),
  ocorridoEm: timestamp("ocorridoEm").notNull(),
  registradoEm: timestamp("registradoEm").defaultNow().notNull(),
});

export type StockMovementAudit = typeof stockMovementAudit.$inferSelect;
export type InsertStockMovementAudit = typeof stockMovementAudit.$inferInsert;

/** Histórico de preço por tipo de placa; cada lançamento preserva sua vigência. */
export const productPrices = mysqlTable("product_prices", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  tipoPlaca: varchar("tipoPlaca", { length: 255 }).notNull(),
  custoCompraCentavos: int("custoCompraCentavos").notNull(),
  precoVendaCentavos: int("precoVendaCentavos").notNull(),
  vigenteDesde: timestamp("vigenteDesde").defaultNow().notNull(),
  observacao: text("observacao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProductPrice = typeof productPrices.$inferSelect;
export type InsertProductPrice = typeof productPrices.$inferInsert;

/** Cadastro de materiais consumidos pelo setor. */
export const supplies = mysqlTable("supplies", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  nome: varchar("nome", { length: 255 }).notNull(),
  unidade: varchar("unidade", { length: 64 }).notNull(),
  custoUnitarioCentavos: int("custoUnitarioCentavos").notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  observacao: text("observacao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Supply = typeof supplies.$inferSelect;
export type InsertSupply = typeof supplies.$inferInsert;

/** Lançamentos de consumo com frequência diária, semanal ou por placas. */
export const supplyConsumptions = mysqlTable("supply_consumptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  supplyId: int("supplyId").notNull().references(() => supplies.id),
  periodicidade: mysqlEnum("periodicidade", ["diaria", "semanal", "por_placas"]).notNull(),
  quantidade: decimal("quantidade", { precision: 12, scale: 3 }).notNull(),
  custoUnitarioCentavos: int("custoUnitarioCentavos").notNull(),
  placasProduzidas: int("placasProduzidas"),
  referenciaEm: timestamp("referenciaEm").defaultNow().notNull(),
  observacao: text("observacao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SupplyConsumption = typeof supplyConsumptions.$inferSelect;
export type InsertSupplyConsumption = typeof supplyConsumptions.$inferInsert;

/** Cadastro geográfico resumido dos clientes, sem exigir endereço completo. */
export const customerLocations = mysqlTable("customer_locations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  nome: varchar("nome", { length: 255 }).notNull(),
  cep: varchar("cep", { length: 9 }),
  cidade: varchar("cidade", { length: 255 }).notNull(),
  uf: varchar("uf", { length: 2 }).notNull(),
  estado: varchar("estado", { length: 64 }).notNull(),
  codigoIbge: varchar("codigoIbge", { length: 16 }),
  fonteLocalizacao: mysqlEnum("fonteLocalizacao", ["cep", "cidade_uf", "manual"]).default("manual").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CustomerLocation = typeof customerLocations.$inferSelect;
export type InsertCustomerLocation = typeof customerLocations.$inferInsert;

/** Unidade de medida controlada por usuário, com precisão explícita. */
export const masterUnits = mysqlTable("master_units", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  codigo: varchar("codigo", { length: 32 }).notNull(),
  nome: varchar("nome", { length: 64 }).notNull(),
  casasDecimais: int("casasDecimais").default(0).notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  userCodeUnique: uniqueIndex("master_units_user_code_unique").on(table.userId, table.codigo),
}));

export type MasterUnit = typeof masterUnits.$inferSelect;
export type InsertMasterUnit = typeof masterUnits.$inferInsert;

/** Categorias/famílias usadas para organizar itens sem duplicar o cadastro textual legado. */
export const masterCategories = mysqlTable("master_categories", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  nome: varchar("nome", { length: 128 }).notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  userNameUnique: uniqueIndex("master_categories_user_name_unique").on(table.userId, table.nome),
}));

export type MasterCategory = typeof masterCategories.$inferSelect;
export type InsertMasterCategory = typeof masterCategories.$inferInsert;

export const catalogItems = mysqlTable("catalog_items", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  codigo: varchar("codigo", { length: 64 }).notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  tipo: mysqlEnum("tipo", ["produto_acabado", "intermediario", "em_processo", "materia_prima", "insumo", "componente", "embalagem"]).notNull(),
  unidadeId: int("unidadeId").notNull().references(() => masterUnits.id),
  categoriaId: int("categoriaId").references(() => masterCategories.id),
  tipoPlacaLegado: varchar("tipoPlacaLegado", { length: 255 }),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  userCodeUnique: uniqueIndex("catalog_items_user_code_unique").on(table.userId, table.codigo),
}));

export type CatalogItem = typeof catalogItems.$inferSelect;
export type InsertCatalogItem = typeof catalogItems.$inferInsert;

export const storageLocations = mysqlTable("storage_locations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  nome: varchar("nome", { length: 128 }).notNull(),
  tipo: mysqlEnum("tipo", ["deposito", "setor", "localizacao"]).notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  userNameTypeUnique: uniqueIndex("storage_locations_user_name_type_unique").on(table.userId, table.nome, table.tipo),
}));

export type StorageLocation = typeof storageLocations.$inferSelect;
export type InsertStorageLocation = typeof storageLocations.$inferInsert;
