CREATE TABLE `purchase_order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`purchaseOrderId` int NOT NULL,
	`itemId` int NOT NULL,
	`quantidadeSolicitada` decimal(14,4) NOT NULL,
	`quantidadeRecebida` decimal(14,4) NOT NULL DEFAULT '0',
	`custoUnitarioCentavos` int NOT NULL,
	CONSTRAINT `purchase_order_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `purchase_order_items_order_item_unique` UNIQUE(`purchaseOrderId`,`itemId`)
);
--> statement-breakpoint
CREATE TABLE `purchase_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`codigo` varchar(64) NOT NULL,
	`supplierId` int NOT NULL,
	`status` enum('rascunho','solicitado','aprovado','parcial','recebido','cancelado') NOT NULL DEFAULT 'rascunho',
	`observacao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `purchase_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `purchase_orders_user_code_unique` UNIQUE(`userId`,`codigo`)
);
--> statement-breakpoint
CREATE TABLE `purchase_receipts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`purchaseOrderId` int NOT NULL,
	`itemId` int NOT NULL,
	`quantidadeRecebida` decimal(14,4) NOT NULL,
	`chaveIdempotencia` varchar(128) NOT NULL,
	`status` enum('confirmado','cancelado') NOT NULL DEFAULT 'confirmado',
	`observacao` text,
	`recebidoEm` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `purchase_receipts_id` PRIMARY KEY(`id`),
	CONSTRAINT `purchase_receipts_user_key_unique` UNIQUE(`userId`,`chaveIdempotencia`)
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`codigo` varchar(64) NOT NULL,
	`nome` varchar(255) NOT NULL,
	`documento` varchar(32),
	`contato` varchar(255),
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `suppliers_id` PRIMARY KEY(`id`),
	CONSTRAINT `suppliers_user_code_unique` UNIQUE(`userId`,`codigo`)
);
--> statement-breakpoint
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_purchaseOrderId_purchase_orders_id_fk` FOREIGN KEY (`purchaseOrderId`) REFERENCES `purchase_orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_itemId_catalog_items_id_fk` FOREIGN KEY (`itemId`) REFERENCES `catalog_items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_supplierId_suppliers_id_fk` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_receipts` ADD CONSTRAINT `purchase_receipts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_receipts` ADD CONSTRAINT `purchase_receipts_purchaseOrderId_purchase_orders_id_fk` FOREIGN KEY (`purchaseOrderId`) REFERENCES `purchase_orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_receipts` ADD CONSTRAINT `purchase_receipts_itemId_catalog_items_id_fk` FOREIGN KEY (`itemId`) REFERENCES `catalog_items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `suppliers` ADD CONSTRAINT `suppliers_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;