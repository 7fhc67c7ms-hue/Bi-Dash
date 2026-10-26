# Bloco 5 — PCP e ordens de produção

## Entregue

Foram adicionadas as tabelas `production_orders` e `production_order_events`. Uma ordem possui código único por usuário, produto, ficha técnica opcional, quantidades planejada/iniciada/produzida/aprovada/rejeitada, prioridade, setor, responsável, datas, observação e status (`rascunho`, `planejada`, `em_producao`, `pausada`, `concluida`, `cancelada`).

Ao criar uma ordem com ficha ativa, o backend salva um `formulaSnapshot` JSON com versão, rendimento, perdas e componentes. Assim, futuras alterações da ficha não reescrevem o contexto original da ordem.

Eventos de planejar, iniciar, pausar, retomar, produzir, aprovar, rejeitar, concluir e cancelar são persistidos com chave de idempotência única por usuário. Repetições da mesma chave retornam sucesso sem duplicar o evento ou somar novamente a quantidade.

## Interface

O módulo `Ordens de produção` está disponível no dashboard. Permite criar a ordem, selecionar produto, ficha ativa, setor, prioridade, responsável e prazo, além de operar a fila com planejar, iniciar, pausar, retomar, concluir e cancelar.

## Validação

- Migração aplicada: `drizzle/0012_opposite_sway.sql`.
- Nenhuma tabela histórica foi alterada.
- `pnpm check`: passou.
- `pnpm test`: 13 arquivos e 58 testes aprovados.
- `pnpm build`: passou.

## Próximas integrações

A geração automática de reserva/consumo de estoque e produto acabado será feita após a estrutura de compras, lotes, qualidade e expedição, para que esses eventos não sejam simulados nem contabilizados duas vezes.
