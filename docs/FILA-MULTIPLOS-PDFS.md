# Fila de múltiplos PDFs

O importador de produção agora aceita até 20 arquivos PDF em uma única seleção ou operação de arrastar e soltar. O limite de 15 MB continua sendo aplicado individualmente a cada arquivo.

## Comportamento

- Os arquivos entram na fila na ordem selecionada.
- O navegador envia um arquivo por vez e aguarda a resposta antes de iniciar o próximo.
- Cada arquivo exibe seu próprio estado: `Aguardando`, `Processando`, `Concluído`, `Duplicado evitado` ou `Erro`.
- Uma falha não interrompe os demais arquivos.
- Arquivos com erro podem ser processados novamente sem limpar a fila.
- A idempotência existente no backend continua protegendo contra reimportação do mesmo PDF.
- A fila bloqueia remoção e limpeza durante o processamento para evitar perda acidental de estado.

A rota tRPC de um PDF não foi substituída; a mudança é compatível com o backend atual e mantém o histórico de uploads individual por arquivo.

## Validação

- TypeScript aprovado.
- 13 arquivos e 58 testes aprovados.
- Build de produção aprovado.
