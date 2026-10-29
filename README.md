# BI Produção — Fotoporcelana

React / Express / tRPC / Drizzle starter, adapted from the Sandbox web-db-user template.

- `pnpm dev`: development server; honors `PORT` (default 3000).
- `pnpm build` / `pnpm start`: build and serve `dist/index.js` and `dist/public/`.
- `pnpm db:migrate`: apply checked-in migrations. `pnpm db:push`: generate and apply new schema changes.
- `pnpm check` / `pnpm test`: types and application tests.

Start with the Webdev skill's default-template guide. Platform login, storage, payments and service contracts live in its shared references; read the relevant capability before extending its helper.

`server/_core/publicConfig.ts` exposes only named public runtime values. Private keys stay server-side. The platform serves managed `/manus-storage/` assets; the application does not register a second proxy.

Platform configuration is readable and editable through `webdev.config`. Default settings are initial values, not enforced constraints. The agent may modify the files, commands and configuration or follow the flexible guide for another stack.

## BI Produção

Este projeto incorpora o código do BI Produção — Fotoporcelana: dashboard e filtros, importação/histórico de PDFs, análise e gestão de produção, exportações, impressão com seleção, estoque, módulos industriais, análise de clientes, mapa e cobertura. O login usa Manus OAuth do projeto atual; nunca colocar credenciais no frontend.

### Desenvolvimento e migrações

Use `pnpm dev` para Preview, `pnpm check` para TypeScript, `pnpm test` para a suite e `pnpm build` para a compilação de produção. As migrações existentes ficam em `drizzle/`; reveja o SQL gerado antes de executar `pnpm exec drizzle-kit migrate`. Não use `db:push` sem uma revisão de schema e DDL.

A base ligada a este projeto é nova e independente da base do site antigo. Nenhum registo ou PDF antigo é copiado pelo código. A migração futura exige exportação/importação ou reenvio dos PDFs e da lista de clientes.

### PWA, PDFs e limites conhecidos

O manifesto e os ícones estão em `client/public/`; o service worker é instalado apenas em produção e não armazena respostas `/api/`. Depois de publicar, abra o endereço HTTPS: no computador use a opção de instalar aplicação do navegador; no iPhone, abra no Safari, toque em Partilhar e selecione “Adicionar ao ecrã principal”. Os dois dispositivos partilham os dados depois de autenticados, com Internet.

Excluir uma importação elimina do banco a importação e os registos de produção vinculados. O storage gerido oferece upload e leitura, mas não a exclusão física do objeto; a interface informa que o PDF original pode continuar armazenado. Extração automática depende do serviço de IA e da disponibilidade da quota do projeto.
