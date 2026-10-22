# Matriz de requisitos — BI de Produção

Esta matriz consolida integralmente os requisitos de `/home/ubuntu/upload/pasted_content.txt`. Todos os cálculos usam os campos reais do schema (`ano`, `mes`, `cliente`, `tipoPlaca`, `quantidade` e `romaneio`). O schema não possui uma data diária; nenhuma data foi inferida.

| Grupo | Requisito | Implementação visível/utilizável | Motor/API | Cobertura |
|---|---|---|---|---|
| Painel executivo | Total, clientes, média, mediana, mínimo, máximo, desvio, média mensal, tipos, produto estrela, maior cliente, concentração e variação | Área **Dashboard**, com cards rastreáveis, linha mensal e donut de concentração | `calcularMetricasExecutivas`, `analisarConcentracao` | `analytics.test.ts`, `biCapabilities.test.ts` |
| Limitação diária | Média diária/semanal, dias com/sem produção somente se houver DATA | Cards e botões Dia/Semana mostram **Indisponível** e explicam a limitação | Campos `null` e `dadosDiariosDisponiveis=false` | `biCapabilities.test.ts` |
| Clientes | Seleção múltipla independente e comparação entre clientes | Checkboxes próprios da área **Clientes**, tabela lado a lado e gráfico multissérie | `analisarClientes` | `analytics.test.ts`, `biCapabilities.test.ts` |
| Cliente individual | Total, tipos, maior/menor tipo, médias, participação, histórico, maior/menor mês, crescimento e ranking | Drill-down selecionável, cards, histórico mensal/anual e mix por tipo | `analisarClientes` | `biCapabilities.test.ts` |
| Cliente × tipo | Matriz de volumes por cliente e modelo | Tabela **Matriz cliente × tipo** | `criarMatrizClienteTipo` | `biCapabilities.test.ts` |
| Tipos | Total, clientes, média, maior/menor cliente, participação, evolução, ranking e comparação | Área **Tipos**, seletor de drill-down, cards, tabela e linha mensal/anual | `analisarTipos` | `analytics.test.ts`, `biCapabilities.test.ts` |
| Período A × B | Ano e intervalo de meses independentes para A e B | Dois fieldsets reais com ano, mês inicial e mês final | `compararPeriodos` | `analytics.test.ts`, `biCapabilities.test.ts` |
| Comparação completa | Produção, médias, clientes, tipos, maior cliente, tipo principal, diferenças | Cards, tabela comparativa e barras agrupadas | `resumoDoPeriodo`, `compararPeriodos` | `biCapabilities.test.ts` |
| Movimentação da carteira | Novos, perdidos, recorrentes, reativados, aumentaram e diminuíram | Cards e tabelas da área **Comparações** | histórico anterior ao período A + `alteracoesPorEntidade` | `biCapabilities.test.ts` |
| Mudanças de produção | Tipos aumentaram/diminuíram, concentração e mix alterados | Tabelas de tipos e categorias com variação em pontos percentuais | `compararPeriodos` | `biCapabilities.test.ts` |
| Ano a ano | Anos completos e mesmos meses entre anos | Seletores A/B aceitam anos diferentes e intervalos iguais ou distintos | `dentroDoPeriodo` usa `ano` real | `biCapabilities.test.ts` |
| Crescimento/queda | Crescimento, redução, estável, novo, sem produção recente e alto crescimento | Área **Estatísticas** com tabela categorizada e legenda dos limiares | `classificarCrescimento` | teste de todas as seis categorias e fronteiras |
| Concentração | Participação por cliente, Top 5 e demais | Donut e tabela de participações; cards Top 5/demais | `analisarConcentracao` | `biCapabilities.test.ts` |
| Mix | Categorias RET/OVAL/QUAD e detalhamento por modelo | Pizza e tabela hierárquica categoria/modelo | `categoriaTipoPlaca`, `analisarMixCategorias` | `biCapabilities.test.ts` |
| Estatística | Médias geral/mensal/cliente/tipo, mediana, mínimo, máximo e desvio padrão | Área **Estatísticas** e PDF | `calcularMetricasExecutivas` | `analytics.test.ts`, `biCapabilities.test.ts` |
| Rankings | Clientes, tipos, crescimento e redução, com período/métrica | Seletores de entidade e métrica; período vem dos filtros globais | `analisarClientes`, `analisarTipos` | `biCapabilities.test.ts` |
| Gráficos | Linha, barras, agrupadas, donut/pizza, área acumulada e heatmap | Recharts nas áreas Dashboard/Produção/Comparações/Evolução e heatmap em Histórico | séries analíticas filtradas | build TypeScript/Vite |
| Evolução | Mensal, acumulado do ano e sazonalidade multi-ano | Área **Evolução**, área acumulada, linhas por ano e tabela sazonal | `analisarAcumulado`, `analisarSazonalidade` | `biCapabilities.test.ts` |
| Filtros | Mês, trimestre, semestre, ano, personalizado, clientes, tipos, comparação A/B | Presets e checkboxes de mês/ano/tipo; cliente incluir/excluir; A/B independente | `analyticsInput`, `filterProductionData` | `filters.test.ts` |
| Modos | Explorar e Relatório | Alternador no topo; Relatório abre automaticamente sua configuração | estado `analysisMode` | TypeScript/build |
| Texto automático | Relatório descritivo somente com dados | Bloco determinístico na área **Relatórios** | `gerarRelatorioDeterministico` | `analytics.test.ts`, `biCapabilities.test.ts` |
| PDF | Capa, resumo, evolução, clientes, tipos, comparação, detalhes, conclusões e opções | PDF multipágina e cinco opções de conteúdo | `downloadProductionAnalysisPdf` | TypeScript/build |
| Exportação | Manter exportações, CSV e Excel compatível | Área **Exportação** e botões no cabeçalho; HTML legado preservado | registros retornados por `getData` com filtros globais | TypeScript/build |
| Navegação | Dashboard, Produção, Clientes, Tipos, Comparações, Evolução, Estatísticas, Rankings, Histórico, Relatórios e Exportação | Navegação horizontal no workspace e atalhos na sidebar, exibindo uma área por vez | evento local `bi:navigate` | TypeScript/build |
| Compatibilidade | Preservar APIs e funções existentes | Campos e componentes anteriores foram mantidos; a API só recebeu campos aditivos | rotas tRPC existentes mantidas | suíte legada completa |

## Limiares analíticos

As categorias são determinísticas. **Estável** corresponde a variação percentual absoluta de até 5%, inclusive. **Crescimento** é maior que 5%; **alto crescimento**, maior ou igual a 50%; **redução**, menor que -5%; **novo**, produção zero em A e positiva em B; **sem produção recente**, produção positiva em A e zero em B. Clientes reativados são clientes presentes em B, ausentes em A e com produção anterior ao início de A.

## Regra de filtros

Filtros globais de clientes (inclusão/exclusão), tipos e segmento são aplicados tanto ao modo exploratório quanto à comparação A/B. Mês e ano do modo exploratório filtram indicadores, gráficos, tabelas, CSV e Excel. A comparação A/B usa seus próprios anos e intervalos de meses sobre o histórico completo, evitando que o filtro exploratório elimine um dos lados da comparação.
