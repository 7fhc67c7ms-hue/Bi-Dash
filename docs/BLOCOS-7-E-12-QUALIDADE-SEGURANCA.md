# Blocos prioritários 7 e 12 — Qualidade, rastreabilidade e segurança

## Por que estes dois blocos foram priorizados

Depois de produção, fichas, PCP, compras e recebimento, os riscos mais graves são liberar produto sem inspeção e não conseguir explicar quem executou uma operação crítica. Por isso foram priorizadas qualidade/rastreabilidade e auditoria/permissões.

## Qualidade e rastreabilidade

Foram adicionadas as tabelas `quality_inspections` e `quality_non_conformities`. Uma inspeção pode ser ligada a uma ordem de produção ou recebimento, item, critério, amostra, resultado e status (`aberta`, `aprovada`, `reprovada`, `bloqueada`). Não conformidades registram código, causa, ação corretiva e status.

O backend protegido permite abrir/revisar inspeções e registrar não conformidades. Cada criação e revisão gera um evento de auditoria. Nenhuma tabela de produção ou estoque histórico foi alterada.

## Segurança, auditoria e operação

Foi criada a tabela `audit_events`, com usuário, ação, entidade, entidadeId, dados resumidos e data. O router oferece consulta própria e consulta administrativa protegida por `role=admin`; usuários comuns recebem `FORBIDDEN` na consulta administrativa.

## Validação

- Migração aplicada: `drizzle/0014_sad_human_torch.sql`.
- `pnpm check`: passou.
- `pnpm test`: 13 arquivos e 58 testes aprovados.
- `pnpm build`: passou.

## Limites explícitos

Este bloco entrega o núcleo persistente e protegido, mas a tela dedicada de qualidade e a matriz completa de perfis ainda são evoluções de interface/operação. Backup externo, restauração testada e retenção também exigem configuração operacional do ambiente; não foram simulados nem declarados como concluídos.
