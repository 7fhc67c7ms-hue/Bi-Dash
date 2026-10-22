# Handoff de publicação

O código está pronto para uma publicação independente, mas o endereço público definitivo precisa ser confirmado no projeto WebDev antes de gerar o instalador final. O preview temporário do Sandbox não deve ser embutido no `.exe` porque pode expirar.

## Estado atual

- Código sincronizado na branch `main`.
- Projeto WebDev full-stack criado e validado.
- Banco novo com `stock_movements` aplicado.
- Controle de estoque e análise por cliente presentes no preview.
- Instalador preparado para ler `desktop/dashboard-config.json`.

## Próxima ação de publicação

1. Publicar o projeto WebDev a partir do checkpoint mais recente.
2. Confirmar a URL pública definitiva.
3. Se houver domínio próprio, apontar o DNS para essa publicação e validar HTTPS.
4. Executar `node desktop/update-dashboard-url.cjs <URL-DEFINITIVA>`.
5. Incrementar a versão, executar testes/build e gerar NSIS e portátil.
6. Fazer um novo commit contendo a URL e os hashes dos artefatos.

Não é seguro concluir a etapa do instalador enquanto a URL pública definitiva não estiver disponível, pois o aplicativo Windows carregaria o endereço antigo ou um preview temporário.
