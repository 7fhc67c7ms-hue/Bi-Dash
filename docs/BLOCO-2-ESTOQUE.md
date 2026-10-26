# Bloco 2 — Estoque auditável

## Regra preservada

O saldo é calculado por tipo de placa com a regra rígida adotada no projeto: `entrada` soma; `saida`, `descarte` e `devolucao` subtraem. A lista histórica da interface agora exibe a devolução com sinal negativo, alinhada ao cálculo do backend.

## Proteções implementadas

As mutações de criação, edição e exclusão verificam o saldo no servidor dentro de uma transação. Antes da operação, a linha do usuário é bloqueada com `FOR UPDATE`, serializando operações de estoque entre dispositivos e evitando que duas requisições consumam simultaneamente o mesmo saldo disponível.

Na edição, o movimento atual é excluído do cálculo antes de validar o novo movimento. Na exclusão, o registro é excluído do cálculo antes de verificar se a remoção deixaria saldo negativo. O update e o delete também conferem `affectedRows` para transformar uma corrida de versão em conflito real, sem criar auditoria falsa.

Quando o resultado projetado é negativo, o backend retorna erro `BAD_REQUEST` com o tipo de placa e o saldo projetado. A interface já exibe a mensagem ao usuário e mantém a sincronização indicada para erros de concorrência.

## Dados existentes

A consulta somente leitura anterior encontrou zero movimentos de estoque no banco centralizado. Portanto, a nova validação não precisou corrigir ou apagar saldos históricos.

## Validação

- `pnpm check`: passou.
- `pnpm test`: passou com 12 arquivos e 56 testes.
- `pnpm build`: passou.
- Teste unitário explícito: somente `entrada` gera delta positivo; os outros três movimentos geram delta negativo.

## Limitação conhecida

A proteção está pronta no backend, mas ainda não há um teste de integração automatizado que execute duas transações concorrentes contra uma cópia isolada do MySQL. A cobertura atual valida a fórmula e o typecheck; a concorrência real permanece pendente para o bloco de testes/infraestrutura.
