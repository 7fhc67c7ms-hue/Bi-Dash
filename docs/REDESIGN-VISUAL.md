# Redesign visual do BI Produção

## Registro de decisão

**Modo:** Redesign · Preserve. A interface será modernizada sem trocar a arquitetura de navegação, os nomes dos módulos, os anchors, os formulários, os dados ou os fluxos de produção, estoque, custos e cobertura de clientes.

**Design Read**

- **Artefato:** dashboard operacional e analítico responsivo.
- **Público:** proprietário e equipe que precisam consultar, filtrar e registrar operações rapidamente no PC e no iPhone.
- **Linguagem visual:** centro de operações de dados industriais, com editorialidade contida, hierarquia forte e sensação de confiança.
- **Dials:** variação visual 4/10; movimento 3/10; densidade de informação 8/10; dependência de assets 2/10; fidelidade à marca atual 9/10.

## Auditoria antes da edição

### Preservar

- O logotipo/identidade PE já usado no cabeçalho e a nomenclatura dos módulos.
- A navegação lateral e seus destinos `#producao`, `#clientes`, `#tipos`, `#comparacoes`, `#evolucao`, `#estatisticas`, `#rankings`, `#historico`, `#relatorios`, `#exportacao`, `#custos`, `#cobertura`, `#dados`, `#importacoes` e `#assistente`.
- O modo claro como padrão, o modo escuro alternável e a impressão em fundo branco.
- A ordem e os comportamentos dos formulários, filtros, importação de PDF, estoque, preços/custos e cadastro geográfico.
- O banco, os contratos tRPC, os identificadores de impressão, as tabelas, os dados persistidos e as permissões.

### Melhorar

- Hierarquia do cabeçalho e do contexto da página, para que o usuário entenda o estado atual antes de ler os gráficos.
- Navegação longa e plana, agrupando visualmente operações, análises e gestão sem remover itens ou mudar seus destinos.
- Ritmo de espaçamento, contraste, alinhamento, largura de leitura e densidade em telas pequenas.
- Cards, tabelas, estados de carregamento, vazios, erros, foco e feedback de ações.
- Consistência de bordas, elevação, ícones, títulos e cores de dados.
- Transições curtas e funcionais, respeitando `prefers-reduced-motion`.

### Remover

- Tratamento genérico de “dashboard com cards” quando não ajuda a leitura.
- Excesso de bordas e sombras concorrentes.
- Espaços e controles que não indicam claramente sua relação com os dados.
- Cores decorativas sem função semântica.

## Sistema visual proposto

**Paleta:** fundo marfim frio `#F7F9FB`; superfície `#FFFFFF`; texto principal azul-grafite `#132238`; texto auxiliar `#607086`; assinatura operacional teal `#0F766E`; teal claro `#DDF4F0`; acento de atenção âmbar `#B7791F`; erro `#B42318`; linhas `#DCE4EC`. O teal identifica ação e progresso; o âmbar indica atenção operacional; o azul-grafite mantém leitura profissional sem transformar o BI em uma tela preta.

**Tipografia:** manter DM Sans para leitura, tabelas e controles; manter Space Grotesk para títulos e números de destaque. Títulos devem usar menos palavras e maior contraste; rótulos operacionais ficam em caixa alta pequena somente quando isso melhora escaneabilidade.

**Espaçamento:** base de 4 px com ritmo principal de 8, 12, 16, 24 e 32 px. Conteúdo desktop usa largura máxima confortável; mobile usa padding lateral de 16 px e blocos com respiro suficiente para toque.

**Raio e elevação:** controles com raio 10 px; cards com raio 16 px; superfícies principais com uma única borda clara e sombra curta e difusa apenas quando houver mudança de plano. Evitar cartões aninhados sem necessidade.

**Interação e movimento:** transições de 150–180 ms com easing suave para hover, foco, abertura e seleção; entrada de conteúdo em fade/slide de baixa amplitude apenas em mudanças de módulo. Estados de carregamento usam skeleton ou feedback direto. Em `prefers-reduced-motion`, transições ficam instantâneas.

**Composição:** manter a sidebar como trilho estável. No conteúdo, criar um cabeçalho contextual, uma faixa de indicadores essenciais e blocos analíticos com agrupamento visual. A novidade visual fica concentrada em hierarquia e ritmo, não em efeitos.

## Contratos protegidos

Rotas, anchors, labels, componentes públicos, nomes dos campos, validações, autenticação, dados existentes, tabela de banco, impressão, PWA, responsividade e publicação devem permanecer compatíveis. A maior mudança permitida nesta etapa é a camada visual e a organização espacial.

**Maior risco:** melhorar a navegação sem ocultar itens importantes nem quebrar links diretos usados pelo programa Windows e pelo iPhone.

**Fallback:** as mudanças serão separadas em tokens globais, shell/navegação e superfícies de conteúdo; se uma alteração visual causar regressão, o bloco pode ser revertido sem tocar no backend ou no banco.


## Execução

O v0 foi aprovado antes da continuação. A camada visual entregue aplica a paleta operacional aos temas claro/escuro, moderniza a sidebar com agrupamento visual, adiciona cabeçalho contextual responsivo, reforça cards/KPIs/controles, atualiza a tela inicial e cria uma ponte de compatibilidade para os módulos analíticos que ainda usavam tokens slate. Rotas, anchors, formulários, dados, APIs e banco permanecem inalterados.
