# Plano de evolução — BI Produção

## Diretriz

Evoluir o projeto existente de forma incremental, preservando React 19, Vite, Tailwind 4, Express/tRPC, Drizzle/MySQL, PWA, Electron e a infraestrutura WebDev. Não recriar telas ou substituir tecnologias sem necessidade comprovada. Toda nova operação deve ter persistência real, validação no servidor, controle de duplicidade e testes.

## Ordem dos blocos

1. **Baseline e integridade do núcleo:** auditoria documentada; formalização de migrações; índices e idempotência de upload; testes de regressão.
2. **Estoque auditável:** invariantes de saldo, auditoria referencial, justificativas e concorrência, sem alterar a regra de cálculo vigente sem decisão explícita.
3. **Cadastros mestres mínimos:** produtos, materiais, unidades, categorias, depósitos e localizações, com compatibilidade progressiva com os textos existentes.
4. **Fichas técnicas versionadas:** componentes, quantidades, rendimento, perdas e snapshot utilizado em produção.
5. **PCP mínimo:** planos e ordens, estados, quantidades, datas, responsáveis, setores/máquinas e eventos idempotentes.
6. **Compras e recebimento:** fornecedores, solicitações, cotações/pedidos, aprovação, recebimento e entrada somente após conferência.
7. **Qualidade e rastreabilidade:** lotes, inspeções, critérios, bloqueio/liberação, não conformidades e ações.
8. **Produtos acabados, vendas e expedição:** pedidos, reservas, separação, expedição, entregas e devoluções comerciais.
9. **Custos industriais e rentabilidade:** custo teórico/real, direto/indireto, perdas, valorização documentada, preço e margens explícitas.
10. **Financeiro:** contas a pagar/receber, caixa, orçamento, resultado e ponto de equilíbrio separados do custo fabril.
11. **Manutenção, produtividade e alertas:** ativos, paradas, capacidade, metas configuráveis e alertas sem ações financeiras automáticas.
12. **Segurança, relatórios e operação:** perfis/permissões, auditoria global, exportações, backup/restauração e documentação final.

## Regras de integração

- Produção importada continua preservada; novas ordens e fichas usam snapshots para não alterar históricos.
- Pedido de compra não gera estoque; apenas recebimento confirmado gera evento de entrada.
- Eventos que alteram estoque terão uma chave de idempotência e transação.
- Indicadores sempre vêm de dados reais; ausência de dados aparece como indisponível, nunca como zero inventado.
- Custos industriais não serão apresentados como lucro líquido; componentes ausentes serão explicitados.
- Permissões serão verificadas no backend, não apenas ocultadas na interface.
- Offline só será anunciado depois de fila, autenticação, conflitos e testes implementados.

## Design preservado

### Design Read
- Artefato: dashboard operacional multi-dispositivo.
- Público: gestão e operação de uma fábrica de fotoporcelana.
- Linguagem visual: industrial data center, informativa e sóbria.
- Modo: extensão/preservação do redesign já publicado.
- Variação visual: 3/10; movimento: 2/10; densidade: 8/10; dependência de assets: 2/10; fidelidade à identidade atual: 9/10.

### Decisões
- Paleta: azul-grafite e teal operacional, com superfícies claras no modo claro e contraste controlado no modo escuro.
- Tipografia: manter a tipografia e tokens já aprovados em `client/src/index.css`.
- Espaçamento: manter a escala existente; novas telas reutilizam componentes UI já presentes.
- Raio/sombras: manter cartões e controles do redesign, evitando efeitos decorativos.
- Movimento: transições curtas, estados de carregamento claros e respeito a `prefers-reduced-motion`.
- Layout: navegação lateral/toolbar existente, com tabelas densas no desktop e cartões/folhas de ação no mobile.

## Estrutura

- `server/`: routers, regras de domínio, persistência e testes.
- `drizzle/`: schema, relações e migrações aditivas.
- `client/src/components/`: componentes reutilizáveis e módulos de interface.
- `client/src/pages/`: rotas e composição de páginas.
- `shared/`: tipos e funções compartilhadas.
- `docs/`: auditorias, decisões, regras e manual de uso.
- `desktop/`: cliente portátil Windows apontando para a publicação.

## Critério de conclusão por bloco

Um bloco só será marcado como concluído quando sua lógica estiver persistida, integrada ao fluxo afetado, protegida por validação/permissão, coberta por testes relevantes e documentada. Implementação visual sem backend não será considerada concluída.
