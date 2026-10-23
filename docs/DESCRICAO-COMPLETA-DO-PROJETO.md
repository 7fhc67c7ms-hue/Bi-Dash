# BI Produção — descrição completa do projeto

**Versão desta documentação:** 22 de outubro de 2026  
**Projeto:** BI Produção — Fotoporcelana  
**Finalidade:** transformar romaneios e registros de produção de fotoporcelanas e placas memoriais em uma base organizada, filtrável e analisável, com controle complementar de estoque, relatórios e exportações.

---

## 1. O que é o projeto

O BI Produção é uma aplicação web responsiva, com backend, banco de dados centralizado e autenticação por usuário. Ele pode ser acessado pelo navegador em computador ou iPhone e também pode ser aberto por um executável Windows que funciona como uma janela do dashboard online.

A aplicação foi desenhada para uma operação que recebe romaneios de produção, normalmente em PDF, extrai as linhas automaticamente, organiza os dados por cliente, modelo de placa, quantidade, mês e ano, e apresenta indicadores para acompanhamento operacional e comercial.

O sistema possui três módulos principais:

1. **Controle principal de produção**, que concentra importação, registros, filtros, indicadores, comparações, gráficos, rankings, relatórios e exportações.
2. **Controle de estoque**, independente da produção importada, para registrar entradas, saídas, descartes e devoluções e calcular saldo e necessidade de reposição.
3. **Análise por cliente**, que mostra o histórico detalhado de um cliente, seus tipos de placa, romaneios e evolução mensal.

O sistema também contém uma área de inteligência de mercado com leituras estratégicas e links de fontes públicas, além de recursos de impressão e geração de documentos.

---

## 2. Como o sistema é acessado

### 2.1 Site web

O sistema funciona como um site responsivo. A mesma conta pode ser usada no computador e no iPhone. O navegador envia as operações para o backend e os dados são persistidos no banco centralizado do projeto.

### 2.2 Programa Windows

O executável Windows não é um banco de dados independente. Ele abre o endereço web configurado dentro de uma janela Electron, exige internet e envia as operações para o mesmo servidor da publicação para a qual estiver apontando.

O executável inclui:

- janela própria para o dashboard;
- título e identidade do BI Produção;
- abertura controlada de links externos;
- impressão do dashboard para PDF pelo diálogo do Windows;
- configuração de URL do dashboard;
- chave técnica para identificar o modo desktop;
- possibilidade de gerar versões instalável e portátil.

Um instalador antigo pode estar apontando para uma publicação antiga. Nesse caso, ele continuará acessando o banco associado àquela publicação, mesmo que exista um site permanente mais recente. O endereço do executável precisa ser atualizado quando a publicação muda.

### 2.3 Autenticação

O login usa autenticação Manus OAuth. A aplicação cria uma sessão própria, vincula os registros ao usuário autenticado e impede que um usuário consulte ou altere registros pertencentes a outra conta.

A sessão utiliza cookie de aplicação compatível com Preview e publicação HTTPS. O logout remove o cookie da sessão.

---

## 3. Dados que o sistema é capaz de receber

O núcleo do sistema trabalha com registros de produção. Cada registro possui os seguintes campos:

| Campo | Descrição | Regras atuais |
|---|---|---|
| `romaneio` | Número, código ou identificador do pedido/documento | Opcional; até 64 caracteres |
| `cliente` | Nome do cliente | Obrigatório; entre 1 e 255 caracteres |
| `tipoPlaca` | Modelo, formato ou tipo da placa/fotoporcelana | Obrigatório; entre 1 e 255 caracteres |
| `quantidade` | Volume produzido naquela linha | Inteiro positivo |
| `mes` | Mês de competência da produção | Um dos 12 meses em português |
| `ano` | Ano de competência | Inteiro entre 2000 e 2100 |
| `uploadId` | Importação que originou o registro | Opcional para registros manuais |
| `pdfFileName` | Nome do PDF de origem | Opcional |
| `createdAt` | Data/hora de criação do registro no banco | Gerada pelo banco |
| `updatedAt` | Data/hora da última atualização | Atualizada pelo banco |

O modelo atual não possui preço, custo, margem, canal, cidade, UF, prazo, status do pedido, retrabalho, material, medidas, cor, fornecedor, vendedor ou data diária do evento. Portanto, o BI mede principalmente **volume e composição da produção**, não faturamento ou rentabilidade.

---

## 4. Importação de PDFs

### 4.1 Entrada do arquivo

O usuário pode:

- selecionar um PDF pelo explorador de arquivos;
- arrastar o PDF para a área de importação;
- informar o ano de fallback dos registros;
- iniciar o processamento;
- limpar o arquivo selecionado antes do envio.

O sistema aceita apenas arquivos PDF com tamanho máximo de **15 MB**.

### 4.2 Armazenamento e identificação

Antes de processar o arquivo, o backend:

1. converte o arquivo recebido para bytes;
2. calcula um hash SHA-256 do conteúdo;
3. verifica se o mesmo usuário já importou aquele PDF;
4. evita uma nova importação quando já existe uma importação concluída ou em processamento;
5. armazena o PDF em storage seguro;
6. registra o nome, hash, URL, status e contadores no banco.

O hash evita a duplicação do mesmo arquivo. Uma falha anterior pode ser reprocessada.

### 4.3 Extração assistida por IA

O PDF é enviado ao serviço de linguagem com instruções para extrair todos os registros de todas as páginas. O extrator reconhece, entre outros, os seguintes cabeçalhos e equivalências:

- `ROMANEIO`, `PEDIDO` ou `ORDEM`;
- `CLIENTE` ou `NOME`;
- `TIPO DE PLACA`, `PRODUTO` ou `MODELO`;
- `QTD`, `QUANTIDADE` ou `VOLUME`;
- `MÊS`, `MES`, `PERÍODO` ou `COMPETÊNCIA`;
- `ANO` ou `YEAR`.

A coluna `OBS` pode existir no documento, mas é ignorada pelo extrator porque não faz parte do modelo de produção atual.

A IA também tenta:

- identificar o ano no cabeçalho ou no documento;
- aplicar o mês presente no título às linhas quando isso estiver claro;
- preservar os nomes de clientes e modelos;
- converter números no padrão brasileiro para inteiros;
- normalizar meses para maiúsculas em português;
- retornar somente dados presentes no documento, sem inventar linhas.

### 4.4 Normalização e validação

Após a resposta da IA, o backend normaliza os campos e valida cada linha. Uma linha é rejeitada quando:

- não é um objeto válido;
- não possui cliente;
- não possui tipo de placa/modelo;
- não possui mês reconhecido;
- possui quantidade zero, negativa ou inválida;
- não possui uma estrutura compatível com o retorno esperado.

Os meses reconhecidos são:

`JANEIRO`, `FEVEREIRO`, `MARÇO`, `ABRIL`, `MAIO`, `JUNHO`, `JULHO`, `AGOSTO`, `SETEMBRO`, `OUTUBRO`, `NOVEMBRO` e `DEZEMBRO`.

Acentos e aliases como `MAR`, `MARCO` e `MÊS` são normalizados.

### 4.5 Deduplicação de linhas

A deduplicação de linhas usa, quando disponível, a combinação:

`romaneio + cliente + tipo de placa + mês + ano`

Isso permite que um mesmo romaneio tenha várias linhas legítimas, por exemplo vários modelos de placa, sem que todas sejam confundidas com duplicadas. Apenas linhas realmente repetidas pela chave são descartadas.

### 4.6 Resultado da importação

Ao finalizar, o sistema informa:

- quantidade de registros inseridos;
- quantidade de linhas rejeitadas;
- quantidade de duplicados evitados;
- se o PDF já havia sido importado;
- status final da importação;
- mensagem de erro quando o processamento falha.

A importação fica disponível no histórico com nome do arquivo, data/hora, contadores e status:

- `Concluído`;
- `Falhou`;
- `A processar`.

---

## 5. Gestão manual dos registros de produção

O usuário pode abrir **Gerir registros** para revisar e corrigir os dados importados.

### 5.1 Inclusão manual

É possível criar um registro sem PDF preenchendo:

- romaneio opcional;
- cliente;
- tipo de placa;
- quantidade;
- mês;
- ano.

O sistema exige cliente, modelo/tipo de placa e quantidade inteira positiva.

### 5.2 Edição

Qualquer registro pertencente ao usuário pode ser aberto e alterado. A edição permite corrigir nome do cliente, modelo, quantidade, mês, ano e romaneio.

### 5.3 Exclusão

A exclusão exige confirmação do usuário e remove apenas o registro selecionado da conta atual. A remoção de um registro de produção não remove automaticamente o PDF original da área de armazenamento nem o histórico da importação.

### 5.4 Tabela de registros

A gestão exibe:

- romaneio;
- cliente;
- modelo/tipo de placa;
- quantidade;
- mês/ano;
- ações de editar e excluir.

A tabela pode respeitar o recorte de meses, clientes e modo de inclusão/exclusão selecionado na tela.

---

## 6. Filtros disponíveis

Os filtros globais alimentam o dashboard, os indicadores, as tabelas, os gráficos e as exportações.

### 6.1 Meses

O usuário pode selecionar um ou vários meses. Quando nenhum mês é escolhido, todos os meses disponíveis são considerados.

### 6.2 Anos

O usuário pode selecionar um ou vários anos existentes na base.

### 6.3 Clientes

O sistema oferece seleção múltipla de clientes com dois modos:

- **Incluir:** considera somente os clientes selecionados;
- **Excluir:** remove os clientes selecionados do recorte.

### 6.4 Tipo de placa

Há uma seleção rápida de um tipo e uma seleção múltipla de vários tipos. Quando nenhum tipo é escolhido, todos são considerados.

### 6.5 Segmento

O sistema classifica o cliente em:

- **Todos**;
- **Clientes de obras**;
- **Clientes comuns**.

A regra atual é textual: um cliente é classificado como obras quando seu nome contém `OBRAS`, ignorando diferenças de maiúsculas/minúsculas.

### 6.6 Limpeza

O botão **Limpar filtros** restaura meses, anos, clientes, modo de cliente, tipos e segmento para o estado geral.

### 6.7 Limitação de data diária

Os botões **Dia** e **Semana** aparecem desabilitados porque o banco atual guarda apenas `ano` e `mes`. Não existe uma coluna `data` diária. O sistema não inventa datas e não calcula médias diárias ou semanais artificiais.

---

## 7. Modo Explorar e modo Relatório

O dashboard possui dois modos de trabalho:

### Explorar

É o modo de análise interativa. O usuário altera filtros e navega pelas áreas do BI para investigar clientes, produtos, períodos, mix e evolução.

### Relatório

Ao selecionar o modo Relatório, a navegação abre a área de relatórios e prepara as opções de conteúdo para exportação. O usuário pode escolher se o documento terá:

- gráficos;
- tabelas;
- texto analítico;
- detalhes de clientes;
- comparação entre períodos.

---

## 8. Áreas do dashboard

A navegação principal contém as seguintes áreas:

### 8.1 Dashboard executivo

Exibe indicadores resumidos e clicáveis, calculados sobre o recorte filtrado:

- produção total;
- quantidade de clientes;
- média por cliente;
- mediana por cliente;
- mínimo e máximo por cliente;
- desvio padrão;
- média mensal;
- média diária e semanal como indisponíveis quando não há data diária;
- tipos produzidos;
- produto estrela;
- maior cliente;
- concentração dos cinco maiores clientes;
- variação entre períodos disponíveis;
- clientes de obras;
- participação de obras;
- qualidade da importação.

Os cards podem levar o usuário para áreas mais detalhadas, como Produção, Clientes e Tipos.

### 8.2 Produção

A área de produção mostra a tabela e os gráficos derivados das linhas filtradas. Ela permite observar o volume por cliente, período e tipo de placa.

Os KPIs operacionais principais são:

- **Produção total:** soma das quantidades;
- **Pedidos:** quantidade de romaneios únicos não vazios;
- **Ticket médio operacional:** produção total dividida pelo número de romaneios únicos;
- **Produto estrela:** tipo de placa com maior volume.

Neste projeto, “ticket médio” significa quantidade média por pedido, não valor financeiro.

### 8.3 Clientes

A análise de clientes apresenta:

- ranking de volume por cliente;
- total produzido por cliente;
- quantidade de tipos produzidos;
- tipo mais produzido;
- tipo menos produzido;
- média por tipo;
- participação do cliente no total;
- média mensal;
- maior mês;
- menor mês;
- crescimento absoluto;
- crescimento percentual quando existe base comparável;
- posição no ranking histórico;
- evolução mensal;
- evolução anual;
- mix de tipos por cliente.

A área também permite comparar vários clientes em paralelo, com tabela e gráfico multissérie.

### 8.4 Tipos

A análise de tipos/modelos mostra:

- categoria do tipo;
- total produzido;
- número de clientes que compraram/produziram o tipo;
- média por cliente;
- maior cliente do tipo;
- menor cliente do tipo;
- participação no total;
- ranking;
- crescimento absoluto;
- crescimento percentual;
- evolução mensal;
- evolução anual.

O sistema também apresenta o produto estrela e o detalhamento dos modelos ativos por mês.

### 8.5 Categorias de modelos

A categorização atual identifica padrões textuais no nome do tipo de placa. Ela foi criada para permitir uma leitura agregada de grupos como `RET`, `OVAL` e `QUAD`, sem substituir o nome original do modelo.

A tela de mix de categorias mostra:

- categoria;
- total;
- participação;
- modelos pertencentes à categoria.

Quando um modelo não corresponde aos padrões conhecidos, ele permanece como categoria própria ou categoria não classificada conforme a regra do motor analítico.

### 8.6 Comparações

O usuário pode configurar dois períodos independentes:

- Período A: ano, mês inicial e mês final;
- Período B: ano, mês inicial e mês final.

Cada período pode ser um ano diferente e pode conter intervalos diferentes. A comparação usa os dados históricos completos para evitar que um filtro exploratório elimine acidentalmente um dos lados.

A comparação calcula:

- produção total de A e B;
- média mensal de A e B;
- média por cliente;
- clientes de cada período;
- tipos de cada período;
- maior cliente;
- tipo principal;
- concentração Top 5;
- evolução mensal;
- mix por categoria;
- diferença absoluta;
- diferença percentual;
- clientes novos;
- clientes perdidos;
- clientes recorrentes;
- clientes reativados;
- clientes que aumentaram;
- clientes que diminuíram;
- clientes estáveis;
- tipos que aumentaram;
- tipos que diminuíram;
- alteração da concentração;
- alteração do mix em pontos percentuais;
- classificação de crescimento.

A movimentação de carteira identifica clientes reativados quando eles aparecem no período B, não aparecem em A, mas possuem produção anterior ao início de A.

### 8.7 Evolução

A área de evolução apresenta:

- série mensal em ordem cronológica;
- evolução por ano;
- acumulado ao longo do ano;
- comparação entre anos;
- sazonalidade por mês;
- média histórica mensal;
- matriz de modelo por mês;
- total de cada modelo em cada mês;
- participação de cada modelo no mês;
- resumo mensal com total, romaneios, modelos ativos, modelo estrela e variação.

### 8.8 Estatísticas

A área estatística calcula:

- média geral;
- média por cliente;
- mediana por cliente;
- mínimo por cliente;
- máximo por cliente;
- desvio padrão populacional por cliente;
- média mensal;
- média por tipo;
- média operacional por pedido;
- meses com produção;
- tipos produzidos;
- variação entre períodos;
- concentração.

Médias diárias, semanais, dias com produção e dias sem produção são marcadas como indisponíveis no modelo atual porque não há data diária.

### 8.9 Rankings

A área de rankings permite escolher:

- entidade: clientes ou tipos;
- métrica: total, crescimento absoluto, crescimento percentual, redução absoluta ou redução percentual.

O ranking respeita os filtros globais e as comparações configuradas.

### 8.10 Histórico

O histórico de importações permite consultar cada PDF processado, mostrando:

- nome do arquivo;
- data e hora;
- quantidade de linhas válidas;
- quantidade de linhas rejeitadas;
- quantidade de duplicados evitados;
- status do processamento.

O histórico não substitui a tabela de produção: ele registra o processo de importação, enquanto a tabela de produção contém as linhas efetivamente utilizadas nas análises.

### 8.11 Relatórios

A aplicação gera texto determinístico baseado nos dados filtrados. O texto não inventa conclusões fora dos dados recebidos e pode mencionar:

- volume;
- evolução;
- concentração;
- clientes de obras;
- produto estrela;
- comparações entre períodos;
- alterações de mix.

O relatório pode incluir ou excluir seções por meio das opções de relatório.

### 8.12 Exportação

O projeto oferece:

- PDF profissional multipágina;
- PDF visual da área renderizada, como alternativa;
- relatório operacional HTML;
- CSV separado por ponto e vírgula, compatível com Excel;
- arquivo `.xls` baseado em CSV com BOM para abertura em planilhas;
- impressão nativa pelo navegador.

---

## 9. Relatório PDF profissional

O PDF profissional pode conter:

1. capa;
2. título, subtítulo, data e filtros aplicados;
3. resumo executivo;
4. indicadores principais;
5. qualidade da importação;
6. evolução da produção;
7. produção por cliente;
8. produção por tipo;
9. comparação de períodos;
10. concentração de clientes;
11. mix de categorias;
12. detalhes de clientes;
13. rankings;
14. conclusões e texto determinístico.

Os gráficos e tabelas usam as mesmas séries filtradas exibidas na tela. O PDF possui cabeçalho, rodapé, numeração de páginas, tabelas e gráficos de barras.

O usuário pode escolher incluir gráficos, tabelas, texto, detalhes de clientes e comparação.

---

## 10. Impressão e seleção visual

O sistema oferece impressão nativa pelo navegador:

- botão **Imprimir**;
- atalho `Ctrl+P` no Windows/Linux;
- atalho `Command+P` no macOS;
- fundo branco e estilos de impressão;
- ocultação de navegação, controles e filtros durante a impressão;
- impressão da página ou área ativa quando não há seleção.

Também existe o modo **Selecionar área**. O usuário arrasta um retângulo sobre os blocos visíveis, e o sistema identifica os componentes intersectados, ignorando controles marcados como interface. Apenas os blocos selecionados são impressos.

A seleção evita duplicar blocos-pai quando existem blocos-filhos mais específicos dentro da área escolhida.

---

## 11. Controle de estoque

O estoque é um módulo separado. Ele usa a produção histórica apenas como referência de consumo e não altera os registros de produção importados.

### 11.1 Movimentos disponíveis

O usuário pode registrar:

- **Entrada:** aumenta o saldo;
- **Saída:** reduz o saldo;
- **Descarte:** reduz o saldo;
- **Devolução:** reduz o saldo, conforme a regra operacional definida no projeto.

Cada movimento possui:

- tipo de placa;
- movimento;
- quantidade inteira positiva;
- observação opcional de até 1000 caracteres;
- data/hora do ocorrido;
- data/hora de criação;
- data/hora de atualização.

### 11.2 Regra do saldo

A regra atual é:

```text
saldo = entradas − saídas − descartes − devoluções
```

Somente `entrada` é positiva. Saída, descarte e devolução são subtrações do saldo disponível.

### 11.3 Recomendação de estoque

Para cada tipo de placa, o sistema calcula:

- produção histórica;
- quantidade de meses com produção;
- consumo médio mensal;
- entradas;
- devoluções;
- saídas;
- descartes;
- estoque atual;
- estoque recomendado;
- necessidade de reposição;
- status `OK` ou `REPOR`.

O consumo médio mensal é:

```text
produção histórica do tipo ÷ quantidade de meses com produção do tipo
```

O estoque recomendado é:

```text
arredondar para cima(consumo médio mensal × cobertura desejada)
```

A cobertura pode ser configurada para 1, 2, 3 ou 6 meses na interface. O motor aceita e limita a cobertura entre 1 e 24 meses.

A necessidade de reposição é:

```text
máximo(0, estoque recomendado − estoque atual)
```

### 11.4 Indicadores do estoque

A tela mostra:

- itens para repor;
- estoque recomendado total;
- saldo atual total;
- devoluções totais;
- descartes totais.

Também exibe uma tabela por tipo de placa e o histórico de movimentos com sinal positivo ou negativo, data, observação e ação para remover.

### 11.5 Independência da produção

A criação de entrada, saída, descarte ou devolução não cria nem altera uma linha de produção. A produção é usada somente para estimar consumo e recomendação.

---

## 12. Análise individual por cliente

O módulo separado **Produção por cliente** permite selecionar um cliente e consultar somente os registros dele.

Ele mostra:

- produção total;
- total de romaneios;
- quantidade de tipos de placa;
- evolução mensal;
- quantidade produzida por mês;
- romaneios por mês;
- mix por tipo de placa;
- participação percentual de cada tipo;
- detalhamento de cada romaneio;
- ano;
- mês;
- tipo;
- quantidade.

O detalhamento é calculado diretamente sobre a tabela principal de produção.

---

## 13. Inteligência de mercado

A aplicação possui uma seção de leitura estratégica baseada em observações públicas e hipóteses a validar com dados internos.

Os três temas principais são:

### Mercado fragmentado e híbrido

A concorrência combina lojas próprias, WhatsApp, marketplaces, revendedores e orçamentos. O projeto recomenda acompanhar canal, recorrência, prazo e conversão por cliente, não apenas unidades.

### Escada de valor

O mercado apresenta formatos menores e maiores, placas, metais, molduras e memorial digital. A recomendação é medir mix premium, oportunidades de venda adicional e concentração.

### Confiança operacional

Durabilidade, aprovação da arte, rapidez, envio seguro e atendimento humanizado aparecem como diferenciais. O projeto sugere medir retrabalho, SLA e qualidade da importação.

A área apresenta links para fontes públicas sobre fotocerâmica, placas, memorial digital, mercado funerário, registro civil e mortalidade.

Essas informações são contexto estratégico, não dados internos automáticos. A estimativa externa de mercado funerário não é tratada como TAM específico de fotoporcelana.

A seção pode gerar um PDF de inteligência de mercado com leituras estratégicas.

---

## 14. Componentes assistidos por IA

O projeto possui infraestrutura para usar serviços de linguagem e processamento de arquivos.

A IA é usada diretamente para:

- ler PDFs;
- extrair linhas de produção;
- reconhecer aliases de cabeçalho;
- normalizar números e meses;
- retornar dados em JSON estruturado;
- rejeitar respostas vazias ou JSON inválido.

Existe também um componente visual de chat com:

- mensagens de usuário e assistente;
- renderização Markdown;
- rolagem automática;
- estado de carregamento;
- prompts sugeridos;
- envio por Enter;
- suporte a Shift+Enter;
- ícones de usuário e assistente.

Esse componente é uma peça reutilizável de interface para integração com uma mutação de chat. A funcionalidade comprovadamente integrada ao fluxo principal do BI é a extração de PDFs; o chat não deve ser considerado um módulo de análise persistente do dashboard sem uma rota de conversa conectada.

---

## 15. Dados que não são processados hoje

O sistema atual não calcula nem armazena nativamente:

- faturamento;
- preço unitário;
- custo de matéria-prima;
- custo de mão de obra;
- margem;
- desconto;
- impostos;
- frete;
- canal de aquisição;
- origem do lead;
- cidade ou estado;
- vendedor;
- prazo prometido;
- prazo realizado;
- status do pedido;
- aprovação de arte;
- retrabalho;
- motivo de perda;
- devolução comercial detalhada;
- fornecedor;
- material da placa;
- tamanho e medidas estruturadas;
- cor ou acabamento;
- memorial digital anexado;
- número de ativações de QR Code;
- data diária de produção;
- capacidade produtiva;
- horas de máquina;
- paradas ou gargalos;
- estoque por lote, custo ou validade;
- previsão estatística futura;
- vendas ou conversão de mercado;
- quantidade de óbitos como proxy de demanda.

Esses dados podem ser incluídos em uma evolução futura, mas não devem ser inferidos a partir de quantidade, mês ou nome do modelo.

---

## 16. Armazenamento e relacionamento entre dados

### Usuários

A tabela de usuários guarda identidade, nome, e-mail, método de login, papel e datas de criação, atualização e último login.

### Importações

A tabela de importações guarda usuário, nome do PDF, URL do arquivo, hash, status, linhas válidas, linhas rejeitadas, duplicados evitados, mensagem de erro e datas.

### Produção

A tabela de produção guarda usuário, importação de origem, romaneio, cliente, tipo, quantidade, mês, ano, nome do PDF e datas.

### Estoque

A tabela de movimentos guarda usuário, tipo de placa, movimento, quantidade, observação, data do ocorrido e datas de auditoria.

### Isolamento por usuário

As consultas e mutações protegidas usam o identificador do usuário autenticado. Um usuário não deve acessar registros de outro usuário por alteração de parâmetros no navegador.

### Git

O repositório Git guarda código-fonte, migrações, documentação, configurações e testes. Ele não é a fonte de dados de produção nem contém os registros operacionais do banco. Um commit não equivale a um backup dos dados do usuário.

---

## 17. API e operações principais

O backend expõe procedimentos protegidos para:

- consultar os dados de produção;
- consultar analytics;
- criar registro;
- atualizar registro;
- excluir registro;
- listar importações;
- excluir importação e registros vinculados;
- consultar análise de estoque;
- consultar análise individual de cliente;
- listar movimentos de estoque;
- criar movimento;
- excluir movimento;
- importar PDF;
- consultar usuário autenticado;
- fazer logout.

As operações de produção e estoque são realizadas no banco centralizado, não no armazenamento local do navegador.

---

## 18. Qualidade, testes e validações existentes

O projeto contém testes para:

- analytics e indicadores;
- autenticação e logout;
- capacidades do BI;
- filtros;
- extração e validação de PDF;
- cálculo do estoque;
- tabela de produção;
- filtros compartilhados;
- análise PDF.

Na publicação permanente, a validação executada apresentou:

- typecheck TypeScript sem erros;
- 52 testes aprovados;
- build de produção concluído;
- manifesto de rotas respondendo corretamente;
- endpoint público de configuração de login respondendo;
- layout conferido em viewport de iPhone.

---

## 19. Limitações e cuidados operacionais

1. **Importe um PDF por vez** para facilitar conferência e diagnóstico.
2. **Revise as linhas rejeitadas** antes de tomar decisões com o total.
3. **Confira o ano informado** quando o documento não tiver ano claro.
4. **Não confunda quantidade com valor financeiro.** O ticket médio atual é quantidade por romaneio.
5. **Não use média diária ou semanal** enquanto a base não tiver data diária.
6. **Não trate o estoque como produção.** Os módulos são independentes.
7. **Não conte com o Git como backup dos dados.** O backup deve ser feito no banco/exportação.
8. **Verifique o endereço do executável Windows.** Um instalador antigo pode acessar outra publicação.
9. **PDFs podem conter dados sensíveis.** Deve-se controlar acesso, retenção e exclusão conforme a política da empresa e a legislação aplicável.
10. **As leituras de mercado são hipóteses estratégicas.** Elas precisam ser validadas com preço, custo, canal, prazo, margem e dados reais de clientes.

---

## 20. Evoluções recomendadas

Para transformar o BI de produção em um sistema comercial e financeiro mais completo, os próximos campos recomendados por pedido são:

- segmento do cliente;
- cidade e UF;
- canal;
- preço;
- custo direto;
- desconto;
- margem;
- prazo prometido;
- prazo realizado;
- retrabalho;
- motivo de perda;
- material;
- medidas;
- memorial digital;
- origem do lead;
- status do pedido;
- vendedor;
- data de entrada;
- data de aprovação;
- data de produção;
- data de expedição.

Com esses campos, o projeto poderá evoluir de um BI de volume de produção para uma visão de margem, capacidade, SLA, retenção, recorrência, previsão de demanda e rentabilidade por cliente.

---

## 21. Resumo final

O BI Produção atualmente é capaz de receber romaneios em PDF ou lançamentos manuais, extrair e validar linhas de produção, impedir duplicação do mesmo arquivo, armazenar registros por usuário, corrigir e excluir lançamentos, filtrar a base por tempo, cliente, tipo e segmento, calcular indicadores executivos, comparar períodos, classificar crescimento e perda de clientes, analisar mix e sazonalidade, criar rankings, detalhar clientes, controlar estoque por movimentos, recomendar reposição, gerar relatórios, exportar CSV/Excel/PDF/HTML, imprimir áreas selecionadas, alternar modo claro/escuro e funcionar em computador, celular e executável Windows conectado à internet.

A sua principal fronteira atual é que a base é orientada a **produção em unidades por cliente, modelo, mês e ano**. Ela ainda não é uma base financeira, comercial, logística ou de capacidade produtiva porque esses campos não existem no schema atual.
