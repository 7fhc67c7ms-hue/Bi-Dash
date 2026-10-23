

## Atualização aprovada — clientes por cidade e estado

Adicionar uma seção de cobertura geográfica com cadastro de clientes contendo nome, CEP opcional, cidade e UF. O CEP será consultado primeiro no ViaCEP; quando estiver inválido ou desatualizado, o fluxo usará cidade e UF para validar a localidade pela API oficial do IBGE e permitirá concluir o cadastro sem endereço completo. A aplicação armazenará apenas a granularidade necessária para o mapa, sem exigir rua, número ou complemento.

A visualização usará um mapa SVG estadual baseado no pacote open source `@svg-country-maps/brazil`, com cores por quantidade de clientes, tooltip acessível e ranking por UF/cidade. O backend centralizará a consulta externa, persistirá os cadastros por usuário e oferecerá resumo por estado e cidade para PC e iPhone.
