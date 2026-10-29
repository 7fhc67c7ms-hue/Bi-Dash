import type { ProductionData } from "../drizzle/schema";

const MONTH_ORDER = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
const monthIndex = (month: string) => MONTH_ORDER.indexOf(month.toUpperCase());

export interface ClientProductionAnalysis {
  cliente: string;
  total: number;
  totalRomaneios: number;
  tipos: Array<{ tipoPlaca: string; quantidade: number; participacao: number }>;
  meses: Array<{ ano: number; mes: string; quantidade: number; romaneios: number }>;
  romaneios: Array<{ romaneio: string; ano: number; mes: string; tipoPlaca: string; quantidade: number }>;
}

export function analisarProducaoCliente(dados: ProductionData[], cliente: string): ClientProductionAnalysis {
  const registros = dados.filter(item => item.cliente === cliente);
  const total = registros.reduce((sum, item) => sum + item.quantidade, 0);
  const tiposMap = new Map<string, number>();
  const mesesMap = new Map<string, { ano: number; mes: string; quantidade: number; romaneios: Set<string> }>();
  registros.forEach(item => {
    tiposMap.set(item.tipoPlaca, (tiposMap.get(item.tipoPlaca) ?? 0) + item.quantidade);
    const key = `${item.ano}-${item.mes}`;
    const month = mesesMap.get(key) ?? { ano: item.ano, mes: item.mes, quantidade: 0, romaneios: new Set<string>() };
    month.quantidade += item.quantidade;
    if (item.romaneio) month.romaneios.add(item.romaneio);
    mesesMap.set(key, month);
  });
  return {
    cliente,
    total,
    totalRomaneios: new Set(registros.map(item => item.romaneio).filter(Boolean)).size,
    tipos: Array.from(tiposMap.entries())
      .map(([tipoPlaca, quantidade]) => ({ tipoPlaca, quantidade, participacao: total ? (quantidade / total) * 100 : 0 }))
      .sort((a, b) => b.quantidade - a.quantidade || a.tipoPlaca.localeCompare(b.tipoPlaca)),
    meses: Array.from(mesesMap.values())
      .map(item => ({ ...item, romaneios: item.romaneios.size }))
      .sort((a, b) => a.ano - b.ano || monthIndex(a.mes) - monthIndex(b.mes)),
    romaneios: registros
      .map(item => ({ romaneio: item.romaneio ?? "Sem romaneio", ano: item.ano, mes: item.mes, tipoPlaca: item.tipoPlaca, quantidade: item.quantidade }))
      .sort((a, b) => b.ano - a.ano || monthIndex(b.mes) - monthIndex(a.mes) || a.tipoPlaca.localeCompare(b.tipoPlaca)),
  };
}
