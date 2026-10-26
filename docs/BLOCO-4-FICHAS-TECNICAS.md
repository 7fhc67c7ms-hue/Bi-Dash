# Bloco 4 — Fichas técnicas versionadas

## Entregue

O projeto agora possui as tabelas `product_formulas` e `formula_components`. Cada ficha pertence ao usuário, aponta para um produto do catálogo, recebe uma versão sequencial por produto e registra status (`rascunho`, `ativa` ou `inativa`), rendimento, perda técnica, início de vigência e observação.

Os componentes também usam IDs do catálogo, quantidade por unidade de rendimento, perda própria e observação. A combinação ficha/componente é única. O backend valida que produto, unidade de relacionamento e componentes pertençam ao mesmo usuário, estejam ativos e que não haja componente repetido.

A ativação é transacional: ao ativar uma versão, outras versões ativas do mesmo produto são inativadas. A criação da ficha e seus componentes acontece em uma única transação; uma falha não deixa uma ficha sem componentes.

## Interface e cálculo

O módulo `Fichas técnicas` está disponível no menu e no seletor do dashboard. É possível criar uma ficha, adicionar/remover componentes, definir quantidade, perdas e estado inicial, consultar o histórico de versões e ativar/inativar versões.

O endpoint protegido `formulas.calculateTheoretical` e a função determinística `calcularConsumoTeorico` calculam, para uma quantidade a produzir, o consumo-base e o consumo com perda da ficha e de cada componente. O cálculo não altera estoque nem produção histórica.

## Migração e validação

- Migração aplicada: `drizzle/0011_handy_ghost_rider.sql`.
- As tabelas e FKs são aditivas e apontam para `catalog_items`; nenhuma produção histórica foi alterada.
- `pnpm check`: passou.
- `pnpm test`: passou com 13 arquivos e 58 testes.
- O cálculo unitário de rendimento/perdas possui testes próprios.

## Limites mantidos para evitar falsa integração

O custo teórico ainda não é calculado automaticamente porque o catálogo atual ainda não possui uma tabela histórica de custo por `catalogItemId`; os preços legados usam `tipoPlaca`. Essa integração ficará no Bloco 9, quando a valorização por item, lote e período for criada.

O snapshot da ficha usada por uma ordem ficará no Bloco 5, junto com as ordens de produção. Não há ordem de produção no sistema atual para receber esse snapshot sem inventar dados.
