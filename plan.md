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


## Atualização de arquitetura — acesso PC/iPhone

A decisão aprovada é manter o código e o backend remoto atuais, sem Google Sheets, AppSheet, reconstrução ou migração de banco. O PC continuará sendo o ponto de importação dos PDFs; o backend continuará executando a extração e armazenando os registros, permitindo que o iPhone consulte os dados com o PC desligado. O iPhone receberá uma camada PWA leve e responsiva, enquanto o estoque usará sincronização online-first: nenhuma alteração será considerada concluída antes da confirmação do backend.

Para proteger a integridade compartilhada, movimentos de estoque terão verificação de versão/`updatedAt` nas operações destrutivas e de edição, além de uma tabela de auditoria com snapshots das alterações. A publicação atual e o storage remoto serão preservados nesta etapa; qualquer migração de infraestrutura ou troca de provedor de autenticação/IA permanece fora do escopo até autorização separada.


## Atualização aprovada — preços, custos e insumos

Manter a arquitetura atual e adicionar um módulo financeiro operacional dentro do dashboard, sem substituir produção ou estoque. O módulo terá três entidades separadas: histórico de preços por tipo de placa, cadastro de insumos e lançamentos de consumo. Valores monetários serão armazenados em centavos para evitar erros de arredondamento; quantidades de insumos aceitarão casas decimais.

O histórico de preços guardará custo de compra, preço de venda e data de vigência. O cadastro de insumos guardará unidade e custo unitário. Cada consumo permitirá escolher frequência diária, semanal ou por quantidade de placas, registrar quantidade, custo unitário no momento do lançamento, período de referência e placas produzidas relacionadas. O resumo calculará faturamento estimado, custo de compra, custo de insumos, custo total, custo médio por placa e margem bruta com base nos registros do usuário.

A integração será uma nova seção acessível pelo menu lateral, reutilizando autenticação, banco remoto e padrões visuais existentes. A migração será somente aditiva e não alterará registros atuais de produção, estoque ou usuários.
