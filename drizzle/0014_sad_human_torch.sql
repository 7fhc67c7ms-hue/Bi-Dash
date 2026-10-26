CREATE TABLE `audit_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`acao` varchar(96) NOT NULL,
	`entidade` varchar(96) NOT NULL,
	`entidadeId` int,
	`dados` text,
	`ocorridoEm` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quality_inspections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`productionOrderId` int,
	`purchaseReceiptId` int,
	`itemId` int NOT NULL,
	`status` enum('aberta','aprovada','reprovada','bloqueada') NOT NULL DEFAULT 'aberta',
	`criterio` text NOT NULL,
	`resultado` text,
	`quantidadeAmostra` decimal(14,4),
	`inspecionadaEm` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quality_inspections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quality_non_conformities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`inspectionId` int NOT NULL,
	`codigo` varchar(64) NOT NULL,
	`causa` text,
	`acaoCorretiva` text,
	`status` enum('aberta','em_tratamento','encerrada') NOT NULL DEFAULT 'aberta',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quality_non_conformities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `audit_events` ADD CONSTRAINT `audit_events_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quality_inspections` ADD CONSTRAINT `quality_inspections_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quality_inspections` ADD CONSTRAINT `quality_inspections_productionOrderId_production_orders_id_fk` FOREIGN KEY (`productionOrderId`) REFERENCES `production_orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quality_inspections` ADD CONSTRAINT `quality_inspections_purchaseReceiptId_purchase_receipts_id_fk` FOREIGN KEY (`purchaseReceiptId`) REFERENCES `purchase_receipts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quality_inspections` ADD CONSTRAINT `quality_inspections_itemId_catalog_items_id_fk` FOREIGN KEY (`itemId`) REFERENCES `catalog_items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quality_non_conformities` ADD CONSTRAINT `quality_non_conformities_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quality_non_conformities` ADD CONSTRAINT `quality_non_conformities_inspectionId_quality_inspections_id_fk` FOREIGN KEY (`inspectionId`) REFERENCES `quality_inspections`(`id`) ON DELETE no action ON UPDATE no action;