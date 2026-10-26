CREATE TABLE `formula_components` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`formulaId` int NOT NULL,
	`componenteId` int NOT NULL,
	`quantidade` decimal(14,6) NOT NULL,
	`perdaPercentual` decimal(7,4) NOT NULL DEFAULT '0',
	`observacao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `formula_components_id` PRIMARY KEY(`id`),
	CONSTRAINT `formula_components_formula_component_unique` UNIQUE(`formulaId`,`componenteId`)
);
--> statement-breakpoint
CREATE TABLE `product_formulas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`produtoId` int NOT NULL,
	`versao` int NOT NULL,
	`status` enum('rascunho','ativa','inativa') NOT NULL DEFAULT 'rascunho',
	`rendimento` decimal(12,4) NOT NULL,
	`perdaPercentual` decimal(7,4) NOT NULL DEFAULT '0',
	`vigenteDesde` timestamp NOT NULL DEFAULT (now()),
	`observacao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_formulas_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_formulas_user_product_version_unique` UNIQUE(`userId`,`produtoId`,`versao`)
);
--> statement-breakpoint
ALTER TABLE `formula_components` ADD CONSTRAINT `formula_components_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `formula_components` ADD CONSTRAINT `formula_components_formulaId_product_formulas_id_fk` FOREIGN KEY (`formulaId`) REFERENCES `product_formulas`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `formula_components` ADD CONSTRAINT `formula_components_componenteId_catalog_items_id_fk` FOREIGN KEY (`componenteId`) REFERENCES `catalog_items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_formulas` ADD CONSTRAINT `product_formulas_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_formulas` ADD CONSTRAINT `product_formulas_produtoId_catalog_items_id_fk` FOREIGN KEY (`produtoId`) REFERENCES `catalog_items`(`id`) ON DELETE no action ON UPDATE no action;