import type {
  ProductPrice,
  ProductionData,
  Supply,
  SupplyConsumption,
} from "../drizzle/schema";

export type CostAnalysis = {
  totalPlacas: number;
  faturamentoCentavos: number;
  custoCompraCentavos: number;
  custoInsumosCentavos: number;
  custoTotalCentavos: number;
  margemBrutaCentavos: number;
  margemBrutaPercentual: number | null;
  custoMedioPorPlacaCentavos: number | null;
  receitaPorTipo: Array<{
    tipoPlaca: string;
    quantidade: number;
    faturamentoCentavos: number;
    custoCompraCentavos: number;
    margemBrutaCentavos: number;
  }>;
  consumoPorPeriodicidade: Array<{
    periodicidade: SupplyConsumption["periodicidade"];
    custoCentavos: number;
  }>;
};

export type FinancialPeriod = { ano: number; mes: string };

const MONTHS = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
const normalizeMonth = (value: string) => value.trim().toLocaleUpperCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function filtrarCustosPorPeriodo<T extends SupplyConsumption>(
  production: ProductionData[],
  consumptions: T[],
  period?: FinancialPeriod,
) {
  if (!period) return { production, consumptions };
  const targetMonth = normalizeMonth(period.mes);
  return {
    production: production.filter(row => row.ano === period.ano && normalizeMonth(row.mes) === targetMonth),
    consumptions: consumptions.filter(item => {
      const date = new Date(item.referenciaEm);
      return date.getFullYear() === period.ano && normalizeMonth(MONTHS[date.getMonth()]) === targetMonth;
    }),
  };
}

function priceForProduction(
  row: ProductionData,
  pricesByType: Map<string, ProductPrice[]>,
): ProductPrice | undefined {
  const prices = pricesByType.get(row.tipoPlaca) ?? [];
  const occurredAt = new Date(row.createdAt).getTime();
  return prices.find(price => new Date(price.vigenteDesde).getTime() <= occurredAt);
}

export function analisarCustos(
  production: ProductionData[],
  prices: ProductPrice[],
  consumptions: SupplyConsumption[],
  _supplies: Supply[],
): CostAnalysis {
  const pricesByType = new Map<string, ProductPrice[]>();
  for (const price of [...prices].sort((a, b) => new Date(b.vigenteDesde).getTime() - new Date(a.vigenteDesde).getTime())) {
    const current = pricesByType.get(price.tipoPlaca) ?? [];
    current.push(price);
    pricesByType.set(price.tipoPlaca, current);
  }

  const byType = new Map<string, CostAnalysis["receitaPorTipo"][number]>();
  for (const row of production) {
    const price = priceForProduction(row, pricesByType);
    const current = byType.get(row.tipoPlaca) ?? {
      tipoPlaca: row.tipoPlaca,
      quantidade: 0,
      faturamentoCentavos: 0,
      custoCompraCentavos: 0,
      margemBrutaCentavos: 0,
    };
    current.quantidade += row.quantidade;
    current.faturamentoCentavos += row.quantidade * (price?.precoVendaCentavos ?? 0);
    current.custoCompraCentavos += row.quantidade * (price?.custoCompraCentavos ?? 0);
    current.margemBrutaCentavos = current.faturamentoCentavos - current.custoCompraCentavos;
    byType.set(row.tipoPlaca, current);
  }

  const typeTotals = Array.from(byType.values());
  const faturamentoCentavos = typeTotals.reduce((sum, item) => sum + item.faturamentoCentavos, 0);
  const custoCompraCentavos = typeTotals.reduce((sum, item) => sum + item.custoCompraCentavos, 0);
  const custoInsumosCentavos = consumptions.reduce(
    (sum, item) => sum + Number(item.quantidade) * item.custoUnitarioCentavos,
    0,
  );
  const custoTotalCentavos = custoCompraCentavos + custoInsumosCentavos;
  const margemBrutaCentavos = faturamentoCentavos - custoTotalCentavos;
  const totalPlacas = production.reduce((sum, row) => sum + row.quantidade, 0);
  const consumoMap = new Map<SupplyConsumption["periodicidade"], number>();
  for (const item of consumptions) {
    consumoMap.set(item.periodicidade, (consumoMap.get(item.periodicidade) ?? 0) + Number(item.quantidade) * item.custoUnitarioCentavos);
  }

  return {
    totalPlacas,
    faturamentoCentavos,
    custoCompraCentavos,
    custoInsumosCentavos,
    custoTotalCentavos,
    margemBrutaCentavos,
    margemBrutaPercentual: faturamentoCentavos > 0 ? (margemBrutaCentavos / faturamentoCentavos) * 100 : null,
    custoMedioPorPlacaCentavos: totalPlacas > 0 ? custoTotalCentavos / totalPlacas : null,
    receitaPorTipo: typeTotals.sort((a, b) => b.faturamentoCentavos - a.faturamentoCentavos),
    consumoPorPeriodicidade: Array.from(consumoMap.entries()).map(([periodicidade, custoCentavos]) => ({ periodicidade, custoCentavos })),
  };
}
