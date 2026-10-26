# Bloco 6 — Compras e recebimento

## Entregue

Foram adicionadas as estruturas de fornecedores, pedidos de compra, linhas de pedido e recebimentos. Fornecedores possuem código, nome, documento, contato e ativação. Pedidos possuem código, fornecedor e status (`rascunho`, `solicitado`, `aprovado`, `parcial`, `recebido`, `cancelado`). Cada linha controla quantidade solicitada, recebida e custo unitário.

O recebimento é parcial por item e protegido por chave de idempotência. A confirmação valida fornecedor, produto ativo, pedido disponível e limite solicitado. Dentro da mesma transação, grava o recebimento, atualiza o saldo recebido, atualiza o status do pedido e cria movimento de estoque `entrada`.

## Interface

O módulo `Compras e recebimento` permite cadastrar fornecedor, criar pedido de um item, solicitar, aprovar e confirmar o saldo restante. A entrada de estoque só é criada na confirmação, nunca na criação ou aprovação do pedido.

## Validação

- Migração aplicada: `drizzle/0013_hot_captain_britain.sql`.
- Typecheck aprovado.
- Testes: 13 arquivos e 58 testes aprovados.
- Build de produção aprovado.
- Nenhuma produção histórica foi alterada.

## Limites

A interface inicial cria pedidos de um item por vez; o schema e o backend suportam múltiplas linhas. Cotação comparativa, aprovação por perfil e divergência documental ficam para a evolução de Compras avançadas e Segurança.
