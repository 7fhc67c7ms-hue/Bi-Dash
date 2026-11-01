# Filtro mensal financeiro

O módulo **Preços, custos e insumos** agora possui o seletor **Período dos valores financeiros**. Ele oferece `Todos os meses disponíveis` e cada combinação de mês/ano encontrada na produção, como `OUTUBRO / 2024`.

Quando um período é selecionado, o backend recalcula o recorte e a interface atualiza:

- faturamento estimado;
- custo de compra;
- custo de insumos;
- custo total;
- custo médio por placa;
- margem bruta e percentual;
- receita e margem por tipo de placa;
- histórico de consumo e seus valores.

A produção é filtrada pelo mês e ano do registro. Os consumos são filtrados pelo mês e ano da data de referência. O histórico de preços permanece disponível como cadastro de referência, enquanto o cálculo usa automaticamente a vigência de preço correta para cada registro produzido.

Sem seleção, o comportamento anterior é preservado: o módulo mostra o acumulado de todos os períodos.
