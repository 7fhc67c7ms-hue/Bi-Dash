# Guia de operação do BI Produção

## 1. Entrar no sistema

Abra a aplicação e inicie sessão. O dashboard mostra apenas os dados associados à sua conta. A sidebar permite regressar à visão geral, abrir a gestão de registros e consultar o histórico de importações.

## 2. Importar um PDF

Na visão geral, selecione **Importar PDF**. Arraste um romaneio para a área tracejada ou clique para escolher o ficheiro. O sistema aceita PDF até 15 MB. Informe o ano do documento; quando a IA encontrar um ano claro no próprio PDF, ele será usado por registro e o ano informado funcionará como fallback.

Clique em **Importar PDF** e aguarde. A IA interpreta as colunas ROMANEIO, OBS, CLIENTE, TIPO DE PLACA, QTD e MÊS, incluindo cabeçalhos equivalentes e números no padrão brasileiro. O ficheiro é guardado no armazenamento seguro e o hash evita que o mesmo PDF seja importado duas vezes.

## 3. Interpretar o resultado

A mensagem de conclusão informa quantos registros foram inseridos, quantas linhas foram rejeitadas e quantos romaneios duplicados foram evitados. Uma linha pode ser rejeitada quando falta cliente, modelo, mês válido ou quantidade positiva. Use o histórico de importações para consultar o resultado mais tarde.

## 4. Rever e corrigir registros

Abra **Gerir registros**. A tabela mostra romaneio, cliente, modelo, quantidade e mês/ano. Use o ícone de edição para corrigir um lançamento. Use **Novo registro** para inserir uma produção que não veio do PDF. A eliminação pede confirmação e afeta somente um registro da sua conta.

## 5. Filtrar o painel

O seletor de meses aceita um ou vários meses. Os filtros adicionais permitem escolher cliente, tipo de placa e segmento: todos, clientes comuns ou clientes de obras. A regra de obras é simples: o nome do cliente contém “OBRAS”. Os KPIs, rankings, gráficos, tabela e exportações acompanham os filtros ativos.

## 6. Ler os indicadores

Os KPIs exibem produção total, pedidos, média por pedido e produto estrela. As métricas avançadas mostram clientes ativos, diversidade do mix, concentração dos cinco maiores clientes, evolução mensal e qualidade agregada das importações. Uma concentração elevada indica dependência comercial e deve ser acompanhada como risco.

## 7. Exportar

Use **Exportar CSV** para baixar os registros filtrados e abrir no Excel. Use **Relatório operacional** para baixar uma página HTML resumida com período, KPIs, produção por cliente e notas de concentração. O relatório pode ser impresso pelo navegador ou convertido em PDF localmente quando necessário.

## 8. Usar o estoque no iPhone e no Windows

Abra o mesmo endereço do BI no computador ou no iPhone. No iPhone, use o menu de compartilhamento do Safari e escolha **Adicionar à Tela de Início** para instalar o PWA. O backend online é a fonte oficial: uma entrada, saída, devolução, descarte ou edição somente aparece como concluída depois da confirmação do servidor.

No histórico do estoque, use o lápis para editar um movimento e a lixeira para removê-lo. Se outro dispositivo tiver alterado o mesmo movimento antes da sua confirmação, o sistema rejeita a operação, atualiza a tela e pede que você tente novamente com os dados mais recentes. A seção **Rastro de alterações** registra criações, edições e remoções com data e snapshot do movimento.

## 9. Consultar mercado

A secção **Inteligência de mercado** resume sinais observados em fornecedores públicos: variedade de formatos, memorial digital, programas de revenda, atendimento por WhatsApp, envio nacional e pressão de marketplaces. As fontes e limitações estão detalhadas em `market_analysis.md`.

## Boas práticas

Importe um PDF por vez, confirme o ano e revise linhas rejeitadas antes de usar o total para decisões. Não carregue documentos além do necessário. Se uma importação falhar, consulte o histórico e tente novamente apenas depois de verificar o ficheiro. Para análises comerciais mais profundas, mantenha preço, custo, canal, prazo prometido, prazo realizado e retrabalho junto do pedido; quantidade sozinha não mede margem.
