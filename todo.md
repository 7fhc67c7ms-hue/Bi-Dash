# Projeto: Dashboard de BI para Produção de Placas Fotoporcelanas

## Funcionalidades Principais

### Backend - Extração e Processamento de Dados
- [x] Implementar rota de upload de PDF
- [x] Integrar LLM para extração automática de dados do PDF
- [x] Criar schema de banco de dados para armazenar dados de produção
- [x] Implementar tRPC procedures para CRUD de dados de produção
- [x] Implementar lógica de cálculo de KPIs (produção total, ticket médio, etc.)
- [x] Implementar lógica de rankings (clientes comuns vs OBRAS)
- [x] Implementar lógica de processamento de gráficos (top 10 produtos, comparação mensal)

### Frontend - Interface e Visualização
- [x] Configurar tema dark mode com Tailwind CSS
- [x] Criar componente de upload de PDF com drag-and-drop
- [x] Criar seletor de meses (single/multiple selection)
- [x] Criar tabela detalhada de produção com alternância de cores
- [x] Criar cards de KPIs com design Power BI
- [x] Criar ranking Top 5 de clientes comuns
- [x] Criar ranking completo de clientes OBRAS
- [x] Criar gráfico de barras - Top 10 modelos
- [x] Criar gráfico de colunas - Produção mensal (cronológica)
- [x] Criar gráfico de colunas - Produção mensal (maior para menor)
- [x] Implementar filtro de meses que atualiza todos os painéis
- [x] Criar layout de dashboard com sidebar e main content

### Design e UX
- [x] Implementar design Power BI dark mode
- [x] Adicionar sombras e bordas arredondadas aos cards
- [x] Escolher tipografia moderna (Google Fonts)
- [x] Garantir responsividade do dashboard
- [x] Adicionar loading states e animações

### Testes e Refinamento
- [x] Testar extração de dados de PDFs com diferentes layouts
- [x] Testar filtros de meses
- [x] Testar cálculos de KPIs
- [x] Testar responsividade do dashboard
- [x] Refinar design e cores

## Progresso

- [x] Inicializar projeto web com tRPC + React + Tailwind
- [x] Fase 1: Backend - Extração e Processamento
- [x] Fase 2: Frontend - Interface e Visualização
- [x] Fase 3: Integração e Refinamento
- [x] Fase 4: Testes e Entrega

## Melhorias desta etapa — Produto completo e análise de mercado
- [x] Auditar e corrigir inconsistências do backlog anterior e dos fluxos existentes
- [x] Implementar CRUD completo de registros, incluindo criação manual e atualização
- [x] Corrigir a segurança das operações para garantir isolamento por utilizador
- [x] Implementar drag-and-drop real para PDFs com estados visuais e validação de tamanho
- [x] Melhorar a extração de PDF com normalização de ano, mês sem acento, números e layouts alternativos
- [x] Criar histórico de uploads e associação dos registros ao ficheiro de origem
- [x] Implementar edição e eliminação com confirmação e feedback
- [x] Implementar layout persistente com sidebar, navegação de secções e estado responsivo
- [x] Adicionar tipografia moderna, tokens visuais e refinamento de acessibilidade
- [x] Adicionar filtros por cliente, tipo de placa, categoria e intervalo mensal
- [x] Adicionar métricas avançadas: mix de produtos, concentração de clientes, crescimento, média por pedido e qualidade da importação
- [x] Adicionar exportação CSV e relatório operacional para download
- [x] Criar testes de extração para layouts alternativos e casos de erro
- [x] Criar testes para filtros, CRUD, segurança e agregações
- [x] Pesquisar mercado brasileiro de fotoporcelana, cemitérios, funerárias e fornecedores
- [x] Mapear concorrência, canais, tendências, riscos e oportunidades
- [x] Incorporar uma secção de insights de mercado no produto
- [x] Produzir relatório de análise de mercado com fontes e limitações explícitas
- [x] Executar revisão visual desktop e mobile
- [x] Executar build, testes e verificação final antes do checkpoint

## Novas fases
- [x] Fase 5: Produto completo e robustez operacional
- [x] Fase 6: Inteligência de negócio e análise de mercado
- [x] Fase 7: Testes, revisão visual e entrega final

## Histórico
- [x] Protótipo inicial entregue no checkpoint 87cc287d
- [x] Melhorias desta solicitação concluídas
- [x] Checkpoint final criado
- [x] Relatório de mercado entregue

> Nota: Os itens marcados como concluídos nas secções antigas refletem o estado do protótipo anterior; esta secção regista a auditoria e o trabalho adicional solicitado nesta nova etapa.

## Metodologia de mercado
- [x] Definir escopo geográfico e cadeia de valor
- [x] Recolher fontes públicas primárias e secundárias atuais
- [x] Separar fatos observados, inferências e hipóteses
- [x] Evitar números de mercado não verificáveis ou estimativas fabricadas
- [x] Traduzir achados em prioridades de produto e operação

## Backlog técnico detalhado
- [x] Auditar schema, migrations e existência real das tabelas no banco
- [x] Auditar tipos tRPC e contrato de upload no browser
- [x] Corrigir retorno do ID inserido e transação do processamento de PDF
- [x] Adicionar deduplicação por ficheiro/romaneio quando aplicável
- [x] Melhorar estados vazios, erros de API e carregamento
- [x] Validar a aplicação em desktop e mobile
- [x] Validar que o build de produção termina sem erros
- [x] Documentar o fluxo de operação para o utilizador

## Entrega
- [x] Ler todo o TODO e marcar apenas itens realmente verificados
- [x] Criar checkpoint final após testes
- [x] Entregar aplicação, análise e recomendações com limitações declaradas

## Gaps identificados na auditoria de completude
- [x] Extrair o ano do PDF quando identificado e manter o ano manual como fallback explícito
- [x] Registar linhas válidas, linhas descartadas e duplicados evitados por importação
- [x] Exibir média por pedido e qualidade da importação nas métricas avançadas
- [x] Criar download de relatório operacional resumido além do CSV bruto
- [x] Testar JSON inválido, resposta vazia e cabeçalhos alternativos do extrator
- [x] Testar filtros por categoria/cliente e isolamento de utilizador
- [x] Tornar a importação atómica ou eliminar registros parciais quando a inserção falhar
- [x] Deduplicar romaneios repetidos dentro do mesmo PDF quando o identificador for confiável

## Correção de regressão — tabela de registros
- [x] Corrigir nesting inválido de elementos dentro de `tbody` e validar o DOM renderizado
- [x] Executar testes, build e revisão do console após a correção


## Atualização solicitada — estoque, impressão e modo claro
- [x] Adicionar os movimentos de estoque **descarte** e **devolução**, mantendo entrada e saída; calcular corretamente o saldo e exibir os quatro movimentos no resumo e histórico.
- [x] Permitir selecionar uma área da tela arrastando o mouse e imprimir somente os blocos selecionados usando a impressão nativa do navegador.
- [x] Permitir imprimir a página atual com `Ctrl+P`, ocultando controles e navegação durante a impressão; manter uma opção visível de impressão para quem preferir clicar.
- [x] Disponibilizar modo claro com fundo predominantemente branco, preservando as cores dos botões e dos gráficos.
- [x] Validar a alteração com typecheck, testes e build de produção.


## Atualização multiplataforma aprovada — online-first
- [x] Corrigir as URLs do aplicativo Windows para a publicação atual sem alterar o banco ou os dados.
- [x] Adicionar manifest, ícones e service worker mínimos para instalação do BI na Tela de Início do iPhone, mantendo o backend como fonte oficial.
- [x] Adicionar controle de concorrência para alterações e exclusões de estoque, rejeitando uma operação baseada em versão antiga e solicitando recarga.
- [x] Criar auditoria de estoque para registrar criação, edição e exclusão com usuário, data e snapshot do movimento, preservando o histórico já existente.
- [x] Adicionar edição segura de movimentos de estoque no frontend mobile e desktop, com confirmação e recarga após conflito.
- [x] Melhorar mensagens de estado offline/erro de conexão sem gravar alterações localmente sem confirmação do backend.
- [x] Validar typecheck, testes, build, manifesto, PWA, permissões, persistência e sincronização sem apagar dados de produção.


## Atualização aprovada — preços, custos e insumos
- [x] Criar histórico de preços por tipo de placa com valor de compra, valor de venda e vigência, sem alterar relatórios históricos existentes.
- [x] Criar cadastro de insumos com nome, unidade, custo unitário e situação ativa/inativa.
- [x] Permitir lançar consumo de insumos por período diário, semanal ou por quantidade de placas, com quantidade, custo unitário no momento do lançamento, período de referência e observação.
- [x] Calcular faturamento estimado, custo de compra, custo de insumos, custo total, custo médio por placa e margem bruta.
- [x] Integrar o módulo ao dashboard responsivo, com acesso no PC e no iPhone usando o mesmo banco remoto.
- [x] Aplicar apenas migração aditiva, preservando os dados atuais de produção, estoque e autenticação.
- [x] Validar typecheck, testes, build, persistência e atualização do site sem reinstalação do aplicativo Windows.
