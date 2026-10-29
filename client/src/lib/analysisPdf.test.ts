import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadProductionAnalysisPdf } from "./analysisPdf";
import type { ProductionAnalysisReportData } from "./analysisPdf";

const reportData = {
  kpis: { totalProducao: 100, numeroPedidos: 2, ticketMedio: 50, produtoEstrela: "RET 8x20" },
  metricasAvancadas: {
    totalClientes: 1,
    totalProdutos: 1,
    quantidadeClientesObras: 0,
    participacaoObras: 0,
    participacaoTop5Clientes: 100,
    mesPico: "JANEIRO",
    crescimentoUltimoMes: null,
    mediaPorPedido: 50,
    qualidadeImportacao: { validas: 2, rejeitadas: 0, duplicados: 0 },
  },
  metricasExecutivas: {
    totalProducao: 100,
    totalClientes: 1,
    mediaGeral: 100,
    mediaPorCliente: 100,
    medianaPorCliente: 100,
    minimoPorCliente: 100,
    maximoPorCliente: 100,
    desvioPadraoPorCliente: 0,
    mediaMensal: 100,
    mediaSemanal: null,
    mediaDiaria: null,
    mediaPorTipo: 100,
    mesesComProducao: 1,
    tiposProduzidos: 1,
    produtoEstrela: "RET 8x20",
    maiorCliente: { nome: "Cliente A", quantidade: 100 },
    participacaoTop5: 100,
    variacaoAbsoluta: null,
    variacaoPercentual: null,
    periodoAnterior: null,
    periodoAtual: "JANEIRO/2026",
    diasProducao: null,
    diasSemProducao: null,
    dadosDiariosDisponiveis: false,
  },
  analiseClientes: [],
  analiseTipos: [],
  concentracao: { clientes: [], top5Total: 100, top5Participacao: 100, demaisTotal: 0, demaisParticipacao: 0 },
  mixCategorias: [],
  evolucaoAcumulada: [],
  sazonalidade: { anos: [], linhas: [] },
  matrizClienteTipo: { clientes: [], tipos: [], valores: {}, anos: [], valoresPorAno: {} },
  comparacaoPeriodos: {
    disponivel: false,
    motivo: "Teste",
    periodoA: { label: "A", total: 0, mediaMensal: 0, mediaPorCliente: 0, clientes: 0, tipos: 0, maiorCliente: null, tipoMaisProduzido: "N/A", concentracaoTop5: 0, mesesIncluidos: [], evolucaoMensal: [], mixCategorias: [] },
    periodoB: { label: "B", total: 0, mediaMensal: 0, mediaPorCliente: 0, clientes: 0, tipos: 0, maiorCliente: null, tipoMaisProduzido: "N/A", concentracaoTop5: 0, mesesIncluidos: [], evolucaoMensal: [], mixCategorias: [] },
    diferencaAbsoluta: 0,
    diferencaPercentual: null,
    clientesNovos: [], clientesPerdidos: [], clientesRecorrentes: [], clientesReativados: [],
    clientesAumentaram: [], clientesDiminuiram: [], clientesEstaveis: [], tiposAumentaram: [], tiposDiminuiram: [],
    concentracaoDiferencaPontosPercentuais: 0, mixAlterado: [], classificacaoCrescimento: [],
  },
  relatorioDeterministico: "Relatório de teste.",
  tabelaProducao: [],
  rankingComuns: [], rankingObras: [], topProdutos: [], resumoMensal: [], modelosPorMes: [],
  matrizModeloMes: { meses: [], linhas: [] }, analiseMixModelos: [], comparacaoMeses: { meses: [], linhas: [], totais: [] },
} as ProductionAnalysisReportData;

describe("geração profissional de PDF", () => {
  afterEach(() => vi.restoreAllMocks());

  it("produz um blob PDF sem depender de html2canvas", () => {
    const click = vi.fn();
    const anchor = { href: "", download: "", style: {}, click, remove: vi.fn() };
    vi.stubGlobal("document", {
      createElement: vi.fn(() => anchor),
      body: { appendChild: vi.fn() },
    });
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:test"),
      revokeObjectURL: vi.fn(),
    });
    vi.stubGlobal("window", { setTimeout });

    downloadProductionAnalysisPdf({ data: reportData, fileName: "teste-pdf" });

    expect(click).toHaveBeenCalledOnce();
    expect(anchor.download).toMatch(/^teste-pdf-\d{4}-\d{2}-\d{2}\.pdf$/);
  });
});
