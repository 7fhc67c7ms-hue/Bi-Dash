# Bloco 1 — Integridade do núcleo e importação idempotente

## Escopo

Este bloco protege a importação de PDFs existente contra duplicidade por corrida entre dispositivos e torna a finalização dos registros importados atômica. Nenhum registro existente foi apagado ou consolidado.

## Auditoria prévia

Antes de criar a restrição, foi executada uma consulta somente leitura no banco centralizado. O resultado foi de 9 uploads e nenhuma duplicidade em `(userId, fileHash)`. A migração, portanto, é compatível com os dados observados.

## Alterações

A tabela `production_uploads` recebeu a restrição única composta `production_uploads_user_file_hash_unique` sobre `userId` e `fileHash`, registrada em `drizzle/0009_dear_mathemanic.sql`.

O fluxo de importação passou a usar `claimProductionUpload`. A primeira requisição cria o upload em processamento. Uma requisição concorrente do mesmo arquivo encontra a restrição do banco e retorna o upload já existente, sem inserir novamente. Uploads com falha podem ser reprocessados; nesse caso, o status é resetado e registros parciais associados à tentativa anterior são removidos dentro da mesma transação de reserva.

A etapa final usa `completeProductionUpload`, que remove qualquer resíduo associado, insere as linhas extraídas e atualiza o status, os contadores e a mensagem de erro em uma única transação. Se a extração falhar antes dessa etapa, o upload é marcado como `failed` pelo fluxo já existente.

As chaves novas de armazenamento usam o hash do PDF e o nome sanitizado. Isso evita múltiplos objetos para novas tentativas do mesmo conteúdo, sem renomear ou apagar objetos históricos.

A migração implícita de colunas em `server/db.ts` foi removida. As colunas já existentes permanecem formalizadas no histórico Drizzle pelas migrações anteriores; alterações futuras devem ser feitas por migração controlada.

## Validação

- Consulta pré-migração: concluída, sem duplicidades.
- `pnpm check`: passou.
- `pnpm test`: passou com 12 arquivos e 55 testes.
- `pnpm build`: passou.
- Migração: aditiva, sem `DROP`, `DELETE` ou recriação de tabela.

## Pendência conhecida

Ainda falta executar um teste de integração contra um banco isolado que provoque duas requisições concorrentes e uma falha parcial real. A implementação foi preparada para esse cenário, mas a suíte atual não cria um banco temporário automaticamente. O bloco não deve ser apresentado como cobertura completa de concorrência até esse teste ser adicionado.
