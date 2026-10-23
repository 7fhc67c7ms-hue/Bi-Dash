CREATE TABLE `stock_movement_audit` (
	`id` int AUTO_INCREMENT NOT NULL,
	`movementId` int NOT NULL,
	`userId` int NOT NULL,
	`acao` enum('create','update','delete') NOT NULL,
	`tipoPlaca` varchar(255) NOT NULL,
	`movimento` enum('entrada','saida','descarte','devolucao') NOT NULL,
	`quantidade` int NOT NULL,
	`observacao` text,
	`ocorridoEm` timestamp NOT NULL,
	`registradoEm` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stock_movement_audit_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `stock_movements` ADD `version` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `stock_movement_audit` ADD CONSTRAINT `stock_movement_audit_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;