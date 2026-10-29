# Plano — reconstrução do BI Produção — Fotoporcelana

## Objetivo e limites

Reconstruir no novo projeto WebDev uma cópia funcional do BI a partir do repositório autorizado `7fhc67c7ms-hue/bi-dashboard-app`, preservando o comportamento visual e as funcionalidades do sistema atual, incluindo a correção de impressão do commit `f2a8441`. O projeto e a base de dados antigos permanecem intactos. O novo WebDev usa a sua própria base de dados MySQL; a transferência de registos e ficheiros será uma fase posterior, por exportação ou reimportação dos PDFs e da lista de clientes. Não alegar sincronização de dados antigos até a migração ser feita e validada.

## Abordagem

- Usar o código versionado mais recente no GitHub como fonte de verdade para frontend, módulos operacionais, API, esquema e migrações.
- Adaptar a integração de autenticação ao projeto WebDev novo, usando a identidade real do utilizador e sessões seguras tanto em Preview como em produção. Não criar utilizador de demonstração nem ignorar autenticação.
- Manter a base nova separada. Rever o esquema e as migrações do código antes de aplicar DDL; não executar migrações destrutivas nem apontar para a base antiga.
- Reutilizar os serviços geridos documentados para armazenamento/extração apenas se estiverem disponíveis neste projeto; manter segredos no ambiente do servidor e documentar qualquer integração que dependa de configuração.
- Preservar o modo PWA do sistema atual (manifesto, ícones, service worker e instalação em PC/iPhone) sem guardar respostas da API ou dados operacionais em cache offline.
- Preservar módulos e fluxos existentes, incluindo mapa, filtros, PDFs, produção, estoque, gestão industrial, análise de clientes e exportações; imprimir exclusivamente os blocos demarcados.
- Disponibilizar exclusão confirmada da importação e dos registos de produção vinculados ao PDF, sempre isolada pelo utilizador e executada transacionalmente. O armazenamento gerido expõe upload e leitura, mas não uma operação de exclusão física; informar que a remoção de registos do BI não apaga o binário original.
- Adaptar dependências e configurações ao toolchain do novo projeto sem substituir os ficheiros de infraestrutura gerida (Dockerfile, configuração do projeto, autenticação/runtime base e Git canónico) sem necessidade comprovada.

## Estrutura do projeto

- `client/src/`: aplicação React, páginas, dashboard, componentes funcionais, seleção de impressão e interface responsiva.
- `client/public/`: manifesto, ícones PWA, service worker e manifesto estático de rotas.
- `server/`: servidor Express/tRPC, autenticação, serviços e regras de negócio; integrações e variáveis de ambiente protegidas.
- `drizzle/`: schema e migrações MySQL versionadas e aditivas da base nova.
- `shared/`: contratos e utilitários partilhados entre frontend e backend.
- `plan.md` e `TODO.md`: decisões aprovadas e progresso dos resultados.

## Identidade visual

Reutilizar a identidade e o desenho já existentes no BI enviado pelo utilizador, em vez de inventar uma nova marca. Preservar a paleta, tipografia, navegação, densidade de informação e adaptação móvel que estão no código-fonte; reutilizar os ícones e recursos presentes. O caráter do produto é operacional, claro e analítico. Mudanças visuais ficam limitadas às adaptações necessárias para uma experiência utilizável no novo host.

## Dependências e publicação

A aplicação requer servidor e base de dados persistente. A inicialização já habilitou esses recursos no projeto novo. Manter o runtime de servidor na porta gerida configurada, compilar com as dependências e lockfile do projeto e publicar somente após existir checkpoint válido. O novo projeto terá endereço próprio; o endereço antigo não será substituído durante desenvolvimento. Confirmar integração real de autenticação, build, migrações e serviços antes de declarar o novo site pronto. A publicação é uma operação separada do checkpoint.

## Fase de dados

A primeira versão usa a base vazia do novo projeto e não acede à base do site antigo. Depois de validar o sistema, migrar registos por uma exportação/importação controlada ou reimportar PDFs e lista de clientes. PDFs armazenados no sistema antigo não migram apenas com o código. Antes de executar importações em lote, deduplicar e validar os dados com o utilizador; nunca apagar dados no sistema antigo.
