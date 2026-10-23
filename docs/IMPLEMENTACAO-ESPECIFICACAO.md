# Implementação da especificação — BI Produção

**Data da auditoria:** 22 de outubro de 2026  
**Especificação avaliada:** Construção do BI Produção — Fotoporcelana, arquivo recebido nesta tarefa.

## Resultado executivo

O projeto já possui uma aplicação web funcional, com frontend responsivo, backend, banco de dados persistente, autenticação, storage de PDFs, extração assistida por IA, análise de produção, controle de estoque, relatórios, exportações, impressão e empacotamento Windows.

Nesta etapa foi corrigida a principal lacuna encontrada na auditoria: o componente de chat deixou de ser apenas uma demonstração da página de componentes e passou a existir dentro do dashboard como **Assistente do BI**, com uma rota protegida no backend. O assistente recebe o recorte filtrado atual, KPIs, principais clientes, principais tipos, mix, concentração, comparação e relatório determinístico. Ele foi instruído a não inventar dados financeiros, datas diárias, capacidade ou saldo de estoque quando essas informações não estiverem no contexto.

A implementação do chat não persiste conversas. As mensagens ficam na sessão da tela e são enviadas ao backend somente durante a consulta. A persistência de histórico de conversas não faz parte da especificação de dados atual.

## Matriz de conformidade

| Requisito | Situação | Evidência ou observação |
|---|---|---|
| Dashboard executivo | Implementado | KPIs, cards, gráficos, concentração e evolução em `DashboardContent` e `BIWorkspace` |
| Importação de romaneio em PDF | Implementado | Upload protegido, limite de 15 MB, storage e processamento no backend |
| Extração assistida por IA | Implementado | `server/pdfExtraction.ts` usa `invokeLLM` com schema estruturado |
| Validação, normalização e deduplicação | Implementado | Meses, anos, quantidade, aliases e chave de deduplicação por linha |
| Histórico e erros de importação | Implementado | Status, válidas, rejeitadas, duplicados e mensagem de erro |
| Cadastro, edição, consulta e exclusão | Implementado | Gestão manual de registros em `ProductionRecords` |
| Filtros globais | Implementado | Mês, ano, cliente incluir/excluir, tipo e segmento |
| Análise de produção | Implementado | Tabela, evolução, KPIs e séries analíticas |
| Análise individual de clientes | Implementado | Módulo separado com meses, mix e romaneios |
| Análise comparativa de clientes | Implementado | Comparação de clientes, rankings e matriz cliente × tipo |
| Análise de tipos e categorias | Implementado | Totais, clientes, participação, ranking, evolução e mix |
| Comparação entre períodos | Implementado | Períodos A/B independentes, novos, perdidos, recorrentes e reativados |
| Evolução, estatísticas e rankings | Implementado | Séries mensais/anuais, acumulado, sazonalidade e classificações |
| Controle de estoque | Implementado | Entrada, saída, descarte, devolução, saldo e histórico |
| Reposição de estoque | Implementado | Média mensal, cobertura configurável e necessidade de reposição |
| PDF, CSV, Excel e HTML | Implementado | Exportadores no dashboard e relatório PDF multipágina |
| Impressão e seleção de área | Implementado | `Ctrl+P`, impressão nativa e seleção visual por blocos |
| Inteligência de mercado | Implementado como contexto | Fontes públicas identificadas e hipóteses separadas dos dados internos |
| Chat com IA integrado | Implementado nesta etapa | Rota `assistant.chat` protegida e componente no dashboard com contexto real |
| Autenticação e isolamento | Implementado | OAuth, cookie de sessão, procedimentos protegidos e `userId` nas tabelas |
| Responsividade | Implementado | Layout responsivo, viewport de iPhone validado e modo claro/escuro |
| Desktop Windows | Implementado | Electron Builder com NSIS e portátil; app aponta para o dashboard web |
| Banco centralizado | Implementado | Drizzle/MySQL no backend publicado |
| Dados entre dispositivos | Implementado | Registros são enviados ao backend, não ficam apenas no navegador |
| Testes automatizados | Implementado | Suíte Vitest com 53 testes após o teste do assistente |

## Arquitetura entregue

O frontend é React 19 com TypeScript, Vite, Tailwind e componentes Radix. Os gráficos usam Recharts. A comunicação frontend-backend usa tRPC com validação Zod.

O backend é Node/Express com tRPC. O acesso aos dados usa Drizzle ORM e MySQL gerenciado. PDFs são colocados em storage de objetos antes de serem enviados ao extrator de IA. A autenticação usa sessão Manus OAuth e cookie seguro para HTTPS/iframe.

As rotas de domínio são protegidas por usuário. A regra de isolamento não depende de um filtro enviado pelo navegador: as queries e mutations recebem o usuário autenticado no contexto do backend e usam esse identificador nas operações de produção, importação, análise e estoque.

O projeto também contém um `Dockerfile`, configuração de build/publicação, manifesto `manus-routes.json`, identidade visual e configuração do executável Windows.

## Assistente do BI

A nova rota é `assistant.chat`. Ela aceita no máximo 12 mensagens, com conteúdo limitado, e um contexto analítico limitado a 16.000 caracteres. A rota não aceita chamadas públicas: exige usuário autenticado.

O contexto enviado inclui:

- descrição dos filtros atuais;
- produção total, pedidos, média e produto estrela;
- métricas executivas;
- qualidade da importação;
- até dez principais clientes;
- até dez principais tipos;
- concentração;
- mix de categorias;
- comparação A/B;
- relatório determinístico.

O saldo de estoque não é inventado: a interface informa que o estoque é módulo separado e não é incluído automaticamente no contexto da conversa. Essa decisão evita que o assistente misture produção e estoque sem uma consulta de estoque explicitamente integrada.

A tela oferece perguntas sugeridas e exibe respostas em Markdown. Erros de rede ou de serviço aparecem como mensagem de erro no dashboard.

## Integrações Google: avaliação e decisão

Drive, Planilhas e Docs podem ser úteis para:

- arquivar cópias de relatórios;
- compartilhar exportações CSV/Excel;
- gerar documentos operacionais;
- armazenar uma cópia externa de relatórios fechados.

No entanto, a base central do BI não deve ser substituída por uma Planilha. O sistema possui relacionamentos, deduplicação por hash, isolamento por usuário, histórico de importação, estoque e cálculos que precisam continuar no banco da aplicação.

A configuração atual não possui uma autorização Google Workspace habilitada. O conector **Google Workspace** aparece como disponível, mas está desabilitado e não há indicação de uma conta Google autorizada nesta sessão. Portanto, nenhuma integração Google foi simulada como ativa.

A decisão de implementação é:

1. manter o banco e o storage do BI como fonte oficial;
2. manter CSV, Excel, PDF e HTML como exportações locais já funcionais;
3. adicionar Drive/Sheets/Docs somente como exportação ou arquivamento opcional, após autorização explícita da conta;
4. não criar uma cópia automática sem definir pasta destino, permissões, retenção e política de duplicação;
5. nunca colocar credenciais Google no frontend.

Para ativar uma futura integração, será necessário autorizar o conector Google Workspace e definir, no mínimo, a conta, a pasta de destino, o comportamento para relatórios repetidos e se a exportação será manual ou automática. Enquanto isso não for autorizado, os botões locais do BI continuam sendo a forma real e disponível de exportação.

## Dados persistentes

O Git guarda o código, schema, migrações, documentação e testes. O Git não guarda os registros operacionais, PDFs importados ou movimentos de estoque.

Os dados operacionais ficam no banco e storage associados à aplicação publicada. Isso permite atualizar a página, fechar o navegador e abrir o BI em outro dispositivo sem perder os registros, desde que o usuário acesse a mesma publicação e faça login na mesma conta.

O executável Windows é apenas um cliente de acesso. Se o arquivo de configuração dele apontar para outra URL, ele poderá mostrar outra base. Antes de distribuir um novo instalador, a URL deve ser conferida.

## Backup, restauração e atualização

### Backup recomendado

O backup operacional deve combinar:

- backup gerenciado do banco MySQL da plataforma de hospedagem;
- exportação periódica dos registros em CSV/Excel;
- cópia dos relatórios PDF importantes;
- retenção dos PDFs originais importados conforme a política da empresa;
- registro do commit publicado junto da data do backup.

O BI já possui exportação de registros e relatórios. Ele ainda não possui uma tela própria de restauração em lote nem um job automático de backup externo.

### Restauração

A restauração de dados deve ser feita por um procedimento controlado do banco ou por importador administrativo futuro. Não é seguro tratar um CSV como restauração automática sem validar usuário, datas, duplicações e conflitos com a base existente.

Para restaurar somente uma análise, pode-se usar o CSV/Excel exportado como referência e importar novamente os documentos originais, conferindo o histórico e a deduplicação. Para restauração integral, é necessário usar o backup do banco e do storage da plataforma.

### Atualização do código

A atualização recomendada é:

1. executar `pnpm check`;
2. executar `pnpm test`;
3. executar `pnpm build`;
4. revisar o diff e as migrações;
5. aplicar migrações com `pnpm db:push` quando houver alteração de schema;
6. fazer commit na branch `main` do repositório canônico;
7. publicar o checkpoint validado;
8. conferir o health check e o login;
9. conferir o endereço configurado no executável Windows.

A publicação não deve apagar dados do banco. Mesmo assim, migrações destrutivas devem ser tratadas como operação de risco e precedidas de backup.

## Testes executados

Nesta etapa foram executados:

```text
pnpm check  → aprovado, sem erros TypeScript
pnpm test   → 9 arquivos de teste, 52 testes aprovados antes do teste do chat
```

Foi acrescentado `server/assistant.test.ts`, que verifica que:

- o chat exige contexto autenticado;
- a mensagem do usuário é encaminhada ao LLM;
- o contexto filtrado é incluído na mensagem de sistema;
- a resposta do assistente é retornada ao frontend.

Com esse teste incluído, a suíte passa a ter **53 testes**. O build de produção deve ser executado novamente antes do próximo checkpoint da alteração.

## Custos e dependências externas

Os custos exatos dependem do plano e da configuração da conta de hospedagem, banco, storage e serviço de IA. Não foi identificado nesta tarefa um contrato de preços confiável que permita afirmar um valor mensal.

As categorias de custo a acompanhar são:

- hospedagem do site e do servidor;
- banco MySQL gerenciado;
- armazenamento dos PDFs;
- tráfego e downloads;
- chamadas de IA para extração de PDFs;
- chamadas de IA do Assistente do BI;
- eventual armazenamento no Google Drive;
- eventual uso de Google Sheets/Docs;
- distribuição e manutenção do instalador Windows.

A IA pode gerar custo variável por quantidade e tamanho dos PDFs importados e pelo número de perguntas no chat. O sistema não deve afirmar que uma integração Google está gratuita ou ativa sem verificar a conta autorizada e os preços vigentes.

## Acesso no iPhone e no Windows

No iPhone, abra o endereço publicado em Safari, faça login e use o dashboard responsivo. É possível adicionar o site à Tela de Início pelo menu de compartilhamento do Safari para criar um atalho semelhante a um aplicativo.

No Windows, é possível usar o navegador ou o aplicativo Electron empacotado. O aplicativo desktop precisa estar configurado com a URL permanente correta e exige internet para acessar a base central.

## Pendências reais

A especificação principal está atendida no escopo atual, mas estas evoluções continuam opcionais ou dependentes de decisão:

- autorização do Google Workspace;
- exportação automática para uma pasta Google definida;
- restauração em lote pela interface;
- backup automático externo agendado;
- persistência de conversas do Assistente do BI;
- inclusão do saldo de estoque como contexto consultável do assistente;
- campos financeiros, comerciais, logísticos e de data diária;
- processo de distribuição assinado do instalador Windows;
- política formal de retenção e eliminação dos PDFs.

Essas pendências não foram mascaradas como implementadas, porque dependem de autorização, decisões de negócio ou campos que ainda não existem no schema.


## Atualização multiplataforma — online-first

A aplicação mantém uma única fonte oficial no backend remoto. O PC continua importando os PDFs, mas a extração e a persistência ocorrem no servidor, permitindo que o iPhone consulte produção e estoque com o PC desligado. O aplicativo Windows passou a usar a mesma autenticação do site, sem enviar o cabeçalho de usuário compartilhado fixo.

O estoque agora possui edição protegida por `version`, rejeição de alterações baseadas em versão antiga e auditoria transacional de criação, atualização e remoção. A tabela `stock_movement_audit` guarda snapshots sem alterar os movimentos históricos existentes. A interface exibe o rastro de alterações e sinaliza perda de conexão; uma ação só é considerada concluída após confirmação do backend.

O frontend agora inclui manifesto PWA, ícones para iPhone e service worker online-first. O service worker não intercepta endpoints `/api/` e não cria uma fila offline de alterações, evitando divergência local. O iPhone pode ser instalado na Tela de Início, mas alterações de estoque exigem conexão e confirmação do servidor.


## Módulo financeiro operacional

Foi adicionado o módulo **Preços e custos**, acessível no menu do dashboard e responsivo para PC e iPhone. Ele possui histórico de preços de compra e venda por tipo de placa, cadastro de insumos e lançamentos de consumo diário, semanal ou por quantidade de placas.

Os valores monetários são persistidos em centavos. Quantidades de insumos aceitam casas decimais. O resumo relaciona a produção com os preços cuja data de vigência antecede o registro, calcula faturamento estimado, custo de compra, custo de insumos, custo total, custo médio por placa e margem bruta. Os registros de produção e estoque existentes não são modificados.
