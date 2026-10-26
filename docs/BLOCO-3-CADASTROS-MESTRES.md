# Bloco 3 — Cadastros mestres mínimos

## Escopo implementado

Foram adicionadas quatro estruturas novas e isoladas por usuário: `master_units` para unidades de medida e casas decimais; `master_categories` para categorias/famílias; `catalog_items` para produtos acabados, intermediários, itens em processo, matérias-primas, insumos, componentes e embalagens; e `storage_locations` para depósitos, setores e localizações.

Cada estrutura possui identificador próprio, validação no router, chaves estrangeiras, índices únicos por usuário e campo de ativação. Um item exige unidade ativa e pode referenciar uma categoria ativa. O campo opcional `tipoPlacaLegado` preserva a ponte com os nomes históricos sem converter nem apagar `tipoPlaca`.

## Interface

O novo módulo `Cadastros mestres` está disponível no menu do dashboard e no seletor de módulos. Ele permite cadastrar e inativar/reativar unidades, categorias, itens e localizações, com feedback de sucesso/erro e layout responsivo para PC e iPhone.

## Regras de preservação

Nenhuma tabela histórica foi recriada ou alterada. Estoque, preços, insumos, produção e clientes continuam usando suas estruturas existentes. A integração operacional desses IDs com movimentos, fichas técnicas, compras e ordens será feita nos blocos seguintes, sempre por eventos e migrações aditivas.

## Validação

- Verificação prévia: as quatro tabelas não existiam no banco.
- Migração aplicada: `drizzle/0010_large_mister_sinister.sql`.
- Banco verificado: quatro tabelas, chaves estrangeiras e índices únicos presentes.
- `pnpm check`: passou.
- `pnpm test`: passou com 12 arquivos e 56 testes.
- `pnpm build`: passou.

## Pendências do próximo bloco

Os movimentos de estoque ainda aceitam o texto histórico `tipoPlaca`; a seleção por `catalogItemId`, depósito, lote e localização será adicionada somente quando o bloco de fichas técnicas/estoque estruturado estiver pronto, para não alterar o comportamento atual de forma parcial.
