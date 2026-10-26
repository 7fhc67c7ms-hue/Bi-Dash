CREATE TABLE `catalog_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`codigo` varchar(64) NOT NULL,
	`nome` varchar(255) NOT NULL,
	`tipo` enum('produto_acabado','intermediario','em_processo','materia_prima','insumo','componente','embalagem') NOT NULL,
	`unidadeId` int NOT NULL,
	`categoriaId` int,
	`tipoPlacaLegado` varchar(255),
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `catalog_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `catalog_items_user_code_unique` UNIQUE(`userId`,`codigo`)
);
--> statement-breakpoint
CREATE TABLE `master_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`nome` varchar(128) NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `master_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `master_categories_user_name_unique` UNIQUE(`userId`,`nome`)
);
--> statement-breakpoint
CREATE TABLE `master_units` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`codigo` varchar(32) NOT NULL,
	`nome` varchar(64) NOT NULL,
	`casasDecimais` int NOT NULL DEFAULT 0,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `master_units_id` PRIMARY KEY(`id`),
	CONSTRAINT `master_units_user_code_unique` UNIQUE(`userId`,`codigo`)
);
--> statement-breakpoint
CREATE TABLE `storage_locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`nome` varchar(128) NOT NULL,
	`tipo` enum('deposito','setor','localizacao') NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `storage_locations_id` PRIMARY KEY(`id`),
	CONSTRAINT `storage_locations_user_name_type_unique` UNIQUE(`userId`,`nome`,`tipo`)
);
--> statement-breakpoint
ALTER TABLE `catalog_items` ADD CONSTRAINT `catalog_items_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `catalog_items` ADD CONSTRAINT `catalog_items_unidadeId_master_units_id_fk` FOREIGN KEY (`unidadeId`) REFERENCES `master_units`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `catalog_items` ADD CONSTRAINT `catalog_items_categoriaId_master_categories_id_fk` FOREIGN KEY (`categoriaId`) REFERENCES `master_categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `master_categories` ADD CONSTRAINT `master_categories_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `master_units` ADD CONSTRAINT `master_units_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `storage_locations` ADD CONSTRAINT `storage_locations_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;