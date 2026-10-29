CREATE TABLE IF NOT EXISTS `audit_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`action` varchar(64) NOT NULL,
	`entityType` varchar(64) NOT NULL,
	`entityId` int,
	`details` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `bill_of_material_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`billOfMaterialsId` int NOT NULL,
	`componentProductId` int NOT NULL,
	`quantity` decimal(14,3) NOT NULL,
	`unit` varchar(16) NOT NULL DEFAULT 'UN',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bill_of_material_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `bills_of_materials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`productId` int NOT NULL,
	`version` varchar(32) NOT NULL DEFAULT '1',
	`status` enum('rascunho','ativa','encerrada') NOT NULL DEFAULT 'rascunho',
	`yieldQuantity` decimal(14,3) NOT NULL DEFAULT '1',
	`expectedLossPercent` decimal(7,3) NOT NULL DEFAULT '0',
	`validFrom` timestamp,
	`validUntil` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bills_of_materials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `cost_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`productionOrderId` int,
	`productId` int,
	`category` enum('material','mao_obra','energia','manutencao','terceiros','indireto','perda','outro') NOT NULL,
	`description` varchar(255) NOT NULL,
	`amount` decimal(14,2) NOT NULL,
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cost_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `uploaded_customer_locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`nome` varchar(255) NOT NULL,
	`cep` varchar(9),
	`cidade` varchar(255),
	`uf` varchar(2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `uploaded_customer_locations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`document` varchar(32),
	`email` varchar(320),
	`phone` varchar(32),
	`active` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `equipment` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(64),
	`sector` varchar(128),
	`status` enum('ativo','parado','manutencao','inativo') NOT NULL DEFAULT 'ativo',
	`maintenanceIntervalDays` int,
	`lastMaintenanceAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `equipment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `finance_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('pagar','receber') NOT NULL,
	`status` enum('aberto','pago','vencido','cancelado') NOT NULL DEFAULT 'aberto',
	`description` varchar(255) NOT NULL,
	`amount` decimal(14,2) NOT NULL,
	`dueAt` timestamp NOT NULL,
	`paidAt` timestamp,
	`sourceType` varchar(64),
	`sourceId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `finance_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `maintenance_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`equipmentId` int NOT NULL,
	`type` enum('preventiva','corretiva','preditiva') NOT NULL,
	`status` enum('aberta','em_execucao','concluida','cancelada') NOT NULL DEFAULT 'aberta',
	`priority` enum('baixa','media','alta','critica') NOT NULL DEFAULT 'media',
	`description` text NOT NULL,
	`scheduledAt` timestamp,
	`completedAt` timestamp,
	`costAmount` decimal(14,2) NOT NULL DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `maintenance_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `uploaded_master_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`nome` varchar(128) NOT NULL,
	`ativo` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `uploaded_master_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `uploaded_master_units` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`codigo` varchar(32) NOT NULL,
	`nome` varchar(64) NOT NULL,
	`casasDecimais` int NOT NULL DEFAULT 0,
	`ativo` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `uploaded_master_units_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `uploaded_product_prices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tipoPlaca` varchar(255) NOT NULL,
	`custoCompraCentavos` int NOT NULL,
	`precoVendaCentavos` int NOT NULL,
	`vigenteDesde` timestamp NOT NULL DEFAULT (now()),
	`observacao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `uploaded_product_prices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `production_data` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`uploadId` int,
	`romaneio` varchar(64),
	`cliente` varchar(255) NOT NULL,
	`tipoPlaca` varchar(255) NOT NULL,
	`quantidade` int NOT NULL,
	`mes` varchar(32) NOT NULL,
	`ano` int NOT NULL,
	`pdfFileName` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `production_data_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `production_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`number` varchar(64) NOT NULL,
	`productId` int NOT NULL,
	`billOfMaterialsId` int,
	`status` enum('planejada','reservada','em_producao','pausada','concluida','cancelada') NOT NULL DEFAULT 'planejada',
	`plannedQuantity` decimal(14,3) NOT NULL,
	`producedQuantity` decimal(14,3) NOT NULL DEFAULT '0',
	`rejectedQuantity` decimal(14,3) NOT NULL DEFAULT '0',
	`plannedStartAt` timestamp,
	`plannedEndAt` timestamp,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `production_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `production_uploads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileUrl` text,
	`fileHash` varchar(64) NOT NULL,
	`status` enum('processing','completed','failed') NOT NULL DEFAULT 'processing',
	`rowsExtracted` int NOT NULL DEFAULT 0,
	`rowsRejected` int NOT NULL DEFAULT 0,
	`duplicatesAvoided` int NOT NULL DEFAULT 0,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `production_uploads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`code` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`kind` enum('acabado','intermediario','insumo','embalagem') NOT NULL,
	`unit` varchar(16) NOT NULL DEFAULT 'UN',
	`category` varchar(128),
	`minimumStock` decimal(14,3) NOT NULL DEFAULT '0',
	`maximumStock` decimal(14,3) NOT NULL DEFAULT '0',
	`reorderPoint` decimal(14,3) NOT NULL DEFAULT '0',
	`active` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `purchase_order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`purchaseOrderId` int NOT NULL,
	`productId` int NOT NULL,
	`quantity` decimal(14,3) NOT NULL,
	`receivedQuantity` decimal(14,3) NOT NULL DEFAULT '0',
	`unitPrice` decimal(14,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `purchase_order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `purchase_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`supplierId` int,
	`number` varchar(64) NOT NULL,
	`status` enum('rascunho','pendente','aprovado','parcial','recebido','cancelado') NOT NULL DEFAULT 'rascunho',
	`expectedAt` timestamp,
	`receivedAt` timestamp,
	`totalAmount` decimal(14,2) NOT NULL DEFAULT '0',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `purchase_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `quality_inspections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`productId` int,
	`lot` varchar(128),
	`inspectionType` enum('recebimento','processo','acabado','devolucao') NOT NULL,
	`status` enum('pendente','aprovado','reprovado','bloqueado') NOT NULL DEFAULT 'pendente',
	`sampleSize` decimal(14,3),
	`rejectedQuantity` decimal(14,3),
	`criteria` text,
	`result` text,
	`inspectedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quality_inspections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `sales_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`customerId` int,
	`number` varchar(64) NOT NULL,
	`status` enum('rascunho','confirmado','separacao','expedido','entregue','cancelado') NOT NULL DEFAULT 'rascunho',
	`totalAmount` decimal(14,2) NOT NULL DEFAULT '0',
	`promisedAt` timestamp,
	`deliveredAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sales_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `stock_movements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tipoPlaca` varchar(255) NOT NULL,
	`movimento` enum('entrada','saida','descarte','devolucao') NOT NULL,
	`quantidade` int NOT NULL,
	`observacao` text,
	`sourceType` varchar(64),
	`sourceId` int,
	`operationKey` varchar(128),
	`ocorridoEm` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stock_movements_id` PRIMARY KEY(`id`),
	CONSTRAINT `stock_movements_operationKey_unique` UNIQUE(`operationKey`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `uploaded_storage_locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`nome` varchar(128) NOT NULL,
	`tipo` varchar(32) NOT NULL,
	`ativo` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `uploaded_storage_locations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `suppliers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`document` varchar(32),
	`email` varchar(320),
	`phone` varchar(32),
	`paymentTerms` varchar(128),
	`active` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `suppliers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `uploaded_supplies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`nome` varchar(255) NOT NULL,
	`unidade` varchar(64) NOT NULL,
	`custoUnitarioCentavos` int NOT NULL,
	`observacao` text,
	`ativo` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `uploaded_supplies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `uploaded_supply_consumptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`supplyId` int NOT NULL,
	`periodicidade` varchar(32) NOT NULL,
	`quantidade` decimal(14,3) NOT NULL,
	`custoUnitarioCentavos` int NOT NULL,
	`placasProduzidas` int,
	`referenciaEm` timestamp NOT NULL DEFAULT (now()),
	`observacao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `uploaded_supply_consumptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `uploaded_formula_components` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`formulaId` int NOT NULL,
	`componenteId` int NOT NULL,
	`quantidade` decimal(14,3) NOT NULL,
	`perdaPercentual` decimal(7,3) NOT NULL DEFAULT '0',
	`observacao` text,
	CONSTRAINT `uploaded_formula_components_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `uploaded_formulas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`produtoId` int NOT NULL,
	`versao` varchar(32) NOT NULL,
	`status` varchar(16) NOT NULL DEFAULT 'rascunho',
	`rendimento` decimal(14,3) NOT NULL,
	`perdaPercentual` decimal(7,3) NOT NULL DEFAULT '0',
	`vigenteDesde` timestamp NOT NULL DEFAULT (now()),
	`observacao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `uploaded_formulas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `uploaded_non_conformities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`inspectionId` int NOT NULL,
	`codigo` varchar(64) NOT NULL,
	`causa` text,
	`acaoCorretiva` text,
	`status` varchar(16) NOT NULL DEFAULT 'aberta',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `uploaded_non_conformities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `uploaded_production_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`orderId` int NOT NULL,
	`evento` varchar(16) NOT NULL,
	`quantidade` decimal(14,3),
	`chaveIdempotencia` varchar(128) NOT NULL,
	`observacao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `uploaded_production_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `uploaded_production_events_chaveIdempotencia_unique` UNIQUE(`chaveIdempotencia`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `uploaded_production_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`codigo` varchar(64) NOT NULL,
	`produtoId` int NOT NULL,
	`formulaId` int,
	`formulaSnapshot` text,
	`status` varchar(16) NOT NULL DEFAULT 'rascunho',
	`quantidadePlanejada` decimal(14,3) NOT NULL,
	`prioridade` int NOT NULL DEFAULT 3,
	`observacao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `uploaded_production_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `uploaded_purchase_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`orderId` int NOT NULL,
	`itemId` int NOT NULL,
	`quantidadeSolicitada` decimal(14,3) NOT NULL,
	`quantidadeRecebida` decimal(14,3) NOT NULL DEFAULT '0',
	`custoUnitarioCentavos` int NOT NULL,
	CONSTRAINT `uploaded_purchase_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `uploaded_purchase_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`codigo` varchar(64) NOT NULL,
	`supplierId` int NOT NULL,
	`status` varchar(16) NOT NULL DEFAULT 'rascunho',
	`observacao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `uploaded_purchase_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `uploaded_purchase_receipts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`orderId` int NOT NULL,
	`itemId` int NOT NULL,
	`quantidadeRecebida` decimal(14,3) NOT NULL,
	`chaveIdempotencia` varchar(128) NOT NULL,
	`observacao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `uploaded_purchase_receipts_id` PRIMARY KEY(`id`),
	CONSTRAINT `uploaded_purchase_receipts_chaveIdempotencia_unique` UNIQUE(`chaveIdempotencia`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `uploaded_quality_inspections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`productionOrderId` int,
	`purchaseReceiptId` int,
	`itemId` int NOT NULL,
	`status` varchar(16) NOT NULL DEFAULT 'aberta',
	`criterio` text NOT NULL,
	`resultado` text,
	`quantidadeAmostra` decimal(14,3),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `uploaded_quality_inspections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `bill_of_material_items` ADD CONSTRAINT `bill_of_material_items_billOfMaterialsId_bills_of_mater_13780faa` FOREIGN KEY (`billOfMaterialsId`) REFERENCES `bills_of_materials`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bill_of_material_items` ADD CONSTRAINT `bill_of_material_items_componentProductId_products_id_fk` FOREIGN KEY (`componentProductId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bills_of_materials` ADD CONSTRAINT `bills_of_materials_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bills_of_materials` ADD CONSTRAINT `bills_of_materials_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cost_entries` ADD CONSTRAINT `cost_entries_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cost_entries` ADD CONSTRAINT `cost_entries_productionOrderId_production_orders_id_fk` FOREIGN KEY (`productionOrderId`) REFERENCES `production_orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cost_entries` ADD CONSTRAINT `cost_entries_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uploaded_customer_locations` ADD CONSTRAINT `uploaded_customer_locations_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customers` ADD CONSTRAINT `customers_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `equipment` ADD CONSTRAINT `equipment_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_entries` ADD CONSTRAINT `finance_entries_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `maintenance_records` ADD CONSTRAINT `maintenance_records_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `maintenance_records` ADD CONSTRAINT `maintenance_records_equipmentId_equipment_id_fk` FOREIGN KEY (`equipmentId`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uploaded_master_categories` ADD CONSTRAINT `uploaded_master_categories_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uploaded_master_units` ADD CONSTRAINT `uploaded_master_units_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uploaded_product_prices` ADD CONSTRAINT `uploaded_product_prices_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `production_data` ADD CONSTRAINT `production_data_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `production_data` ADD CONSTRAINT `production_data_uploadId_production_uploads_id_fk` FOREIGN KEY (`uploadId`) REFERENCES `production_uploads`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `production_orders` ADD CONSTRAINT `production_orders_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `production_orders` ADD CONSTRAINT `production_orders_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `production_orders` ADD CONSTRAINT `production_orders_billOfMaterialsId_bills_of_materials_id_fk` FOREIGN KEY (`billOfMaterialsId`) REFERENCES `bills_of_materials`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `production_uploads` ADD CONSTRAINT `production_uploads_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_purchaseOrderId_purchase_orders_id_fk` FOREIGN KEY (`purchaseOrderId`) REFERENCES `purchase_orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_supplierId_suppliers_id_fk` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quality_inspections` ADD CONSTRAINT `quality_inspections_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quality_inspections` ADD CONSTRAINT `quality_inspections_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_orders` ADD CONSTRAINT `sales_orders_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_orders` ADD CONSTRAINT `sales_orders_customerId_customers_id_fk` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uploaded_storage_locations` ADD CONSTRAINT `uploaded_storage_locations_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `suppliers` ADD CONSTRAINT `suppliers_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uploaded_supplies` ADD CONSTRAINT `uploaded_supplies_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uploaded_supply_consumptions` ADD CONSTRAINT `uploaded_supply_consumptions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uploaded_supply_consumptions` ADD CONSTRAINT `uploaded_supply_consumptions_supplyId_uploaded_supplies_id_fk` FOREIGN KEY (`supplyId`) REFERENCES `uploaded_supplies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uploaded_formula_components` ADD CONSTRAINT `uploaded_formula_components_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uploaded_formula_components` ADD CONSTRAINT `uploaded_formula_components_formulaId_uploaded_formulas_id_fk` FOREIGN KEY (`formulaId`) REFERENCES `uploaded_formulas`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uploaded_formulas` ADD CONSTRAINT `uploaded_formulas_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uploaded_non_conformities` ADD CONSTRAINT `uploaded_non_conformities_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uploaded_non_conformities` ADD CONSTRAINT `uploaded_non_conformities_inspectionId_uploaded_quality_0d7f1fbd` FOREIGN KEY (`inspectionId`) REFERENCES `uploaded_quality_inspections`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uploaded_production_events` ADD CONSTRAINT `uploaded_production_events_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uploaded_production_events` ADD CONSTRAINT `uploaded_production_events_orderId_uploaded_production__abb813a1` FOREIGN KEY (`orderId`) REFERENCES `uploaded_production_orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uploaded_production_orders` ADD CONSTRAINT `uploaded_production_orders_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uploaded_purchase_items` ADD CONSTRAINT `uploaded_purchase_items_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uploaded_purchase_items` ADD CONSTRAINT `uploaded_purchase_items_orderId_uploaded_purchase_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `uploaded_purchase_orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uploaded_purchase_orders` ADD CONSTRAINT `uploaded_purchase_orders_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uploaded_purchase_receipts` ADD CONSTRAINT `uploaded_purchase_receipts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uploaded_quality_inspections` ADD CONSTRAINT `uploaded_quality_inspections_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;