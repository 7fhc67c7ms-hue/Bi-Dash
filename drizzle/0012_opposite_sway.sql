CREATE TABLE `production_order_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`orderId` int NOT NULL,
	`evento` enum('criada','planejada','iniciada','pausada','retomada','produzida','aprovada','rejeitada','concluida','cancelada') NOT NULL,
	`quantidade` decimal(14,4),
	`chaveIdempotencia` varchar(128) NOT NULL,
	`observacao` text,
	`ocorridoEm` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `production_order_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `production_order_events_user_key_unique` UNIQUE(`userId`,`chaveIdempotencia`)
);
--> statement-breakpoint
CREATE TABLE `production_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`codigo` varchar(64) NOT NULL,
	`produtoId` int NOT NULL,
	`formulaId` int,
	`formulaSnapshot` text,
	`status` enum('rascunho','planejada','em_producao','pausada','concluida','cancelada') NOT NULL DEFAULT 'rascunho',
	`quantidadePlanejada` decimal(14,4) NOT NULL,
	`quantidadeIniciada` decimal(14,4) NOT NULL DEFAULT '0',
	`quantidadeProduzida` decimal(14,4) NOT NULL DEFAULT '0',
	`quantidadeAprovada` decimal(14,4) NOT NULL DEFAULT '0',
	`quantidadeRejeitada` decimal(14,4) NOT NULL DEFAULT '0',
	`prioridade` int NOT NULL DEFAULT 3,
	`setorId` int,
	`responsavel` varchar(255),
	`planejadaPara` timestamp,
	`prazoEm` timestamp,
	`observacao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `production_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `production_orders_user_code_unique` UNIQUE(`userId`,`codigo`)
);
--> statement-breakpoint
ALTER TABLE `production_order_events` ADD CONSTRAINT `production_order_events_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `production_order_events` ADD CONSTRAINT `production_order_events_orderId_production_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `production_orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `production_orders` ADD CONSTRAINT `production_orders_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `production_orders` ADD CONSTRAINT `production_orders_produtoId_catalog_items_id_fk` FOREIGN KEY (`produtoId`) REFERENCES `catalog_items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `production_orders` ADD CONSTRAINT `production_orders_formulaId_product_formulas_id_fk` FOREIGN KEY (`formulaId`) REFERENCES `product_formulas`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `production_orders` ADD CONSTRAINT `production_orders_setorId_storage_locations_id_fk` FOREIGN KEY (`setorId`) REFERENCES `storage_locations`(`id`) ON DELETE no action ON UPDATE no action;