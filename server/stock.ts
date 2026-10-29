import type { ProductionData, StockMovement } from "../drizzle/schema";

export interface StockRecommendation {
  tipoPlaca: string;
  producaoTotal: number;
  mesesComProducao: number;
  consumoMedioMensal: number;
  estoqueAtual: number;
  entradas: number;
  saidas: number;
  descartes: number;
  devolucoes: number;
  estoqueRecomendado: number;
  necessidadeReposicao: number;
  status: "OK" | "REPOR";
}

export interface StockAnalysis {
  coberturaMeses: number;
  totalEntradas: number;
  totalSaidas: number;
  totalDescartes: number;
  totalDevolucoes: number;
  saldoTotal: number;
  itens: StockRecommendation[];
}

type StockMovementLike = Pick<StockMovement, "tipoPlaca" | "movimento" | "quantidade">;

/** Calcula o saldo de um tipo de placa a partir dos movimentos efetivamente registrados. */
export function calcularSaldoDoTipo(
  movimentos: readonly StockMovementLike[],
  tipoPlaca: string,
) {
  return movimentos
    .filter(item => item.tipoPlaca === tipoPlaca)
    .reduce(
      (saldo, item) =>
        saldo +
        (item.movimento === "entrada" || item.movimento === "devolucao"
          ? item.quantidade
          : -item.quantidade),
      0,
    );
}

/** Calcula o saldo que resultaria de um novo movimento sem persistê-lo. */
export function calcularSaldoAposMovimento(
  movimentos: readonly StockMovementLike[],
  movimento: StockMovementLike,
) {
  return calcularSaldoDoTipo(movimentos, movimento.tipoPlaca) +
    (movimento.movimento === "entrada" || movimento.movimento === "devolucao"
      ? movimento.quantidade
      : -movimento.quantidade);
}

/**
 * Recomenda estoque para cobrir N meses da média mensal dos romaneios anexados.
 * Movimentos de estoque são independentes da produção e nunca alteram os dados
 * importados; a produção serve apenas como histórico de consumo/recomendação.
 */
export function analisarEstoque(
  producao: ProductionData[],
  movimentos: StockMovement[],
  coberturaMeses = 1,
): StockAnalysis {
  const cobertura = Math.max(1, Math.min(24, Math.round(coberturaMeses)));
  const porTipo = new Map<string, { total: number; periodos: Set<string> }>();
  producao.forEach(item => {
    const entry = porTipo.get(item.tipoPlaca) ?? { total: 0, periodos: new Set<string>() };
    entry.total += item.quantidade;
    entry.periodos.add(`${item.ano}-${item.mes}`);
    porTipo.set(item.tipoPlaca, entry);
  });
  const movimentosPorTipo = new Map<string, { entradas: number; saidas: number; descartes: number; devolucoes: number }>();
  movimentos.forEach(item => {
    const entry = movimentosPorTipo.get(item.tipoPlaca) ?? { entradas: 0, saidas: 0, descartes: 0, devolucoes: 0 };
    if (item.movimento === "entrada") entry.entradas += item.quantidade;
    else if (item.movimento === "devolucao") entry.devolucoes += item.quantidade;
    else if (item.movimento === "descarte") entry.descartes += item.quantidade;
    else entry.saidas += item.quantidade;
    movimentosPorTipo.set(item.tipoPlaca, entry);
  });
  const tipos = Array.from(new Set([...Array.from(porTipo.keys()), ...Array.from(movimentosPorTipo.keys())])).sort((a, b) => a.localeCompare(b));
  const itens = tipos.map(tipoPlaca => {
    const historico = porTipo.get(tipoPlaca) ?? { total: 0, periodos: new Set<string>() };
    const movimentosDoTipo = movimentosPorTipo.get(tipoPlaca) ?? { entradas: 0, saidas: 0, descartes: 0, devolucoes: 0 };
    const consumoMedioMensal = historico.periodos.size ? historico.total / historico.periodos.size : 0;
    const estoqueRecomendado = Math.ceil(consumoMedioMensal * cobertura);
    const estoqueAtual = movimentosDoTipo.entradas + movimentosDoTipo.devolucoes - movimentosDoTipo.saidas - movimentosDoTipo.descartes;
    const necessidadeReposicao = Math.max(0, estoqueRecomendado - estoqueAtual);
    return {
      tipoPlaca,
      producaoTotal: historico.total,
      mesesComProducao: historico.periodos.size,
      consumoMedioMensal,
      estoqueAtual,
      entradas: movimentosDoTipo.entradas,
      saidas: movimentosDoTipo.saidas,
      descartes: movimentosDoTipo.descartes,
      devolucoes: movimentosDoTipo.devolucoes,
      estoqueRecomendado,
      necessidadeReposicao,
      status: necessidadeReposicao > 0 ? "REPOR" : "OK",
    } satisfies StockRecommendation;
  });
  return {
    coberturaMeses: cobertura,
    totalEntradas: itens.reduce((total, item) => total + item.entradas, 0),
    totalSaidas: itens.reduce((total, item) => total + item.saidas, 0),
    totalDescartes: itens.reduce((total, item) => total + item.descartes, 0),
    totalDevolucoes: itens.reduce((total, item) => total + item.devolucoes, 0),
    saldoTotal: itens.reduce((total, item) => total + item.estoqueAtual, 0),
    itens,
  };
}
