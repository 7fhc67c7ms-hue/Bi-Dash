# TODO — BI Produção — Fotoporcelana

## Código-fonte atual integrado no novo projeto

- O novo site deve usar como fonte o código mais recente de `7fhc67c7ms-hue/bi-dashboard-app`, incluindo as alterações já versionadas e a correção de impressão `f2a8441`.
- O website e a base de dados antigos devem permanecer intactos durante toda a reconstrução.
- Preservar a identidade visual e o comportamento existentes, adaptando somente as integrações exigidas pelo novo ambiente.

## Autenticação real no novo WebDev

- Login, sessão, logout e permissões devem funcionar no Preview e na publicação com uma identidade real.
- Nenhum bypass de autenticação, sessão fictícia ou utilizador de demonstração.
- Credenciais e segredos devem ficar apenas no servidor/configuração protegida.

## Dashboard e módulos operacionais

- Preservar dashboard e indicadores de produção, filtros por período/ano/cliente/tipo/segmento e análises/exportações existentes.
- Preservar importação e histórico de PDFs, gestão e análise de produção, controle de estoque, gestão industrial e análise por cliente conforme o código-fonte.
- Preservar o mapa/cobertura de clientes e os fluxos de inclusão de localizações presentes no projeto.
- O comportamento dos dados no novo sistema só pode ser anunciado como sincronizado após estar persistido na nova base e testado entre sessões/dispositivos.

## Impressão de seleção

- Ao demarcar blocos e imprimir, a saída deve conter apenas os blocos abrangidos pela seleção; elementos e seções não selecionados não podem aparecer.
- Sem uma seleção ativa, a impressão normal da página atual continua disponível.
- A folha temporária de seleção deve ser removida após fechar a impressão.

## Exclusão de PDFs importados

- Disponibilizar no histórico uma ação por importação, com confirmação explícita antes da remoção.
- A ação deve remover o registro da importação e todos os dados de produção vinculados pelo seu identificador, sem remover dados de outro utilizador ou de outra importação.
- O schema novo liga registros importados ao PDF; PDFs históricos reimportados depois estarão vinculados e podem ser removidos por esta ação.
- A API de armazenamento gerida não fornece exclusão física do objeto; informar na confirmação/retorno que os dados indexados são apagados do BI, mas o binário original pode permanecer no storage.

## PWA e uso em computador/iPhone

- O novo site deve ser instalável como aplicação no computador e no ecrã principal do iPhone usando o mesmo endereço publicado.
- Manifesto, ícones e service worker devem ser coerentes com a marca existente.
- Não armazenar respostas da API nem dados operacionais em cache/offline; operações de escrita e dados partilhados requerem Internet.

## Base de dados, PDFs e integrações

- A versão nova deve usar uma base de dados separada, sem ligação, migração destrutiva ou escrita na base de produção antiga.
- Schema e migrações devem estar versionados, ser compatíveis e aplicados apenas à base nova.
- Armazenamento e extração de PDF dependem dos serviços disponíveis e configurados no projeto novo; qualquer segredo ausente ou função bloqueada deve ser documentado com precisão.
- Os registos e PDFs antigos não são transferidos automaticamente pelo clone do código. A etapa posterior deve permitir migração por exportação/importação ou reenvio de PDFs/lista de clientes sem alegar que dados históricos já estão disponíveis.

## Preview, publicação e entrega

- O Preview deve carregar com autenticação real, API e schema compatíveis.
- A versão deve ser salva como checkpoint na branch canónica do novo projeto antes da publicação.
- A publicação só pode ser declarada concluída após confirmação do resultado e URL permanente fornecida pela plataforma.
- O site antigo deve continuar disponível até o utilizador validar a cópia nova e decidir sobre a migração.
