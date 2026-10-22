# Auditoria inicial — BI Dashboard

## Estado observado

O projeto está em React 19, Tailwind 4, Express/tRPC, Drizzle/MySQL e autenticação Manus. O frontend já contém cards, tabela, rankings, gráficos, seletor de meses e upload; o componente de sidebar existente ainda é um template genérico e não está integrado no dashboard principal.

## Problemas críticos encontrados

| Área | Observação | Impacto |
|---|---|---|
| Banco de dados | O log de runtime mostra `production.getAnalytics` a falhar com erro 500 ao consultar `production_data` filtrando por mês. | O dashboard fica em carregamento infinito ou sem dados. |
| API | Existe upload, leitura e eliminação, mas não há criação manual nem atualização. A eliminação não restringe pelo `userId`. | Operação incompleta e risco de acesso cruzado entre utilizadores. |
| Upload | O contrato tRPC recebe `Buffer` diretamente, enquanto o browser envia `Uint8Array` com cast. | Fluxo frágil em produção; deve ser usado um payload serializável/base64 ou endpoint de multipart compatível. |
| Importação | O ano é inferido do ano atual e o ficheiro não fica associado aos registros. | Auditoria histórica e correção de anos ficam comprometidas. |
| Deduplicação | Cada processamento insere linhas sem idempotência por ficheiro/romaneio. | Reimportações podem duplicar produção. |
| Frontend | O dashboard atual não usa a `DashboardLayout`, não oferece CRUD de linhas, histórico de uploads ou filtros dimensionais. | UX abaixo de uma ferramenta BI operacional. |
| Visual | Falta uma linguagem visual consistente com navegação, tipografia e estados de erro bem definidos. | Aparência de protótipo e menor clareza operacional. |
| Testes | Os testes atuais cobrem principalmente funções puras; não cobrem filtros de integração, segurança, CRUD, contrato de importação nem layouts alternativos de PDF. | Regressões críticas podem passar despercebidas. |

## Direção de implementação

A evolução será feita em duas frentes. A primeira é transformar a ingestão num fluxo idempotente, auditável e editável, preservando a origem e permitindo correções manuais. A segunda é transformar o dashboard num cockpit operacional, com sidebar persistente, filtros dimensionais, métricas avançadas, insights acionáveis e exportação.

A análise de mercado será apresentada separando dados observados, inferências e hipóteses. Quando não existir uma estatística pública confiável específica para fotoporcelana, isso será declarado em vez de preencher a lacuna com estimativas não verificáveis.
