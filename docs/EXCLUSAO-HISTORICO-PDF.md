# Exclusão do histórico de importações PDF

Cada linha do histórico de importações agora possui um botão de exclusão. O botão identifica o upload pelo ID do PDF e pede confirmação mostrando o nome do arquivo.

Ao confirmar, o backend executa uma transação protegida pelo usuário que remove:

- o registro do PDF em `production_uploads`; e
- todos os registros de `production_data` cujo `uploadId` corresponde ao PDF.

Se a transação falhar, o log e os dados permanecem juntos, evitando exclusão parcial. Outros PDFs, registros manuais de produção e movimentos de estoque não são afetados.

Após a conclusão, o dashboard invalida o histórico, os dados de produção e os analytics para que os KPIs, tabelas, rankings e gráficos reflitam imediatamente a exclusão.
