# Plano de atualização — BI Produção

## Escopo

Implementar quatro melhorias no aplicativo existente: ampliar os movimentos do estoque com descarte e devolução; criar impressão nativa pelo navegador com `Ctrl+P`; permitir selecionar visualmente uma área da tela com o mouse e imprimir somente os blocos selecionados; e oferecer modo claro branco como padrão, preservando os botões, gráficos e cores de destaque.

## Abordagem de implementação

- **Estoque:** ampliar o enum persistido para `entrada`, `saida`, `descarte` e `devolucao`. Somente entradas aumentam o saldo; saídas, descartes e devoluções reduzem o saldo. A análise exibirá os quatro totais e o histórico usará rótulos/cores distintos.
- **Impressão:** adicionar um controlador global no layout do dashboard. O botão ativa o modo de seleção; arrastar com o mouse marca os blocos visíveis que intersectam o retângulo; `Ctrl+P` usa `window.print()` com CSS de impressão, ocultando navegação, filtros/controles e tudo que não foi selecionado. Sem seleção, `Ctrl+P` imprime a página/área ativa em fundo branco.
- **Modo claro:** habilitar `ThemeProvider` como alternável e iniciar em `light`; manter o dark mode disponível no menu do painel. As cores dos gráficos e botões permanecem as mesmas. Regras `@media print` forçam branco, texto escuro e bordas leves.
- **Compatibilidade:** adicionar migration SQL compatível com a tabela já existente e manter os movimentos antigos válidos. Atualizar testes unitários do cálculo de saldo e executar typecheck, testes e build.

## Estrutura relevante

- `drizzle/schema.ts` e `drizzle/0005_stock_movement_types.sql`: contrato e migração do enum de estoque.
- `server/routers.ts`, `server/stock.ts`, `server/stock.test.ts`: validação, persistência e saldo.
- `client/src/components/StockManagement.tsx`: formulário, resumo e histórico.
- `client/src/components/PrintSelection.tsx`: seleção visual, impressão e atalhos.
- `client/src/components/DashboardLayout.tsx` e `DashboardContent.tsx`: integração global do modo de impressão/tema.
- `client/src/index.css` e `App.tsx`: tema claro e regras de impressão.
