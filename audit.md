# Auditoria incremental — BI Produção

Data: 2026-10-25
Escopo: comparação do projeto existente com `Pasted_content_12.txt`, sem alterações de código ou banco durante a auditoria.

## Resumo executivo

O projeto é um BI operacional funcional para produção mensal por cliente/modelo, com importação de PDF, analytics, CRUD de registros, estoque simples, preços/custos básicos, consumo de insumos, mapa de clientes, exportação, assistente de IA, PWA e cliente Windows remoto. Ele ainda não é um ERP industrial completo. A estratégia segura é evoluir por blocos, preservando as funcionalidades existentes e evitando migrações destrutivas.

Baseline observado: `pnpm check` passou; `pnpm test` passou com 12 arquivos e 55 testes. Os testes de respostas inválidas do extrator de PDF produzem mensagens esperadas.

## Matriz de auditoria

| Módulo | Classificação | Evidência / limitação principal |
|---|---|---|
| Autenticação e isolamento básico | EXISTENTE E FUNCIONAL | `server/_core/trpc.ts`, `server/routers.ts`; procedures protegidas e filtros por `userId`. Ainda falta matriz granular por papel/ação. |
| Dashboard, navegação e analytics | EXISTENTE E FUNCIONAL | `client/src/pages/Dashboard.tsx`, `client/src/components/*`, `server/analytics.ts`; cálculos reais dentro do recorte mensal atual. |
| Produção manual e consulta | EXISTENTE E FUNCIONAL | CRUD em `server/routers.ts`/`server/db.ts` e telas de produção. Não é ainda PCP/ordem industrial. |
| Importação PDF | EXISTENTE, MAS INCOMPLETO | Parser, storage, hash, status e deduplicação lógica existem. Falta unicidade no banco e transação única abrangendo upload, linhas e status final. |
| Estoque | EXISTENTE, MAS COM DEFEITO/INCOMPLETO | Movimentos, saldo, edição concorrente e auditoria existem. Faltam saldo negativo protegido, depósito, lote, validade, reserva, inventário e integração com produção/compras/vendas. A semântica de devolução deve permanecer conforme a regra já adotada até mudança explícita. |
| Auditoria de estoque | EXISTENTE, MAS INCOMPLETO | Snapshots existem, mas faltam FK para movimento, justificativa/autor detalhados e trilha global de alterações. |
| Preços, insumos e custos básicos | EXISTENTE, MAS INCOMPLETO | Histórico de preços, insumos e consumos existem. Faltam BOM, mão de obra, CIF, energia, perdas, lotes, OP, valorização e composição contábil completa. |
| Formação de preço/rentabilidade | EXISTENTE, MAS INCOMPLETO | Há custo/preço/margem estimada. Não há impostos, comissão, frete, descontos, canais, markup documentado ou lucro líquido real. |
| Clientes/mapa | EXISTENTE, MAS INCOMPLETO | Cadastro geográfico e mapa funcionam. Falta cadastro comercial, contatos, pedidos e vínculo por FK com vendas/produção. |
| Relatórios/exportações | EXISTENTE, MAS INCOMPLETO | CSV/PDF/HTML/impressão e filtros do BI atual existem. Faltam relatórios industriais, financeiros e de auditoria completos. |
| Assistente de IA | EXISTENTE E FUNCIONAL | `assistant.chat` usa contexto real e é protegido. Não persiste conversas nem executa automações. |
| Cadastros mestres industriais | INEXISTENTE | Não há entidades formais para produtos, materiais, unidades/conversões, categorias, depósitos, máquinas, pessoas, fornecedores, centros de custo e processos. |
| Fichas técnicas/BOM/receitas | INEXISTENTE | Não há estrutura versionada de materiais, rendimento, roteiro ou snapshot histórico. |
| PCP/ordens de produção | INEXISTENTE | Não há plano mestre, ordens, estados, capacidade, reservas ou consumo por ordem. |
| Compras/fornecedores | INEXISTENTE | Não há solicitação, cotação, pedido, aprovação, recebimento ou avaliação. |
| Qualidade/rastreabilidade | INEXISTENTE | Não há inspeções, lotes bloqueados, não conformidades, CAPA ou rastreabilidade fabril. |
| Manutenção/paradas | INEXISTENTE | Não há ativos, manutenção, ordens, paradas, MTBF ou MTTR. |
| Vendas/expedição/financeiro | INEXISTENTE | Não há pedidos, faturamento, expedição, contas a pagar/receber, fluxo de caixa ou orçamento. |
| Alertas/automação | INEXISTENTE | Não há regras, destinatários, deduplicação ou jobs de alertas. |
| Responsividade/PWA/Windows | EXISTENTE E FUNCIONAL | Interface responsiva, PWA e Electron remoto existem; não há offline transacional. |
| Segurança/backup/LGPD operacional | EXISTENTE, MAS INCOMPLETO | Sessão e isolamento básico existem. Faltam permissões granulares, auditoria global, backup/restauração testados e política técnica de retenção. |
| Testes | EXISTENTE, MAS INCOMPLETO | 55 testes cobrem funções principais; faltam integração MySQL, concorrência, migrações, permissões e invariantes dos novos módulos. |

## Riscos prioritários

1. `production_uploads.fileHash` não possui unicidade composta por usuário; a checagem em aplicação tem corrida concorrente.
2. O upload atual não mantém, em uma mesma transação, linhas inseridas e status final do upload.
3. Há migração implícita por `ALTER TABLE` em inicialização (`server/db.ts`), fora do histórico Drizzle.
4. O estoque atual não possui restrições de domínio para saldo negativo, depósito, lote ou inventário.
5. Movimentos, preços, insumos e clientes não possuem regras suficientes de unicidade contra equivalentes duplicados.
6. Não existe autorização granular por módulo/ação; `protectedProcedure` não substitui uma política de permissões.
7. O PWA é online-first; não deve ser apresentado como offline sem fila, conflitos e testes reais.

## Blocos incrementais aprovados

- **Bloco 0 — Baseline e documentação:** congelar evidências, matriz, plano, backlog e convenções; não altera dados.
- **Bloco 1 — Integridade do núcleo:** formalizar migração existente, adicionar índices/restrições não destrutivos após checagem de duplicidades, reforçar testes e idempotência de importação.
- **Bloco 2 — Estoque auditável:** manter a regra atual de saldo, adicionar invariantes, justificativa e FK de auditoria; depois preparar depósitos/lotes sem quebrar o modelo textual atual.
- **Bloco 3 — Cadastros mestres mínimos:** produtos/materiais/unidades/categorias/depostos com IDs, mantendo compatibilidade com `tipoPlaca`.
- **Bloco 4 — Fichas técnicas versionadas:** BOM, rendimento, perdas técnicas, vigência e snapshot histórico.
- **Bloco 5 — PCP mínimo:** ordens de produção, estados, quantidades, datas, setor/máquina e histórico, com eventos idempotentes.
- **Bloco 6 — Compras e recebimento:** fornecedores, solicitações, pedidos, aprovação e recebimento; estoque somente após recebimento confirmado.
- **Bloco 7 — Qualidade e rastreabilidade:** lotes, inspeções, bloqueio/liberação, não conformidade, retrabalho e refugos.
- **Bloco 8 — Produtos acabados, vendas e expedição:** pedidos, reservas, separação, entrega, devolução comercial e disponibilidade.
- **Bloco 9 — Custos e formação de preço industrial:** composição teórica/real, custos diretos/indiretos, perdas, markup, margens e rastreabilidade dos cálculos.
- **Bloco 10 — Financeiro operacional:** contas a pagar/receber, caixa, orçamento e resultado separados de custos de fabricação.
- **Bloco 11 — Manutenção, produtividade e alertas:** ativos, paradas, capacidade, indicadores configuráveis e alertas deduplicados.
- **Bloco 12 — Segurança, relatórios e operação:** permissões granulares, auditoria global, exportações por filtros, backup/restauração e documentação final.

Nenhum bloco declara o sistema completo antes de ter lógica real, persistência, testes e integração com os módulos relacionados.
