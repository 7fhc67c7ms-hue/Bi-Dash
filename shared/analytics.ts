export interface PeriodSelection {
  ano: number;
  mesInicio: string;
  mesFim: string;
}

export interface VolumeEntity {
  nome: string;
  quantidade: number;
}

export interface MonthlyProductionPoint {
  periodo: string;
  mes: string;
  ano: number;
  quantidade: number;
}

export interface AnnualProductionPoint {
  ano: number;
  quantidade: number;
}

export interface ExecutiveMetrics {
  totalProducao: number;
  totalClientes: number;
  mediaGeral: number;
  mediaPorCliente: number;
  medianaPorCliente: number;
  minimoPorCliente: number;
  maximoPorCliente: number;
  desvioPadraoPorCliente: number;
  mediaMensal: number;
  mediaSemanal: number | null;
  mediaDiaria: number | null;
  mediaPorTipo: number;
  mesesComProducao: number;
  tiposProduzidos: number;
  produtoEstrela: string;
  maiorCliente: VolumeEntity | null;
  participacaoTop5: number;
  variacaoAbsoluta: number | null;
  variacaoPercentual: number | null;
  periodoAnterior: string | null;
  periodoAtual: string | null;
  diasProducao: number | null;
  diasSemProducao: number | null;
  dadosDiariosDisponiveis: boolean;
}

export type GrowthCategory =
  | "ALTO_CRESCIMENTO"
  | "CRESCIMENTO"
  | "ESTAVEL"
  | "REDUCAO"
  | "NOVO"
  | "SEM_PRODUCAO_RECENTE";

export interface GrowthClassification {
  nome: string;
  periodoA: number;
  periodoB: number;
  diferencaAbsoluta: number;
  diferencaPercentual: number | null;
  categoria: GrowthCategory;
}

export interface ClientAnalysis {
  cliente: string;
  total: number;
  tipos: number;
  tipoMaisProduzido: string;
  tipoMenosProduzido: string;
  mediaPorTipo: number;
  participacao: number;
  mediaMensal: number;
  maiorMes: VolumeEntity | null;
  menorMes: VolumeEntity | null;
  crescimentoAbsoluto: number;
  crescimentoPercentual: number | null;
  rankingHistorico: number;
  evolucaoMensal: MonthlyProductionPoint[];
  evolucaoAnual: AnnualProductionPoint[];
  mixTipos: VolumeEntity[];
}

export interface TypeAnalysis {
  tipoPlaca: string;
  categoria: string;
  total: number;
  clientes: number;
  mediaPorCliente: number;
  maiorCliente: VolumeEntity | null;
  menorCliente: VolumeEntity | null;
  participacao: number;
  ranking: number;
  crescimentoAbsoluto: number;
  crescimentoPercentual: number | null;
  evolucaoMensal: MonthlyProductionPoint[];
  evolucaoAnual: AnnualProductionPoint[];
}

export interface MixCategory {
  categoria: string;
  total: number;
  participacao: number;
  modelos: VolumeEntity[];
}

export interface PeriodSummary {
  label: string;
  total: number;
  mediaMensal: number;
  mediaPorCliente: number;
  clientes: number;
  tipos: number;
  maiorCliente: VolumeEntity | null;
  tipoMaisProduzido: string;
  concentracaoTop5: number;
  mesesIncluidos: string[];
  evolucaoMensal: MonthlyProductionPoint[];
  mixCategorias: MixCategory[];
}

export interface ClientPeriodChange {
  cliente: string;
  periodoA: number;
  periodoB: number;
  diferencaAbsoluta: number;
  diferencaPercentual: number | null;
}

export interface TypePeriodChange {
  tipoPlaca: string;
  periodoA: number;
  periodoB: number;
  diferencaAbsoluta: number;
  diferencaPercentual: number | null;
}

export interface MixPeriodChange {
  categoria: string;
  participacaoA: number;
  participacaoB: number;
  diferencaPontosPercentuais: number;
}

export interface PeriodComparison {
  disponivel: boolean;
  motivo: string | null;
  periodoA: PeriodSummary;
  periodoB: PeriodSummary;
  diferencaAbsoluta: number;
  diferencaPercentual: number | null;
  clientesNovos: string[];
  clientesPerdidos: string[];
  clientesRecorrentes: string[];
  clientesReativados: string[];
  clientesAumentaram: ClientPeriodChange[];
  clientesDiminuiram: ClientPeriodChange[];
  clientesEstaveis: ClientPeriodChange[];
  tiposAumentaram: TypePeriodChange[];
  tiposDiminuiram: TypePeriodChange[];
  concentracaoDiferencaPontosPercentuais: number;
  mixAlterado: MixPeriodChange[];
  classificacaoCrescimento: GrowthClassification[];
}

export interface ClientShare {
  cliente: string;
  total: number;
  participacao: number;
}

export interface ConcentrationAnalysis {
  clientes: ClientShare[];
  top5Total: number;
  top5Participacao: number;
  demaisTotal: number;
  demaisParticipacao: number;
}

export interface AccumulatedPoint extends MonthlyProductionPoint {
  acumulado: number;
}

export interface SeasonalityRow {
  mes: string;
  mediaHistorica: number;
  valores: Record<string, number>;
}

export interface SeasonalityAnalysis {
  anos: number[];
  linhas: SeasonalityRow[];
}

export interface ClientTypeMatrix {
  clientes: string[];
  tipos: string[];
  valores: Record<string, Record<string, number>>;
  anos: number[];
  valoresPorAno: Record<string, Record<string, Record<string, number>>>;
}

export interface AvailablePeriod {
  ano: number;
  mes: string;
}

/** Limiares determinísticos usados em crescimento/queda. */
export const GROWTH_THRESHOLDS = {
  estavelPercentual: 5,
  altoCrescimentoPercentual: 50,
} as const;

export const MONTHS = [
  "JANEIRO",
  "FEVEREIRO",
  "MARÇO",
  "ABRIL",
  "MAIO",
  "JUNHO",
  "JULHO",
  "AGOSTO",
  "SETEMBRO",
  "OUTUBRO",
  "NOVEMBRO",
  "DEZEMBRO",
] as const;

export type PeriodGranularity =
  | "MES"
  | "TRIMESTRE"
  | "SEMESTRE"
  | "ANO"
  | "PERSONALIZADO";

export interface ReportOptions {
  incluirGraficos: boolean;
  incluirTabelas: boolean;
  incluirTexto: boolean;
  incluirDetalhesClientes: boolean;
  incluirComparacao: boolean;
}
