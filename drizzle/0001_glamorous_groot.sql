CREATE TABLE `production_data` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
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
ALTER TABLE `production_data` ADD CONSTRAINT `production_data_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;