CREATE TABLE `stock_movements` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `tipoPlaca` varchar(255) NOT NULL,
  `movimento` enum('entrada','saida') NOT NULL,
  `quantidade` int NOT NULL,
  `observacao` text,
  `ocorridoEm` timestamp NOT NULL DEFAULT (now()),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `stock_movements_id` PRIMARY KEY(`id`),
  CONSTRAINT `stock_movements_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action
);
