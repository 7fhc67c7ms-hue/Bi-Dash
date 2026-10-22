# Revisão visual e runtime — 25 de agosto de 2026

## Desktop

A página `/dashboard` apresenta sidebar persistente, identidade BI Produção/Porcelanas Evolution, hierarquia de cockpit operacional, zona de importação, seletor de meses, filtros dimensionais, quatro KPIs principais, cinco métricas avançadas, tabela, dois rankings, três blocos de gráficos, inteligência de mercado e histórico de importações. A revisão full-page confirmou que o conteúdo não fica cortado e que os estados vazios são legíveis.

## Mobile

Em viewport de 390x844, a sidebar colapsa para uma barra superior, o título quebra de forma natural, os botões ficam acessíveis, a zona de importação adapta-se a uma coluna e os cartões mantêm margens e contraste. As tabelas utilizam overflow horizontal quando necessário.

## Runtime

As chamadas observadas a `production.getAnalytics`, `production.getData` e `auth.me` retornaram HTTP 200 numa sessão autenticada. Com a base vazia, o dashboard mostra valores zero, mensagem de importação e estados vazios sem erro de API. Não foram observados erros no console do browser na revisão atual.

## Observação

A validação do fluxo real de IA depende de um PDF carregado pelo utilizador e de uma execução do serviço LLM. Os testes unitários cobrem normalização, aliases, deduplicação, resposta vazia, JSON inválido, filtros e métricas; o upload real deve ser validado com o PDF operacional da empresa após publicação/teste autenticado.
