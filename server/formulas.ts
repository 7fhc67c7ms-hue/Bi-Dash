export interface TheoreticalFormulaComponent {
  componenteId: number;
  quantidade: number;
  perdaPercentual: number;
}

export interface TheoreticalFormula {
  rendimento: number;
  perdaPercentual: number;
  componentes: TheoreticalFormulaComponent[];
}

export function calcularConsumoTeorico(formula: TheoreticalFormula, quantidadeProduzir: number) {
  if (!Number.isFinite(quantidadeProduzir) || quantidadeProduzir <= 0) {
    throw new Error("A quantidade a produzir deve ser positiva.");
  }
  if (!Number.isFinite(formula.rendimento) || formula.rendimento <= 0) {
    throw new Error("O rendimento da ficha técnica deve ser positivo.");
  }
  const fatorProducao = quantidadeProduzir / formula.rendimento;
  const fatorPerdaFormula = 1 + formula.perdaPercentual / 100;
  return formula.componentes.map(component => {
    const consumoBase = fatorProducao * component.quantidade;
    const consumoComPerdas = consumoBase * (1 + component.perdaPercentual / 100) * fatorPerdaFormula;
    return {
      componenteId: component.componenteId,
      consumoBase,
      consumoComPerdas,
      perdaAplicada: consumoComPerdas - consumoBase,
    };
  });
}
