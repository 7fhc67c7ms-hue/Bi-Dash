import { describe, it, expect } from "vitest";
import {
  calcularKPIs,
  calcularMetricasAvancadas,
  criarRanking,
  obterTopProdutos,
  agruparPorMes,
  agruparPorMesOrdenado,
  formatarTabelaProducao,
  analisarMixModelos,
  compararMeses,
  criarMatrizModeloMes,
  calcularResumoMensal,
  obterModelosPorMes,
  calcularMetricasExecutivas,
  analisarClientes,
  analisarTipos,
  compararPeriodos,
  gerarRelatorioDeterministico,
} from "./analytics";
import { ProductionData } from "../drizzle/schema";

// Mock data
const mockData: ProductionData[] = [
  {
    id: 1,
    userId: 1,
    romaneio: "001",
    cliente: "CLIENTE A",
    tipoPlaca: "RET - 8x20cm",
    quantidade: 100,
    mes: "JANEIRO",
    ano: 2026,
    pdfFileName: "test.pdf",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    userId: 1,
    romaneio: "002",
    cliente: "CLIENTE B OBRAS",
    tipoPlaca: "OVAL - 9x12cm",
    quantidade: 50,
    mes: "JANEIRO",
    ano: 2026,
    pdfFileName: "test.pdf",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 3,
    userId: 1,
    romaneio: "003",
    cliente: "CLIENTE A",
    tipoPlaca: "RET - 8x20cm",
    quantidade: 75,
    mes: "FEVEREIRO",
    ano: 2026,
    pdfFileName: "test.pdf",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 4,
    userId: 1,
    romaneio: "004",
    cliente: "CLIENTE C",
    tipoPlaca: "OVAL - 9x12cm",
    quantidade: 120,
    mes: "FEVEREIRO",
    ano: 2026,
    pdfFileName: "test.pdf",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe("Analytics Functions", () => {
  describe("calcularKPIs", () => {
    it("deve calcular KPIs corretamente", () => {
      const kpis = calcularKPIs(mockData);

      expect(kpis.totalProducao).toBe(345); // 100 + 50 + 75 + 120
      expect(kpis.numeroPedidos).toBe(4); // 4 romaneios unicos
      expect(kpis.ticketMedio).toBe(86); // 345 / 4 = 86.25 arredondado
      expect(kpis.produtoEstrela).toBe("RET - 8x20cm"); // 100 + 75 = 175
    });

    it("deve retornar valores padrao para dados vazios", () => {
      const kpis = calcularKPIs([]);

      expect(kpis.totalProducao).toBe(0);
      expect(kpis.numeroPedidos).toBe(0);
      expect(kpis.ticketMedio).toBe(0);
      expect(kpis.produtoEstrela).toBe("N/A");
    });
  });

  describe("calcularMetricasAvancadas", () => {
    it("deve calcular mix, concentração, pico e variação mensal", () => {
      const metrics = calcularMetricasAvancadas(mockData);
      expect(metrics.totalClientes).toBe(3);
      expect(metrics.totalProdutos).toBe(2);
      expect(metrics.quantidadeClientesObras).toBe(1);
      expect(metrics.participacaoObras).toBe(14.5);
      expect(metrics.participacaoTop5Clientes).toBe(100);
      expect(metrics.mesPico).toBe("FEVEREIRO");
      expect(metrics.crescimentoUltimoMes).toBe(30);
    });

    it("deve lidar com dados vazios sem dividir por zero", () => {
      const metrics = calcularMetricasAvancadas([]);
      expect(metrics.totalClientes).toBe(0);
      expect(metrics.participacaoTop5Clientes).toBe(0);
      expect(metrics.crescimentoUltimoMes).toBeNull();
      expect(metrics.mesPico).toBe("N/A");
    });
  });

  describe("criarRanking", () => {
    it("deve criar ranking de clientes comuns sem OBRAS", () => {
      const ranking = criarRanking(mockData, false);

      expect(ranking.length).toBe(2); // CLIENTE A e CLIENTE C
      expect(ranking[0].nome).toBe("CLIENTE A");
      expect(ranking[0].quantidade).toBe(175); // 100 + 75
      expect(ranking[1].nome).toBe("CLIENTE C");
      expect(ranking[1].quantidade).toBe(120);
    });

    it("deve criar ranking de clientes de obras com OBRAS", () => {
      const ranking = criarRanking(mockData, true);

      expect(ranking.length).toBe(1); // Apenas CLIENTE B OBRAS
      expect(ranking[0].nome).toBe("CLIENTE B OBRAS");
      expect(ranking[0].quantidade).toBe(50);
    });

    it("deve retornar ranking vazio para filtro sem resultados", () => {
      const ranking = criarRanking([], false);
      expect(ranking.length).toBe(0);
    });
  });

  describe("obterTopProdutos", () => {
    it("deve retornar top N produtos", () => {
      const topProdutos = obterTopProdutos(mockData, 2);

      expect(topProdutos.length).toBe(2);
      expect(topProdutos[0].nome).toBe("RET - 8x20cm");
      expect(topProdutos[0].quantidade).toBe(175);
      expect(topProdutos[1].nome).toBe("OVAL - 9x12cm");
      expect(topProdutos[1].quantidade).toBe(170); // 50 + 120
    });

    it("deve retornar todos os produtos se N for maior que a quantidade", () => {
      const topProdutos = obterTopProdutos(mockData, 100);

      expect(topProdutos.length).toBe(2);
    });
  });

  describe("agruparPorMes", () => {
    it("deve agrupar dados por mes em ordem cronologica", () => {
      const agrupado = agruparPorMes(mockData);

      expect(agrupado.length).toBe(2);
      expect(agrupado[0].mes).toBe("JANEIRO");
      expect(agrupado[0].total).toBe(150); // 100 + 50
      expect(agrupado[1].mes).toBe("FEVEREIRO");
      expect(agrupado[1].total).toBe(195); // 75 + 120
    });
  });

  describe("agruparPorMesOrdenado", () => {
    it("deve agrupar dados por mes ordenado por quantidade", () => {
      const agrupado = agruparPorMesOrdenado(mockData);

      expect(agrupado.length).toBe(2);
      expect(agrupado[0].mes).toBe("FEVEREIRO");
      expect(agrupado[0].total).toBe(195);
      expect(agrupado[1].mes).toBe("JANEIRO");
      expect(agrupado[1].total).toBe(150);
    });
  });

  describe("formatarTabelaProducao", () => {
    it("deve formatar dados para tabela de producao", () => {
      const tabela = formatarTabelaProducao(mockData);

      expect(tabela.length).toBe(3); // 3 clientes
      expect(tabela[0].cliente).toBe("CLIENTE A");
      expect(tabela[0].total).toBe(175);
      expect(tabela[0].itens.length).toBe(1); // mesmo modelo consolidado
      expect(tabela[0].itens[0].quantidade).toBe(175);
    });
  });

  describe("novas análises por modelo e mês", () => {
    it("deve listar modelos por mês com participação mensal", () => {
      const modelos = obterModelosPorMes(mockData);
      expect(modelos).toEqual([
        {
          mes: "JANEIRO",
          tipoPlaca: "RET - 8x20cm",
          quantidade: 100,
          participacaoMes: 66.7,
        },
        {
          mes: "JANEIRO",
          tipoPlaca: "OVAL - 9x12cm",
          quantidade: 50,
          participacaoMes: 33.3,
        },
        {
          mes: "FEVEREIRO",
          tipoPlaca: "OVAL - 9x12cm",
          quantidade: 120,
          participacaoMes: 61.5,
        },
        {
          mes: "FEVEREIRO",
          tipoPlaca: "RET - 8x20cm",
          quantidade: 75,
          participacaoMes: 38.5,
        },
      ]);
    });

    it("deve montar matriz modelo por mês e ordenar pelo total", () => {
      const matriz = criarMatrizModeloMes(mockData);
      expect(matriz.meses).toEqual(["JANEIRO", "FEVEREIRO"]);
      expect(matriz.linhas).toEqual(
        [
          {
            tipoPlaca: "OVAL - 9x12cm",
            valores: { JANEIRO: 50, FEVEREIRO: 120 },
            total: 170,
          },
          {
            tipoPlaca: "RET - 8x20cm",
            valores: { JANEIRO: 100, FEVEREIRO: 75 },
            total: 175,
          },
        ].sort((a, b) => b.total - a.total)
      );
    });

    it("deve resumir cada mês com pedidos, modelo estrela e variação", () => {
      const resumo = calcularResumoMensal(mockData);
      expect(resumo).toEqual([
        {
          mes: "JANEIRO",
          total: 150,
          numeroPedidos: 2,
          modelosAtivos: 2,
          modeloEstrela: "RET - 8x20cm",
          participacaoModeloEstrela: 66.7,
          variacaoPercentual: null,
        },
        {
          mes: "FEVEREIRO",
          total: 195,
          numeroPedidos: 2,
          modelosAtivos: 2,
          modeloEstrela: "OVAL - 9x12cm",
          participacaoModeloEstrela: 61.5,
          variacaoPercentual: 30,
        },
      ]);
    });

    it("deve calcular o mix completo com recorrência e pico", () => {
      const mix = analisarMixModelos(mockData);
      expect(mix).toEqual(
        [
          {
            tipoPlaca: "OVAL - 9x12cm",
            total: 170,
            participacao: 49.3,
            mesesAtivos: 2,
            mediaMensal: 85,
            mesPico: "FEVEREIRO",
            quantidadeMesPico: 120,
          },
          {
            tipoPlaca: "RET - 8x20cm",
            total: 175,
            participacao: 50.7,
            mesesAtivos: 2,
            mediaMensal: 87.5,
            mesPico: "JANEIRO",
            quantidadeMesPico: 100,
          },
        ].sort((a, b) => b.total - a.total)
      );
    });

    it("deve comparar dois ou mais meses por modelo e total", () => {
      const comparacao = compararMeses(mockData, ["FEVEREIRO", "JANEIRO"]);
      expect(comparacao.meses).toEqual(["JANEIRO", "FEVEREIRO"]);
      expect(
        comparacao.linhas.find(linha => linha.tipoPlaca === "OVAL - 9x12cm")
      ).toMatchObject({
        tipoPlaca: "OVAL - 9x12cm",
        valores: { JANEIRO: 50, FEVEREIRO: 120 },
        diferencaPrimeiroUltimo: 70,
        variacaoPercentual: 140,
      });
      expect(comparacao.totais).toEqual([
        { mes: "JANEIRO", total: 150, variacaoPercentual: null },
        { mes: "FEVEREIRO", total: 195, variacaoPercentual: 30 },
      ]);
    });
  });
});

describe("Análises executivas e comparação de períodos", () => {
  const historico: ProductionData[] = [
    { ...mockData[0], id: 10, mes: "JANEIRO", ano: 2025, quantidade: 100 },
    { ...mockData[1], id: 11, mes: "JANEIRO", ano: 2025, quantidade: 50 },
    { ...mockData[0], id: 12, mes: "FEVEREIRO", ano: 2025, quantidade: 20 },
    { ...mockData[0], id: 13, mes: "JANEIRO", ano: 2026, quantidade: 150 },
    { ...mockData[1], id: 14, mes: "JANEIRO", ano: 2026, quantidade: 10 },
    { ...mockData[0], id: 15, mes: "FEVEREIRO", ano: 2026, quantidade: 30 },
    {
      ...mockData[0],
      id: 16,
      mes: "FEVEREIRO",
      ano: 2026,
      quantidade: 5,
      tipoPlaca: "OVAL - 8x10cm",
    },
  ];

  it("calcula média, mediana, extremos, desvio padrão e deixa dias indisponíveis", () => {
    const metrics = calcularMetricasExecutivas(historico);
    expect(metrics.totalProducao).toBe(365);
    expect(metrics.totalClientes).toBe(2);
    expect(metrics.mediaPorCliente).toBe(182.5);
    expect(metrics.medianaPorCliente).toBe(182.5);
    expect(metrics.minimoPorCliente).toBe(60);
    expect(metrics.maximoPorCliente).toBe(305);
    expect(metrics.diasProducao).toBeNull();
    expect(metrics.dadosDiariosDisponiveis).toBe(false);
  });

  it("analisa clientes e tipos sem misturar as dimensões", () => {
    const clientes = analisarClientes(historico);
    const tipos = analisarTipos(historico);
    expect(clientes[0]).toMatchObject({
      cliente: "CLIENTE A",
      total: 305,
      tipos: 2,
      tipoMaisProduzido: "RET - 8x20cm",
    });
    expect(tipos[0]).toMatchObject({
      tipoPlaca: "RET - 8x20cm",
      total: 300,
      clientes: 1,
    });
    expect(tipos[0].maiorCliente?.nome).toBe("CLIENTE A");
    expect(tipos[0].evolucaoMensal).toHaveLength(4);
  });

  it("compara períodos, classifica clientes e gera texto determinístico", () => {
    const comparison = compararPeriodos(
      historico,
      { ano: 2025, mesInicio: "JANEIRO", mesFim: "FEVEREIRO" },
      { ano: 2026, mesInicio: "JANEIRO", mesFim: "FEVEREIRO" }
    );
    expect(comparison.disponivel).toBe(true);
    expect(comparison.periodoA.total).toBe(170);
    expect(comparison.periodoB.total).toBe(195);
    expect(comparison.diferencaAbsoluta).toBe(25);
    expect(comparison.diferencaPercentual).toBe(14.7);
    expect(comparison.clientesEstaveis).toHaveLength(0);
    expect(comparison.clientesAumentaram.map(item => item.cliente)).toContain(
      "CLIENTE A"
    );
    expect(comparison.clientesDiminuiram.map(item => item.cliente)).toContain(
      "CLIENTE B OBRAS"
    );
    const report = gerarRelatorioDeterministico(comparison, historico);
    expect(report).toContain("Resumo da produção");
    expect(report).toContain("25 placas");
  });
});
