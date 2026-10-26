# Backlog incremental — BI Produção

## Bloco 0 — Auditoria e baseline
- [x] Auditar diretórios, dependências, schema, migrações, APIs, telas, permissões, PWA, Electron e testes.
- [x] Classificar os módulos em funcional, incompleto, defeituoso ou inexistente.
- [x] Registrar riscos de duplicidade, concorrência, migração, segurança e dados fictícios.
- [x] Registrar plano técnico e visual sem substituir a arquitetura existente.
- [x] Confirmar baseline de typecheck e testes automatizados existentes.

## Bloco 1 — Integridade do núcleo e importação idempotente
- [x] Verificar duplicidades existentes antes de criar restrições; não apagar nem consolidar registros automaticamente. Resultado da leitura: 9 uploads, nenhuma duplicidade por usuário/hash.
- [x] Formalizar em migração controlada qualquer alteração atualmente feita implicitamente na inicialização. A migração `drizzle/0009_dear_mathemanic.sql` cria somente o índice único composto.
- [x] Impedir duas importações concorrentes do mesmo arquivo por usuário sem quebrar reprocessamentos legítimos, usando a restrição do banco e `claimProductionUpload`.
- [x] Garantir que upload, registros importados e status final permaneçam coerentes em falha ou repetição, usando `completeProductionUpload` em transação e limpeza de tentativas falhas.
- [x] Preservar o parser, filtros e histórico já existentes; a chave de storage passou a ser determinística apenas para novas tentativas do mesmo hash.
- [ ] Criar e executar teste de integração real de idempotência concorrente e falha parcial contra um banco isolado; a suíte atual e o typecheck foram executados, mas não substituem esse teste.

## Bloco 2 — Estoque auditável
- [x] Preservar a regra vigente de cálculo de saldo: entrada positiva; saída, descarte e devolução subtraem.
- [x] Validar quantidades, saldo negativo e concorrência no servidor, com lock por usuário e `FOR UPDATE`.
- [ ] Vincular auditoria ao movimento quando compatível e registrar autor, justificativa e estado anterior/novo. O vínculo lógico existente permanece; a melhoria detalhada de snapshots fica pendente.
- [ ] Permitir filtros e exportação do histórico sem duplicar lançamentos. A consulta atual permanece funcionando; filtros avançados serão entregues com os cadastros/relatórios.
- [x] Criar testes unitários da regra de sinais e validar typecheck, suíte existente e build; teste MySQL concorrente isolado permanece pendente.

## Bloco 3 — Cadastros mestres mínimos
- [x] Implementar entidades aditivas para produto/material, unidade, categoria e depósito/localização.
- [x] Preservar `tipoPlaca` e dados históricos, adicionando campo ponte `tipoPlacaLegado` sem migração destrutiva.
- [x] Validar identificadores, relacionamentos de unidade/categoria e duplicidades no backend.
- [ ] Integrar os IDs aos movimentos de estoque, preços e insumos existentes; a integração gradual fica para os blocos estruturados seguintes.

## Bloco 4 — Fichas técnicas versionadas
- [x] Criar ficha técnica, versão, componentes, quantidades, unidade, rendimento e perdas técnicas.
- [x] Calcular consumo teórico sem alterar produções antigas; custo teórico automático permanece pendente até existir custo histórico por `catalogItemId`.
- [ ] Preservar snapshot da ficha usada por cada ordem; depende do Bloco 5, pois ainda não existe ordem de produção persistida.

## Bloco 5 — PCP e ordens de produção
- [x] Criar plano/ordem com status, quantidades planejadas/iniciadas/produzidas/aprovadas/rejeitadas, datas e prioridade.
- [x] Vincular setor e responsável quando cadastrados; máquina permanece pendente de cadastro de ativos.
- [x] Registrar pausas, retomadas, cancelamento, conclusão e histórico de eventos.
- [ ] Integrar reservas/consumo/produção acabada usando eventos idempotentes; depende dos blocos de compras, qualidade e expedição.

## Bloco 6 — Compras e recebimento
- [x] Criar fornecedores e pedidos com status de rascunho, solicitação e aprovação; cotações comparativas permanecem pendentes.
- [x] Registrar recebimento parcial/integral por item com limite de quantidade e chave idempotente; conferência documental avançada permanece pendente.
- [x] Gerar entrada de estoque somente após recebimento confirmado, na mesma transação da atualização do pedido.

## Bloco 7 — Qualidade e rastreabilidade
- [x] Criar inspeções, critérios, amostras, resultados e aprovação/rejeição/bloqueio; planos reutilizáveis permanecem pendentes.
- [x] Registrar não conformidades, causas, ações corretivas e estados de tratamento; lotes/refugo/retrabalho permanecem pendentes.
- [x] Vincular qualidade a recebimento, produção e produto por IDs.

## Bloco 8 — Produtos acabados, vendas e expedição
- [ ] Criar pedidos, reservas, separação, expedição, entrega, devolução e avaria.
- [ ] Controlar disponibilidade por produto/lote/localização.
- [ ] Integrar faturamento operacional e rentabilidade somente com dados reais.

## Bloco 9 — Custos industriais e preço
- [ ] Separar custos diretos/indiretos, fixos/variáveis e despesas não fabris.
- [ ] Calcular composição teórica/real por produto, lote, ordem, setor e período.
- [ ] Documentar método de valorização e explicar origem de cada valor.
- [ ] Diferenciar markup, margem bruta, contribuição, lucro estimado e lucro líquido.

## Bloco 10 — Financeiro
- [ ] Criar contas a pagar/receber, vencimentos, pagamentos/recebimentos, caixa e orçamento.
- [ ] Calcular resultado operacional e ponto de equilíbrio apenas com componentes disponíveis.
- [ ] Integrar compras/vendas sem confundir custo, despesa, tributo e receita.

## Bloco 11 — Manutenção, produtividade e alertas
- [ ] Criar ativos, manutenção preventiva/corretiva, ordens, paradas e histórico.
- [ ] Calcular produtividade, capacidade, utilização, atrasos e gargalos com fórmulas documentadas.
- [ ] Criar alertas configuráveis, prioritários e deduplicados; nenhuma ação financeira automática sem autorização.

## Bloco 12 — Segurança, relatórios e operação
- [x] Validar a consulta administrativa de auditoria no backend por `role=admin`; matriz completa de permissões permanece pendente.
- [x] Criar auditoria global para inspeções, revisões e não conformidades; ampliar cobertura para todas as operações críticas permanece pendente.
- [x] Preservar os relatórios existentes com filtros, CSV/Excel/PDF.
- [ ] Documentar backup, restauração, retenção e limitações; testar restauração antes de declarar concluído.
- [ ] Validar desktop, iPhone/PWA, acessibilidade, erros de conexão e regressões.

## Regra de status

Itens só passam para concluído com evidência de persistência, integração, testes e documentação. Interfaces sem ação real, números fixos, integrações fictícias ou módulos apenas simulados permanecem abertos.

## Melhoria prioritária — fila sequencial de PDFs
- [x] Permitir selecionar ou arrastar múltiplos PDFs de produção em uma única operação.
- [x] Limitar a fila do navegador a no máximo 20 PDFs, mantendo o limite de 15 MB por arquivo.
- [x] Processar estritamente um PDF por vez, aguardando a conclusão do anterior.
- [x] Exibir status individual de cada arquivo: aguardando, processando, concluído, duplicado evitado ou erro.
- [x] Continuar a fila após falha individual e preservar a mensagem de erro do arquivo.
- [x] Reutilizar a idempotência existente do backend para não duplicar dados em reenvios.
