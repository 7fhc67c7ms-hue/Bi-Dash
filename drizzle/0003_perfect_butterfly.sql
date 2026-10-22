ALTER TABLE `production_uploads` ADD `rowsRejected` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `production_uploads` ADD `duplicatesAvoided` int DEFAULT 0 NOT NULL;