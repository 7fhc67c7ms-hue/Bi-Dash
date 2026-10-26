# Geolocalização automática durante a leitura do PDF

A importação de produção agora pede à IA, além dos campos existentes, os dados geográficos que aparecerem no documento: CEP, endereço/logradouro, cidade e UF. Campos ausentes continuam nulos e nunca são inventados.

Depois da extração e da gravação da produção, o backend procura a localização por CEP usando ViaCEP e BrasilAPI. Se o CEP estiver ausatualizado ou não for encontrado, usa cidade e UF como fallback pelo IBGE. Quando a localização é confirmada, o mapa é criado ou atualizado pelo nome do cliente, com fonte `cep` ou `cidade_uf`. O endereço encontrado também fica guardado no cadastro geográfico.

A atualização geográfica é tolerante a falhas: indisponibilidade de ViaCEP, BrasilAPI ou IBGE não cancela a importação do PDF nem remove dados existentes. A resposta da importação informa quantos clientes foram atualizados e quantos ficaram sem localização confirmada.

O cadastro manual de clientes, suas rotas, formulário, busca e possibilidade de exclusão foram preservados sem alteração. O novo comportamento ocorre somente dentro do fluxo de leitura/importação do PDF.

A migração `0015_outstanding_azazel.sql` adiciona apenas a coluna opcional `endereco` em `customer_locations`. Typecheck, build e 59 testes foram aprovados.
