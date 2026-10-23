import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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
});

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
