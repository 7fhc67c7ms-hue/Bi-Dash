CREATE TABLE `product_prices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tipoPlaca` varchar(255) NOT NULL,
	`custoCompraCentavos` int NOT NULL,
	`precoVendaCentavos` int NOT NULL,
	`vigenteDesde` timestamp NOT NULL DEFAULT (now()),
	`observacao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `product_prices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supplies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`nome` varchar(255) NOT NULL,
	`unidade` varchar(64) NOT NULL,
	`custoUnitarioCentavos` int NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`observacao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supplies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supply_consumptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`supplyId` int NOT NULL,
	`periodicidade` enum('diaria','semanal','por_placas') NOT NULL,
	`quantidade` decimal(12,3) NOT NULL,
	`custoUnitarioCentavos` int NOT NULL,
	`placasProduzidas` int,
	`referenciaEm` timestamp NOT NULL DEFAULT (now()),
	`observacao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supply_consumptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `product_prices` ADD CONSTRAINT `product_prices_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supplies` ADD CONSTRAINT `supplies_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supply_consumptions` ADD CONSTRAINT `supply_consumptions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supply_consumptions` ADD CONSTRAINT `supply_consumptions_supplyId_supplies_id_fk` FOREIGN KEY (`supplyId`) REFERENCES `supplies`(`id`) ON DELETE no action ON UPDATE no action;