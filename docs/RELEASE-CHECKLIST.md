# Checklist de release — BI Produção

Este checklist evita gerar um instalador apontando para uma publicação antiga.

## Etapa 1 — Código

- [x] Código de produção, estoque e análise por cliente versionado na branch `main`.
- [x] Testes, typecheck e build executados.
- [x] Migration `drizzle/0004_stock_movements.sql` registrada no projeto WebDev.

## Etapa 2 — Publicação

- [ ] Publicação WebDev nova concluída.
- [ ] URL pública definitiva confirmada.
- [ ] Login, importação de PDF, controle de estoque e análise por cliente validados na URL pública.

## Etapa 3 — Instalador Windows

- [ ] Atualizar `desktop/main.cjs` com a URL pública definitiva.
- [ ] Incrementar a versão em `package.json`.
- [ ] Gerar instalador NSIS e versão portátil.
- [ ] Verificar que o instalador mantém o mesmo `appId` (`com.bidashapp.fotoporcelana`) para permitir instalação por cima de versões anteriores.
- [ ] Testar o instalador e registrar SHA-256 dos arquivos.

Com a URL definitiva confirmada, a sequência reproduzível é:

```bash
node desktop/update-dashboard-url.cjs https://URL-PUBLICA-DEFINITIVA
pnpm version patch --no-git-tag-version
pnpm build
CSC_IDENTITY_AUTO_DISCOVERY=false pnpm exec electron-builder --win nsis portable --config.forceCodeSigning=false
```

## Checkpoints obrigatórios

Cada etapa deve ser salva com um commit descritivo no GitHub antes de iniciar a próxima. Nunca gerar o instalador final enquanto a URL pública ainda for provisória.
