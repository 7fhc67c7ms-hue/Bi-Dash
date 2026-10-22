ALTER TABLE `stock_movements`
  MODIFY COLUMN `movimento` enum('entrada','saida','descarte','devolucao') NOT NULL;
