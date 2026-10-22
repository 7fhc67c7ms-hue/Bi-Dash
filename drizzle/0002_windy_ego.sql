CREATE TABLE `production_uploads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileUrl` text,
	`fileHash` varchar(64) NOT NULL,
	`status` enum('processing','completed','failed') NOT NULL DEFAULT 'processing',
	`rowsExtracted` int NOT NULL DEFAULT 0,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `production_uploads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `production_data` ADD `uploadId` int;--> statement-breakpoint
ALTER TABLE `production_uploads` ADD CONSTRAINT `production_uploads_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `production_data` ADD CONSTRAINT `production_data_uploadId_production_uploads_id_fk` FOREIGN KEY (`uploadId`) REFERENCES `production_uploads`(`id`) ON DELETE no action ON UPDATE no action;