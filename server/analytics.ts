import type { ProductionData } from "../drizzle/schema";
import {
  GROWTH_THRESHOLDS,
  MONTHS,
  type AccumulatedPoint,
  type AvailablePeriod,
  type ClientAnalysis,
  type ClientPeriodChange,
  type ClientTypeMatrix,
  type ConcentrationAnalysis,
  type ExecutiveMetrics,
  type GrowthCategory,
  type GrowthClassification,
  type MixCategory,
  type MonthlyProductionPoint,
  type PeriodComparison,
  type PeriodSelection,
  type PeriodSummary,
  type SeasonalityAnalysis,
  type TypeAnalysis,
  type TypePeriodChange,
  type VolumeEntity,
} from "@shared/analytics";

export interface KPIs {
  totalProducao: number;
  numeroPedidos: number;
  ticketMedio: number;
  produtoEstrela: string;
}

export interface ClienteRanking {
  posicao: number;
  nome: string;
  quantidade: number;
}

export interface ProdutoRanking {
  nome: string;
  quantidade: number;
}

export interface ComparacaoMensal {
  mes: string;
  total: number;
}

export interface TabelaProducao {
  cliente: string;
  itens: Array<{ tipoPlaca: string; quantidade: number }>;
  total: number;
}

export interface AdvancedMetrics {
  totalClientes: number;
  totalProdutos: number;
  quantidadeClientesObras: number;
  participacaoObras: number;
  participacaoTop5Clientes: number;
  mesPico: string;
  crescimentoUltimoMes: number | null;
}

export interface ModeloPorMes {
  mes: string;
  tipoPlaca: string;
  quantidade: number;
  participacaoMes: number;
}

export interface MatrizModeloMes {
  meses: string[];
  linhas: Array<{
    tipoPlaca: string;
    valores: Record<string, number>;
    total: number;
  }>;
}

export interface ResumoMensal {
  mes: string;
  total: number;
  numeroPedidos: number;
  modelosAtivos: number;
  modeloEstrela: string;
  participacaoModeloEstrela: number;
  variacaoPercentual: number | null;
}

export interface AnaliseMixModelo {
  tipoPlaca: string;
  total: number;
  participacao: number;
  mesesAtivos: number;
  mediaMensal: number;
  mesPico: string;
  quantidadeMesPico: number;
}

export interface ComparacaoMeses {
  meses: string[];
  linhas: Array<{
    tipoPlaca: string;
    valores: Record<string, number>;
    total: number;
    diferencaPrimeiroUltimo: number;
    variacaoPercentual: number | null;
  }>;
  totais: Array<{
    mes: string;
    total: number;
    variacaoPercentual: number | null;
  }>;
}

const MESES = [...MONTHS];

function ordemDoMes(mes: string): number {
  const index = MESES.indexOf(mes.toUpperCase() as (typeof MESES)[number]);
  return index === -1 ? MESES.length : index;
}

function ordenarMeses(meses: Iterable<string>): string[] {
  return Array.from(new Set(meses)).sort(
    (a, b) => ordemDoMes(a) - ordemDoMes(b) || a.localeCompare(b)
  );
}

function arredondar(valor: number, casas = 1): number {
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
}

function arredondarPercentual(valor: number): number {
  return arredondar(valor, 1);
}

function mediana(valores: number[]): number {
  if (!valores.length) return 0;
  const ordenados = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 === 0
    ? (ordenados[meio - 1] + ordenados[meio]) / 2
    : ordenados[meio];
}

function periodoOrdenavel(ano: number, mes: string): number {
  return ano * 12 + ordemDoMes(mes);
}

function periodoLabel(ano: number, mes: string): string {
  return `${mes}/${ano}`;
}

function periodoKey(ano: number, mes: string): string {
  return `${ano}-${String(ordemDoMes(mes) + 1).padStart(2, "0")}`;
}

function ordenarPontos(pontos: MonthlyProductionPoint[]): MonthlyProductionPoint[] {
  return pontos.sort(
    (a, b) => periodoOrdenavel(a.ano, a.mes) - periodoOrdenavel(b.ano, b.mes)
  );
}

function volumePorCliente(dados: ProductionData[]): Map<string, number> {
  const volumes = new Map<string, number>();
  dados.forEach(item =>
    volumes.set(item.cliente, (volumes.get(item.cliente) ?? 0) + item.quantidade)
  );
  return volumes;
}

function volumePorTipo(dados: ProductionData[]): Map<string, number> {
  const volumes = new Map<string, number>();
  dados.forEach(item =>
    volumes.set(item.tipoPlaca, (volumes.get(item.tipoPlaca) ?? 0) + item.quantidade)
  );
  return volumes;
}

function mapParaEntidades(entries: Map<string, number>): VolumeEntity[] {
  return Array.from(entries, ([nome, quantidade]) => ({ nome, quantidade })).sort(
    (a, b) => b.quantidade - a.quantidade || a.nome.localeCompare(b.nome)
  );
}

function maiorMenor(entries: Map<string, number>): {
  maior: VolumeEntity | null;
  menor: VolumeEntity | null;
} {
  const valores = mapParaEntidades(entries);
  if (!valores.length) return { maior: null, menor: null };
  const menor = [...valores].sort(
    (a, b) => a.quantidade - b.quantidade || a.nome.localeCompare(b.nome)
  )[0];
  return { maior: valores[0], menor };
}

function pontosMensais(dados: ProductionData[]): MonthlyProductionPoint[] {
  const porPeriodo = new Map<string, MonthlyProductionPoint>();
  dados.forEach(item => {
    const key = periodoKey(item.ano, item.mes);
    const atual = porPeriodo.get(key);
    porPeriodo.set(key, {
      periodo: periodoLabel(item.ano, item.mes),
      mes: item.mes,
      ano: item.ano,
      quantidade: (atual?.quantidade ?? 0) + item.quantidade,
    });
  });
  return ordenarPontos(Array.from(porPeriodo.values()));
}

function dentroDoPeriodo(item: ProductionData, periodo: PeriodSelection): boolean {
  const indice = ordemDoMes(item.mes);
  const inicio = ordemDoMes(periodo.mesInicio);
  const fim = ordemDoMes(periodo.mesFim);
  if (item.ano !== periodo.ano || inicio === MESES.length || fim === MESES.length)
    return false;
  return indice >= Math.min(inicio, fim) && indice <= Math.max(inicio, fim);
}

function obterDadosPeriodo(dados: ProductionData[], periodo: PeriodSelection) {
  return dados.filter(item => dentroDoPeriodo(item, periodo));
}

/** Agrupa dados de produção por cliente. */
export function agruparPorCliente(
  dados: ProductionData[]
): Record<string, ProductionData[]> {
  return dados.reduce(
    (acc, item) => {
      (acc[item.cliente] ??= []).push(item);
      return acc;
    },
    {} as Record<string, ProductionData[]>
  );
}

/** Calcula os KPIs operacionais já expostos pela API original. */
export function calcularKPIs(dados: ProductionData[]): KPIs {
  const totalProducao = dados.reduce((sum, item) => sum + item.quantidade, 0);
  const romaneiosUnicos = new Set(dados.map(item => item.romaneio).filter(Boolean));
  const numeroPedidos = romaneiosUnicos.size;
  const produtos = mapParaEntidades(volumePorTipo(dados));
  return {
    totalProducao,
    numeroPedidos,
    ticketMedio: numeroPedidos ? Math.round(totalProducao / numeroPedidos) : 0,
    produtoEstrela: produtos[0]?.nome ?? "N/A",
  };
}

/** Cria ranking de clientes comuns ou obras, preservando a API anterior. */
export function criarRanking(
  dados: ProductionData[],
  filtroObras: boolean
): ClienteRanking[] {
  return mapParaEntidades(volumePorCliente(dados))
    .filter(item =>
      filtroObras
        ? item.nome.toUpperCase().includes("OBRAS")
        : !item.nome.toUpperCase().includes("OBRAS")
    )
    .map((item, index) => ({
      posicao: index + 1,
      nome: item.nome,
      quantidade: item.quantidade,
    }));
}

export function obterTopProdutos(
  dados: ProductionData[],
  n = 10
): ProdutoRanking[] {
  return mapParaEntidades(volumePorTipo(dados)).slice(0, n);
}

/** Compatibilidade: consolida por nome do mês, sem misturar a ordenação cronológica. */
export function agruparPorMes(dados: ProductionData[]): ComparacaoMensal[] {
  const porMes = new Map<string, number>();
  dados.forEach(item =>
    porMes.set(item.mes, (porMes.get(item.mes) ?? 0) + item.quantidade)
  );
  return ordenarMeses(porMes.keys()).map(mes => ({ mes, total: porMes.get(mes) ?? 0 }));
}

export function agruparPorMesOrdenado(dados: ProductionData[]): ComparacaoMensal[] {
  return agruparPorMes(dados).sort(
    (a, b) => b.total - a.total || a.mes.localeCompare(b.mes)
  );
}

export function formatarTabelaProducao(dados: ProductionData[]): TabelaProducao[] {
  return Object.entries(agruparPorCliente(dados))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cliente, itens]) => {
      const porModelo = volumePorTipo(itens);
      return {
        cliente,
        itens: mapParaEntidades(porModelo).map(item => ({
          tipoPlaca: item.nome,
          quantidade: item.quantidade,
        })),
        total: itens.reduce((sum, item) => sum + item.quantidade, 0),
      };
    });
}

export function calcularMetricasAvancadas(
  dados: ProductionData[]
): AdvancedMetrics {
  const total = dados.reduce((sum, item) => sum + item.quantidade, 0);
  const clientes = volumePorCliente(dados);
  const porMes = agruparPorMes(dados);
  const ordenados = mapParaEntidades(clientes).map(item => item.quantidade);
  const obrasTotal = dados
    .filter(item => item.cliente.toUpperCase().includes("OBRAS"))
    .reduce((sum, item) => sum + item.quantidade, 0);
  const lastTwo = porMes.slice(-2);
  return {
    totalClientes: clientes.size,
    totalProdutos: new Set(dados.map(item => item.tipoPlaca)).size,
    quantidadeClientesObras: Array.from(clientes.keys()).filter(nome =>
      nome.toUpperCase().includes("OBRAS")
    ).length,
    participacaoObras: total ? arredondarPercentual((obrasTotal / total) * 100) : 0,
    participacaoTop5Clientes: total
      ? arredondarPercentual(
          (ordenados.slice(0, 5).reduce((sum, item) => sum + item, 0) / total) * 100
        )
      : 0,
    mesPico: [...porMes].sort((a, b) => b.total - a.total)[0]?.mes ?? "N/A",
    crescimentoUltimoMes:
      lastTwo.length === 2 && lastTwo[0].total > 0
        ? arredondarPercentual(
            ((lastTwo[1].total - lastTwo[0].total) / lastTwo[0].total) * 100
          )
        : null,
  };
}

function quantidadePorModeloEMes(
  dados: ProductionData[]
): Map<string, Map<string, number>> {
  const resultado = new Map<string, Map<string, number>>();
  dados.forEach(item => {
    const porMes = resultado.get(item.tipoPlaca) ?? new Map<string, number>();
    porMes.set(item.mes, (porMes.get(item.mes) ?? 0) + item.quantidade);
    resultado.set(item.tipoPlaca, porMes);
  });
  return resultado;
}

export function obterModelosPorMes(dados: ProductionData[]): ModeloPorMes[] {
  const totaisPorMes = new Map<string, number>();
  dados.forEach(item =>
    totaisPorMes.set(item.mes, (totaisPorMes.get(item.mes) ?? 0) + item.quantidade)
  );
  const valores: ModeloPorMes[] = [];
  quantidadePorModeloEMes(dados).forEach((porMes, tipoPlaca) => {
    porMes.forEach((quantidade, mes) => {
      const totalMes = totaisPorMes.get(mes) ?? 0;
      valores.push({
        mes,
        tipoPlaca,
        quantidade,
        participacaoMes: totalMes
          ? arredondarPercentual((quantidade / totalMes) * 100)
          : 0,
      });
    });
  });
  return valores.sort(
    (a, b) =>
      ordemDoMes(a.mes) - ordemDoMes(b.mes) ||
      b.quantidade - a.quantidade ||
      a.tipoPlaca.localeCompare(b.tipoPlaca)
  );
}

export function criarMatrizModeloMes(dados: ProductionData[]): MatrizModeloMes {
  const porModelo = quantidadePorModeloEMes(dados);
  const meses = ordenarMeses(dados.map(item => item.mes));
  const linhas = Array.from(porModelo.entries())
    .map(([tipoPlaca, porMes]) => ({
      tipoPlaca,
      valores: Object.fromEntries(meses.map(mes => [mes, porMes.get(mes) ?? 0])),
      total: Array.from(porMes.values()).reduce((sum, quantidade) => sum + quantidade, 0),
    }))
    .sort((a, b) => b.total - a.total || a.tipoPlaca.localeCompare(b.tipoPlaca));
  return { meses, linhas };
}

export function calcularResumoMensal(dados: ProductionData[]): ResumoMensal[] {
  const meses = ordenarMeses(dados.map(item => item.mes));
  const resumo: ResumoMensal[] = [];
  meses.forEach((mes, index) => {
    const itens = dados.filter(item => item.mes === mes);
    const total = itens.reduce((sum, item) => sum + item.quantidade, 0);
    const modelos = mapParaEntidades(volumePorTipo(itens));
    const anterior = index ? (resumo[index - 1]?.total ?? 0) : 0;
    resumo.push({
      mes,
      total,
      numeroPedidos: new Set(itens.map(item => item.romaneio).filter(Boolean)).size,
      modelosAtivos: modelos.length,
      modeloEstrela: modelos[0]?.nome ?? "N/A",
      participacaoModeloEstrela:
        total && modelos[0]
          ? arredondarPercentual((modelos[0].quantidade / total) * 100)
          : 0,
      variacaoPercentual:
        index && anterior
          ? arredondarPercentual(((total - anterior) / anterior) * 100)
          : null,
    });
  });
  return resumo;
}

export function analisarMixModelos(dados: ProductionData[]): AnaliseMixModelo[] {
  const totalGeral = dados.reduce((sum, item) => sum + item.quantidade, 0);
  const matriz = criarMatrizModeloMes(dados);
  return matriz.linhas.map(linha => {
    const mesesComProducao = matriz.meses.filter(mes => linha.valores[mes] > 0);
    const pico = [...mesesComProducao].sort(
      (a, b) => linha.valores[b] - linha.valores[a] || ordemDoMes(a) - ordemDoMes(b)
    )[0];
    return {
      tipoPlaca: linha.tipoPlaca,
      total: linha.total,
      participacao: totalGeral
        ? arredondarPercentual((linha.total / totalGeral) * 100)
        : 0,
      mesesAtivos: mesesComProducao.length,
      mediaMensal: mesesComProducao.length
        ? arredondar(linha.total / mesesComProducao.length)
        : 0,
      mesPico: pico ?? "N/A",
      quantidadeMesPico: pico ? linha.valores[pico] : 0,
    };
  });
}

export function compararMeses(
  dados: ProductionData[],
  mesesSelecionados?: string[]
): ComparacaoMeses {
  const mesesDisponiveis = ordenarMeses(dados.map(item => item.mes));
  const meses = ordenarMeses(
    mesesSelecionados?.filter(mes => mesesDisponiveis.includes(mes)) ?? mesesDisponiveis
  );
  const matriz = criarMatrizModeloMes(dados);
  const linhas = matriz.linhas.map(linha => {
    const valores = Object.fromEntries(meses.map(mes => [mes, linha.valores[mes] ?? 0]));
    const primeiro = valores[meses[0]] ?? 0;
    const ultimo = valores[meses.at(-1) ?? ""] ?? 0;
    return {
      tipoPlaca: linha.tipoPlaca,
      valores,
      total: Object.values(valores).reduce((sum, quantidade) => sum + quantidade, 0),
      diferencaPrimeiroUltimo: ultimo - primeiro,
      variacaoPercentual:
        meses.length > 1 && primeiro
          ? arredondarPercentual(((ultimo - primeiro) / primeiro) * 100)
          : null,
    };
  });
  const totaisPorMes = new Map(calcularResumoMensal(dados).map(item => [item.mes, item.total]));
  const totais = meses.map((mes, index) => {
    const anterior = index ? (totaisPorMes.get(meses[index - 1]) ?? 0) : 0;
    const total = totaisPorMes.get(mes) ?? 0;
    return {
      mes,
      total,
      variacaoPercentual:
        index && anterior
          ? arredondarPercentual(((total - anterior) / anterior) * 100)
          : null,
    };
  });
  return { meses, linhas, totais };
}

/** Métricas executivas exclusivamente derivadas do recorte filtrado. */
export function calcularMetricasExecutivas(
  dados: ProductionData[]
): ExecutiveMetrics {
  const totalProducao = dados.reduce((sum, item) => sum + item.quantidade, 0);
  const clientes = volumePorCliente(dados);
  const valoresClientes = Array.from(clientes.values());
  const periodos = new Set(dados.map(item => periodoKey(item.ano, item.mes)));
  const tipos = volumePorTipo(dados);
  const mediaPorCliente = valoresClientes.length ? totalProducao / valoresClientes.length : 0;
  const variancia = valoresClientes.length
    ? valoresClientes.reduce((sum, valor) => sum + (valor - mediaPorCliente) ** 2, 0) /
      valoresClientes.length
    : 0;
  const evolucao = pontosMensais(dados);
  const anterior = evolucao.at(-2);
  const atual = evolucao.at(-1);
  const variacaoAbsoluta = anterior && atual ? atual.quantidade - anterior.quantidade : null;
  const participacaoTop5 = totalProducao
    ? (mapParaEntidades(clientes)
        .slice(0, 5)
        .reduce((sum, item) => sum + item.quantidade, 0) /
        totalProducao) *
      100
    : 0;
  return {
    totalProducao,
    totalClientes: clientes.size,
    mediaGeral: arredondar(mediaPorCliente),
    mediaPorCliente: arredondar(mediaPorCliente),
    medianaPorCliente: arredondar(mediana(valoresClientes)),
    minimoPorCliente: valoresClientes.length ? Math.min(...valoresClientes) : 0,
    maximoPorCliente: valoresClientes.length ? Math.max(...valoresClientes) : 0,
    desvioPadraoPorCliente: arredondar(Math.sqrt(variancia)),
    mediaMensal: arredondar(periodos.size ? totalProducao / periodos.size : 0),
    mediaSemanal: null,
    mediaDiaria: null,
    mediaPorTipo: arredondar(tipos.size ? totalProducao / tipos.size : 0),
    mesesComProducao: periodos.size,
    tiposProduzidos: tipos.size,
    produtoEstrela: mapParaEntidades(tipos)[0]?.nome ?? "N/A",
    maiorCliente: maiorMenor(clientes).maior,
    participacaoTop5: arredondar(participacaoTop5),
    variacaoAbsoluta,
    variacaoPercentual:
      variacaoAbsoluta !== null && anterior?.quantidade
        ? arredondarPercentual((variacaoAbsoluta / anterior.quantidade) * 100)
        : null,
    periodoAnterior: anterior?.periodo ?? null,
    periodoAtual: atual?.periodo ?? null,
    diasProducao: null,
    diasSemProducao: null,
    dadosDiariosDisponiveis: false,
  };
}

/** Detalha histórico, mix, evolução, extremos e ranking de cada cliente. */
export function analisarClientes(dados: ProductionData[]): ClientAnalysis[] {
  const totalGeral = dados.reduce((sum, item) => sum + item.quantidade, 0);
  const porCliente = agruparPorCliente(dados);
  return Object.entries(porCliente)
    .map(([cliente, itens]) => {
      const total = itens.reduce((sum, item) => sum + item.quantidade, 0);
      const porTipo = volumePorTipo(itens);
      const evolucaoMensal = pontosMensais(itens);
      const porAno = new Map<number, number>();
      itens.forEach(item => porAno.set(item.ano, (porAno.get(item.ano) ?? 0) + item.quantidade));
      const evolucaoAnual = Array.from(porAno, ([ano, quantidade]) => ({ ano, quantidade })).sort(
        (a, b) => a.ano - b.ano
      );
      const tiposOrdenados = mapParaEntidades(porTipo);
      const meses = evolucaoMensal.map(item => ({ nome: item.periodo, quantidade: item.quantidade }));
      const maiorMes = meses.length
        ? [...meses].sort((a, b) => b.quantidade - a.quantidade || a.nome.localeCompare(b.nome))[0]
        : null;
      const menorMes = meses.length
        ? [...meses].sort((a, b) => a.quantidade - b.quantidade || a.nome.localeCompare(b.nome))[0]
        : null;
      const primeiro = evolucaoMensal[0]?.quantidade ?? 0;
      const ultimo = evolucaoMensal.at(-1)?.quantidade ?? 0;
      return {
        cliente,
        total,
        tipos: porTipo.size,
        tipoMaisProduzido: tiposOrdenados[0]?.nome ?? "N/A",
        tipoMenosProduzido: tiposOrdenados.at(-1)?.nome ?? "N/A",
        mediaPorTipo: arredondar(porTipo.size ? total / porTipo.size : 0),
        participacao: totalGeral ? arredondarPercentual((total / totalGeral) * 100) : 0,
        mediaMensal: arredondar(evolucaoMensal.length ? total / evolucaoMensal.length : 0),
        maiorMes,
        menorMes,
        crescimentoAbsoluto: evolucaoMensal.length > 1 ? ultimo - primeiro : 0,
        crescimentoPercentual:
          evolucaoMensal.length > 1 && primeiro
            ? arredondarPercentual(((ultimo - primeiro) / primeiro) * 100)
            : null,
        rankingHistorico: 0,
        evolucaoMensal,
        evolucaoAnual,
        mixTipos: tiposOrdenados,
      };
    })
    .sort((a, b) => b.total - a.total || a.cliente.localeCompare(b.cliente))
    .map((item, index) => ({ ...item, rankingHistorico: index + 1 }));
}

export function categoriaTipoPlaca(tipoPlaca: string): string {
  const normalizado = tipoPlaca.trim().toUpperCase();
  if (normalizado.startsWith("RET") || normalizado.includes("RETANG")) return "RET";
  if (normalizado.startsWith("OVAL") || normalizado.includes("OVAL")) return "OVAL";
  if (normalizado.startsWith("QUAD") || normalizado.includes("QUADR")) return "QUAD";
  return "OUTROS";
}

/** Analisa cada modelo e sua categoria, evolução mensal/anual e crescimento. */
export function analisarTipos(dados: ProductionData[]): TypeAnalysis[] {
  const totalGeral = dados.reduce((sum, item) => sum + item.quantidade, 0);
  const grupos = new Map<string, ProductionData[]>();
  dados.forEach(item => grupos.set(item.tipoPlaca, [...(grupos.get(item.tipoPlaca) ?? []), item]));
  return Array.from(grupos.entries())
    .map(([tipoPlaca, itens]) => {
      const total = itens.reduce((sum, item) => sum + item.quantidade, 0);
      const clientes = volumePorCliente(itens);
      const evolucaoMensal = pontosMensais(itens);
      const porAno = new Map<number, number>();
      itens.forEach(item => porAno.set(item.ano, (porAno.get(item.ano) ?? 0) + item.quantidade));
      const primeiro = evolucaoMensal[0]?.quantidade ?? 0;
      const ultimo = evolucaoMensal.at(-1)?.quantidade ?? 0;
      const extremos = maiorMenor(clientes);
      return {
        tipoPlaca,
        categoria: categoriaTipoPlaca(tipoPlaca),
        total,
        clientes: clientes.size,
        mediaPorCliente: arredondar(clientes.size ? total / clientes.size : 0),
        maiorCliente: extremos.maior,
        menorCliente: extremos.menor,
        participacao: totalGeral ? arredondarPercentual((total / totalGeral) * 100) : 0,
        ranking: 0,
        crescimentoAbsoluto: evolucaoMensal.length > 1 ? ultimo - primeiro : 0,
        crescimentoPercentual:
          evolucaoMensal.length > 1 && primeiro
            ? arredondarPercentual(((ultimo - primeiro) / primeiro) * 100)
            : null,
        evolucaoMensal,
        evolucaoAnual: Array.from(porAno, ([ano, quantidade]) => ({ ano, quantidade })).sort(
          (a, b) => a.ano - b.ano
        ),
      };
    })
    .sort((a, b) => b.total - a.total || a.tipoPlaca.localeCompare(b.tipoPlaca))
    .map((item, index) => ({ ...item, ranking: index + 1 }));
}

export function analisarConcentracao(dados: ProductionData[]): ConcentrationAnalysis {
  const total = dados.reduce((sum, item) => sum + item.quantidade, 0);
  const clientes = mapParaEntidades(volumePorCliente(dados)).map(item => ({
    cliente: item.nome,
    total: item.quantidade,
    participacao: total ? arredondarPercentual((item.quantidade / total) * 100) : 0,
  }));
  const top5Total = clientes.slice(0, 5).reduce((sum, item) => sum + item.total, 0);
  return {
    clientes,
    top5Total,
    top5Participacao: total ? arredondarPercentual((top5Total / total) * 100) : 0,
    demaisTotal: total - top5Total,
    demaisParticipacao: total ? arredondarPercentual(((total - top5Total) / total) * 100) : 0,
  };
}

export function analisarMixCategorias(dados: ProductionData[]): MixCategory[] {
  const totalGeral = dados.reduce((sum, item) => sum + item.quantidade, 0);
  const categorias = new Map<string, Map<string, number>>();
  dados.forEach(item => {
    const categoria = categoriaTipoPlaca(item.tipoPlaca);
    const modelos = categorias.get(categoria) ?? new Map<string, number>();
    modelos.set(item.tipoPlaca, (modelos.get(item.tipoPlaca) ?? 0) + item.quantidade);
    categorias.set(categoria, modelos);
  });
  return Array.from(categorias, ([categoria, modelos]) => {
    const itens = mapParaEntidades(modelos);
    const total = itens.reduce((sum, item) => sum + item.quantidade, 0);
    return {
      categoria,
      total,
      participacao: totalGeral ? arredondarPercentual((total / totalGeral) * 100) : 0,
      modelos: itens,
    };
  }).sort((a, b) => b.total - a.total || a.categoria.localeCompare(b.categoria));
}

function resumoDoPeriodo(
  dados: ProductionData[],
  periodo: PeriodSelection,
  label: string
): PeriodSummary {
  const itens = obterDadosPeriodo(dados, periodo);
  const clientes = volumePorCliente(itens);
  const tipos = volumePorTipo(itens);
  const total = itens.reduce((sum, item) => sum + item.quantidade, 0);
  const evolucaoMensal = pontosMensais(itens);
  const concentracao = analisarConcentracao(itens);
  return {
    label: `${label} · ${periodo.mesInicio}–${periodo.mesFim}/${periodo.ano}`,
    total,
    mediaMensal: arredondar(evolucaoMensal.length ? total / evolucaoMensal.length : 0),
    mediaPorCliente: arredondar(clientes.size ? total / clientes.size : 0),
    clientes: clientes.size,
    tipos: tipos.size,
    maiorCliente: maiorMenor(clientes).maior,
    tipoMaisProduzido: mapParaEntidades(tipos)[0]?.nome ?? "N/A",
    concentracaoTop5: concentracao.top5Participacao,
    mesesIncluidos: evolucaoMensal.map(item => item.periodo),
    evolucaoMensal,
    mixCategorias: analisarMixCategorias(itens),
  };
}

function alteracoesPorEntidade<T extends ClientPeriodChange | TypePeriodChange>(
  a: Map<string, number>,
  b: Map<string, number>,
  kind: "cliente" | "tipo"
): {
  novos: string[];
  perdidos: string[];
  recorrentes: string[];
  aumentaram: T[];
  diminuiram: T[];
  estaveis: T[];
} {
  const nomes = new Set(Array.from(a.keys()).concat(Array.from(b.keys())));
  const novos: string[] = [];
  const perdidos: string[] = [];
  const recorrentes: string[] = [];
  const aumentaram: T[] = [];
  const diminuiram: T[] = [];
  const estaveis: T[] = [];
  nomes.forEach(nome => {
    const periodoA = a.get(nome) ?? 0;
    const periodoB = b.get(nome) ?? 0;
    const diferencaAbsoluta = periodoB - periodoA;
    const diferencaPercentual = periodoA
      ? arredondarPercentual((diferencaAbsoluta / periodoA) * 100)
      : null;
    const mudanca = {
      ...(kind === "tipo" ? { tipoPlaca: nome } : { cliente: nome }),
      periodoA,
      periodoB,
      diferencaAbsoluta,
      diferencaPercentual,
    } as T;
    if (!periodoA && periodoB) novos.push(nome);
    else if (periodoA && !periodoB) perdidos.push(nome);
    else if (periodoA && periodoB) {
      recorrentes.push(nome);
      if (diferencaAbsoluta > 0) aumentaram.push(mudanca);
      else if (diferencaAbsoluta < 0) diminuiram.push(mudanca);
      else estaveis.push(mudanca);
    }
  });
  const order = (left: T, right: T) =>
    Math.abs(right.diferencaAbsoluta) - Math.abs(left.diferencaAbsoluta);
  return {
    novos: novos.sort(),
    perdidos: perdidos.sort(),
    recorrentes: recorrentes.sort(),
    aumentaram: aumentaram.sort(order),
    diminuiram: diminuiram.sort(order),
    estaveis: estaveis.sort(order),
  };
}

/**
 * Categoriza crescimento com limiares documentados:
 * novo=A0/B>0; sem produção recente=A>0/B0; estável=|%|<=5;
 * alto crescimento=>=50%; crescimento=>5%; redução=<-5%.
 */
export function classificarCrescimento(
  nome: string,
  periodoA: number,
  periodoB: number
): GrowthClassification {
  const diferencaAbsoluta = periodoB - periodoA;
  const diferencaPercentual = periodoA
    ? arredondarPercentual((diferencaAbsoluta / periodoA) * 100)
    : null;
  let categoria: GrowthCategory;
  if (!periodoA && periodoB) categoria = "NOVO";
  else if (periodoA && !periodoB) categoria = "SEM_PRODUCAO_RECENTE";
  else if (
    diferencaPercentual !== null &&
    Math.abs(diferencaPercentual) <= GROWTH_THRESHOLDS.estavelPercentual
  )
    categoria = "ESTAVEL";
  else if (
    diferencaPercentual !== null &&
    diferencaPercentual >= GROWTH_THRESHOLDS.altoCrescimentoPercentual
  )
    categoria = "ALTO_CRESCIMENTO";
  else if ((diferencaPercentual ?? 0) > GROWTH_THRESHOLDS.estavelPercentual)
    categoria = "CRESCIMENTO";
  else categoria = "REDUCAO";
  return { nome, periodoA, periodoB, diferencaAbsoluta, diferencaPercentual, categoria };
}

function periodoPadrao(dados: ProductionData[]): { a?: PeriodSelection; b?: PeriodSelection } {
  const disponiveis = obterPeriodosDisponiveis(dados);
  if (disponiveis.length < 2) return {};
  const anos = Array.from(new Set(disponiveis.map(item => item.ano))).sort((a, b) => a - b);
  if (anos.length >= 2)
    return {
      a: { ano: anos[0], mesInicio: "JANEIRO", mesFim: "DEZEMBRO" },
      b: { ano: anos.at(-1)!, mesInicio: "JANEIRO", mesFim: "DEZEMBRO" },
    };
  const primeiro = disponiveis[0];
  const ultimo = disponiveis.at(-1)!;
  return {
    a: { ano: primeiro.ano, mesInicio: primeiro.mes, mesFim: primeiro.mes },
    b: { ano: ultimo.ano, mesInicio: ultimo.mes, mesFim: ultimo.mes },
  };
}

export function obterPeriodosDisponiveis(dados: ProductionData[]): AvailablePeriod[] {
  const vistos = new Set<string>();
  return dados
    .map(item => ({ ano: item.ano, mes: item.mes }))
    .filter(item => {
      const key = `${item.ano}-${item.mes}`;
      if (vistos.has(key)) return false;
      vistos.add(key);
      return true;
    })
    .sort((a, b) => a.ano - b.ano || ordemDoMes(a.mes) - ordemDoMes(b.mes));
}

function resumoVazio(): PeriodSummary {
  return {
    label: "Não disponível",
    total: 0,
    mediaMensal: 0,
    mediaPorCliente: 0,
    clientes: 0,
    tipos: 0,
    maiorCliente: null,
    tipoMaisProduzido: "N/A",
    concentracaoTop5: 0,
    mesesIncluidos: [],
    evolucaoMensal: [],
    mixCategorias: [],
  };
}

function clientesReativados(
  dados: ProductionData[],
  periodoA: PeriodSelection,
  periodoB: PeriodSelection,
  clientesB: Set<string>
): string[] {
  const inicioA = periodoOrdenavel(periodoA.ano, periodoA.mesInicio);
  const clientesA = new Set(obterDadosPeriodo(dados, periodoA).map(item => item.cliente));
  return Array.from(clientesB)
    .filter(cliente => {
      if (clientesA.has(cliente)) return false;
      return dados.some(
        item => item.cliente === cliente && periodoOrdenavel(item.ano, item.mes) < inicioA
      );
    })
    .sort();
}

/** Compara intervalos reais de ano e mês, incluindo clientes, tipos, concentração e mix. */
export function compararPeriodos(
  dados: ProductionData[],
  periodoA?: PeriodSelection,
  periodoB?: PeriodSelection
): PeriodComparison {
  const padrao = periodoPadrao(dados);
  const a = periodoA ?? padrao.a;
  const b = periodoB ?? padrao.b;
  if (!a || !b || (a.ano === b.ano && a.mesInicio === b.mesInicio && a.mesFim === b.mesFim)) {
    return {
      disponivel: false,
      motivo: "São necessários dois períodos distintos com ano e intervalo de meses.",
      periodoA: a ? resumoDoPeriodo(dados, a, "Período A") : resumoVazio(),
      periodoB: b ? resumoDoPeriodo(dados, b, "Período B") : resumoVazio(),
      diferencaAbsoluta: 0,
      diferencaPercentual: null,
      clientesNovos: [],
      clientesPerdidos: [],
      clientesRecorrentes: [],
      clientesReativados: [],
      clientesAumentaram: [],
      clientesDiminuiram: [],
      clientesEstaveis: [],
      tiposAumentaram: [],
      tiposDiminuiram: [],
      concentracaoDiferencaPontosPercentuais: 0,
      mixAlterado: [],
      classificacaoCrescimento: [],
    };
  }
  const dadosA = obterDadosPeriodo(dados, a);
  const dadosB = obterDadosPeriodo(dados, b);
  const resumoA = resumoDoPeriodo(dados, a, "Período A");
  const resumoB = resumoDoPeriodo(dados, b, "Período B");
  const volumesA = volumePorCliente(dadosA);
  const volumesB = volumePorCliente(dadosB);
  const clientes = alteracoesPorEntidade<ClientPeriodChange>(volumesA, volumesB, "cliente");
  const tipos = alteracoesPorEntidade<TypePeriodChange>(
    volumePorTipo(dadosA),
    volumePorTipo(dadosB),
    "tipo"
  );
  const mixA = new Map(resumoA.mixCategorias.map(item => [item.categoria, item.participacao]));
  const mixB = new Map(resumoB.mixCategorias.map(item => [item.categoria, item.participacao]));
  const categorias = new Set(
    Array.from(mixA.keys()).concat(Array.from(mixB.keys()))
  );
  const diferencaAbsoluta = resumoB.total - resumoA.total;
  return {
    disponivel: true,
    motivo: dadosA.length && dadosB.length ? null : "Um dos períodos não possui produção; zeros foram mantidos para comparação.",
    periodoA: resumoA,
    periodoB: resumoB,
    diferencaAbsoluta,
    diferencaPercentual: resumoA.total
      ? arredondarPercentual((diferencaAbsoluta / resumoA.total) * 100)
      : null,
    clientesNovos: clientes.novos.filter(nome =>
      !dados.some(
        item => item.cliente === nome && periodoOrdenavel(item.ano, item.mes) < periodoOrdenavel(a.ano, a.mesInicio)
      )
    ),
    clientesPerdidos: clientes.perdidos,
    clientesRecorrentes: clientes.recorrentes,
    clientesReativados: clientesReativados(dados, a, b, new Set(volumesB.keys())),
    clientesAumentaram: clientes.aumentaram,
    clientesDiminuiram: clientes.diminuiram,
    clientesEstaveis: clientes.estaveis,
    tiposAumentaram: tipos.aumentaram,
    tiposDiminuiram: tipos.diminuiram,
    concentracaoDiferencaPontosPercentuais: arredondar(
      resumoB.concentracaoTop5 - resumoA.concentracaoTop5
    ),
    mixAlterado: Array.from(categorias)
      .map(categoria => ({
        categoria,
        participacaoA: mixA.get(categoria) ?? 0,
        participacaoB: mixB.get(categoria) ?? 0,
        diferencaPontosPercentuais: arredondar(
          (mixB.get(categoria) ?? 0) - (mixA.get(categoria) ?? 0)
        ),
      }))
      .sort(
        (left, right) =>
          Math.abs(right.diferencaPontosPercentuais) - Math.abs(left.diferencaPontosPercentuais)
      ),
    classificacaoCrescimento: Array.from(
      new Set(Array.from(volumesA.keys()).concat(Array.from(volumesB.keys())))
    )
      .map(nome => classificarCrescimento(nome, volumesA.get(nome) ?? 0, volumesB.get(nome) ?? 0))
      .sort((left, right) => right.diferencaAbsoluta - left.diferencaAbsoluta),
  };
}

export function analisarAcumulado(dados: ProductionData[]): AccumulatedPoint[] {
  let acumuladoPorAno = new Map<number, number>();
  return pontosMensais(dados).map(point => {
    const acumulado = (acumuladoPorAno.get(point.ano) ?? 0) + point.quantidade;
    acumuladoPorAno.set(point.ano, acumulado);
    return { ...point, acumulado };
  });
}

export function analisarSazonalidade(dados: ProductionData[]): SeasonalityAnalysis {
  const anos = Array.from(new Set(dados.map(item => item.ano))).sort((a, b) => a - b);
  const totais = new Map<string, number>();
  dados.forEach(item => {
    const key = `${item.ano}-${item.mes}`;
    totais.set(key, (totais.get(key) ?? 0) + item.quantidade);
  });
  const mesesPresentes = ordenarMeses(dados.map(item => item.mes));
  return {
    anos,
    linhas: mesesPresentes.map(mes => {
      const valores = Object.fromEntries(
        anos.map(ano => [String(ano), totais.get(`${ano}-${mes}`) ?? 0])
      );
      const ativos = Object.values(valores).filter(value => value > 0);
      return {
        mes,
        mediaHistorica: arredondar(
          ativos.length ? ativos.reduce((sum, value) => sum + value, 0) / ativos.length : 0
        ),
        valores,
      };
    }),
  };
}

export function criarMatrizClienteTipo(dados: ProductionData[]): ClientTypeMatrix {
  const clientes = Array.from(new Set(dados.map(item => item.cliente))).sort();
  const tipos = Array.from(new Set(dados.map(item => item.tipoPlaca))).sort();
  const valores: Record<string, Record<string, number>> = Object.fromEntries(
    clientes.map(cliente => [cliente, Object.fromEntries(tipos.map(tipo => [tipo, 0]))])
  );
  const anos = Array.from(new Set(dados.map(item => item.ano))).sort((a, b) => a - b);
  const valoresPorAno: Record<string, Record<string, Record<string, number>>> = Object.fromEntries(
    anos.map(ano => [
      String(ano),
      Object.fromEntries(
        clientes.map(cliente => [cliente, Object.fromEntries(tipos.map(tipo => [tipo, 0]))])
      ),
    ])
  );
  dados.forEach(item => {
    valores[item.cliente][item.tipoPlaca] += item.quantidade;
    valoresPorAno[String(item.ano)][item.cliente][item.tipoPlaca] += item.quantidade;
  });
  return { clientes, tipos, valores, anos, valoresPorAno };
}

/** Texto determinístico: nenhuma frase depende de opinião ou serviço externo. */
export function gerarRelatorioDeterministico(
  comparacao: PeriodComparison,
  dados: ProductionData[]
): string {
  const metrics = calcularMetricasExecutivas(dados);
  const concentracao = analisarConcentracao(dados);
  if (!comparacao.disponivel)
    return `Relatório de produção: ${comparacao.motivo ?? "comparação indisponível"} No recorte filtrado existem ${metrics.totalProducao.toLocaleString("pt-BR")} placas, ${metrics.totalClientes.toLocaleString("pt-BR")} clientes e ${metrics.tiposProduzidos.toLocaleString("pt-BR")} tipos. A média por cliente é ${metrics.mediaPorCliente.toLocaleString("pt-BR")} e a mediana é ${metrics.medianaPorCliente.toLocaleString("pt-BR")}.`;
  const sinal = comparacao.diferencaAbsoluta >= 0 ? "aumento" : "redução";
  const variacao =
    comparacao.diferencaPercentual === null
      ? "percentual não calculável porque o período A não teve produção"
      : `${Math.abs(comparacao.diferencaPercentual).toLocaleString("pt-BR")} %`;
  const maiorA = comparacao.periodoA.maiorCliente
    ? `${comparacao.periodoA.maiorCliente.nome} (${comparacao.periodoA.maiorCliente.quantidade.toLocaleString("pt-BR")})`
    : "sem cliente";
  const maiorB = comparacao.periodoB.maiorCliente
    ? `${comparacao.periodoB.maiorCliente.nome} (${comparacao.periodoB.maiorCliente.quantidade.toLocaleString("pt-BR")})`
    : "sem cliente";
  return `Resumo da produção — ${comparacao.periodoA.label} × ${comparacao.periodoB.label}. O período A registrou ${comparacao.periodoA.total.toLocaleString("pt-BR")} placas e o período B registrou ${comparacao.periodoB.total.toLocaleString("pt-BR")}, uma ${sinal} de ${Math.abs(comparacao.diferencaAbsoluta).toLocaleString("pt-BR")} placas (${variacao}). A média mensal passou de ${comparacao.periodoA.mediaMensal.toLocaleString("pt-BR")} para ${comparacao.periodoB.mediaMensal.toLocaleString("pt-BR")}. O maior cliente passou de ${maiorA} para ${maiorB}; o tipo principal do período B foi ${comparacao.periodoB.tipoMaisProduzido}. Foram identificados ${comparacao.clientesNovos.length} clientes novos, ${comparacao.clientesPerdidos.length} perdidos, ${comparacao.clientesRecorrentes.length} recorrentes e ${comparacao.clientesReativados.length} reativados. ${comparacao.clientesAumentaram.length} clientes aumentaram e ${comparacao.clientesDiminuiram.length} diminuíram. A concentração Top 5 variou ${comparacao.concentracaoDiferencaPontosPercentuais.toLocaleString("pt-BR")} pontos percentuais; no recorte global, o Top 5 representa ${concentracao.top5Participacao.toLocaleString("pt-BR")} %. Estatisticamente, a média por cliente é ${metrics.mediaPorCliente.toLocaleString("pt-BR")}, a mediana ${metrics.medianaPorCliente.toLocaleString("pt-BR")}, o mínimo ${metrics.minimoPorCliente.toLocaleString("pt-BR")}, o máximo ${metrics.maximoPorCliente.toLocaleString("pt-BR")} e o desvio padrão ${metrics.desvioPadraoPorCliente.toLocaleString("pt-BR")}.`;
}
