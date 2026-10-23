CREATE TABLE `customer_locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`nome` varchar(255) NOT NULL,
	`cep` varchar(9),
	`cidade` varchar(255) NOT NULL,
	`uf` varchar(2) NOT NULL,
	`estado` varchar(64) NOT NULL,
	`codigoIbge` varchar(16),
	`fonteLocalizacao` enum('cep','cidade_uf','manual') NOT NULL DEFAULT 'manual',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customer_locations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `customer_locations` ADD CONSTRAINT `customer_locations_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;