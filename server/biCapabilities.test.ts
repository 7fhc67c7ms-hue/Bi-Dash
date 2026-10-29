import { describe, expect, it } from "vitest";
import type { ProductionData } from "../drizzle/schema";
import {
  analisarAcumulado,
  analisarClientes,
  analisarConcentracao,
  analisarMixCategorias,
  analisarSazonalidade,
  analisarTipos,
  calcularMetricasExecutivas,
  categoriaTipoPlaca,
  classificarCrescimento,
  compararPeriodos,
  criarMatrizClienteTipo,
  gerarRelatorioDeterministico,
} from "./analytics";

function row(
  id: number,
  cliente: string,
  tipoPlaca: string,
  quantidade: number,
  mes: string,
  ano: number
): ProductionData {
  return {
    id,
    userId: 1,
    uploadId: null,
    romaneio: String(id),
    cliente,
    tipoPlaca,
    quantidade,
    mes,
    ano,
    pdfFileName: "teste.pdf",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

const history = [
  row(1, "REATIVADO", "RET - 8x20", 10, "JANEIRO", 2024),
  row(2, "RECORRENTE", "RET - 8x20", 100, "JANEIRO", 2025),
  row(3, "PERDIDO", "OVAL - 8x10", 80, "FEVEREIRO", 2025),
  row(4, "ESTAVEL", "QUAD - 20x20", 100, "FEVEREIRO", 2025),
  row(5, "RECORRENTE", "RET - 8x20", 170, "JANEIRO", 2026),
  row(6, "NOVO", "OVAL - 8x10", 60, "FEVEREIRO", 2026),
  row(7, "REATIVADO", "OVAL - 8x10", 40, "FEVEREIRO", 2026),
  row(8, "ESTAVEL", "QUAD - 20x20", 104, "FEVEREIRO", 2026),
];

describe("capacidades completas do BI", () => {
  it("calcula painel executivo com estatística, produto, cliente, concentração e ausência diária explícita", () => {
    const metrics = calcularMetricasExecutivas(history);
    expect(metrics.totalProducao).toBe(664);
    expect(metrics.totalClientes).toBe(5);
    expect(metrics.tiposProduzidos).toBe(3);
    expect(metrics.maiorCliente?.nome).toBe("RECORRENTE");
    expect(metrics.produtoEstrela).toBe("RET - 8x20");
    expect(metrics.participacaoTop5).toBe(100);
    expect(metrics.medianaPorCliente).toBeGreaterThan(0);
    expect(metrics.desvioPadraoPorCliente).toBeGreaterThan(0);
    expect(metrics.mediaDiaria).toBeNull();
    expect(metrics.mediaSemanal).toBeNull();
    expect(metrics.dadosDiariosDisponiveis).toBe(false);
  });

  it("detalha clientes e tipos com evolução anual/mensal, extremos, ranking e mix", () => {
    const clients = analisarClientes(history);
    const types = analisarTipos(history);
    const recurring = clients.find(item => item.cliente === "RECORRENTE")!;
    expect(recurring.evolucaoAnual).toEqual([
      { ano: 2025, quantidade: 100 },
      { ano: 2026, quantidade: 170 },
    ]);
    expect(recurring.crescimentoPercentual).toBe(70);
    expect(recurring.rankingHistorico).toBe(1);
    expect(recurring.mixTipos[0].nome).toBe("RET - 8x20");
    expect(types[0]).toMatchObject({ ranking: 1, categoria: "RET" });
    expect(types.find(item => item.categoria === "OVAL")?.evolucaoAnual).toHaveLength(2);
  });

  it("classifica crescimento com limiares documentados de 5% e 50%", () => {
    expect(classificarCrescimento("novo", 0, 10).categoria).toBe("NOVO");
    expect(classificarCrescimento("perdido", 10, 0).categoria).toBe("SEM_PRODUCAO_RECENTE");
    expect(classificarCrescimento("estavel", 100, 105).categoria).toBe("ESTAVEL");
    expect(classificarCrescimento("cresceu", 100, 106).categoria).toBe("CRESCIMENTO");
    expect(classificarCrescimento("alto", 100, 150).categoria).toBe("ALTO_CRESCIMENTO");
    expect(classificarCrescimento("reduziu", 100, 90).categoria).toBe("REDUCAO");
  });

  it("compara anos e mesmos meses com novos, perdidos, recorrentes, reativados, mix e concentração", () => {
    const comparison = compararPeriodos(
      history,
      { ano: 2025, mesInicio: "JANEIRO", mesFim: "FEVEREIRO" },
      { ano: 2026, mesInicio: "JANEIRO", mesFim: "FEVEREIRO" }
    );
    expect(comparison.disponivel).toBe(true);
    expect(comparison.periodoA.total).toBe(280);
    expect(comparison.periodoB.total).toBe(374);
    expect(comparison.clientesNovos).toEqual(["NOVO"]);
    expect(comparison.clientesPerdidos).toEqual(["PERDIDO"]);
    expect(comparison.clientesRecorrentes).toEqual(["ESTAVEL", "RECORRENTE"]);
    expect(comparison.clientesReativados).toEqual(["REATIVADO"]);
    expect(comparison.clientesAumentaram.map(item => item.cliente)).toContain("RECORRENTE");
    expect(comparison.tiposAumentaram.length).toBeGreaterThan(0);
    expect(comparison.mixAlterado.map(item => item.categoria)).toEqual(
      expect.arrayContaining(["RET", "OVAL", "QUAD"])
    );
    expect(comparison.classificacaoCrescimento).toHaveLength(5);
  });

  it("calcula concentração Top 5/demais e mix categorizado com modelos", () => {
    const concentration = analisarConcentracao([
      ...history,
      row(20, "SEXTO", "OUTRO", 1, "JANEIRO", 2026),
    ]);
    expect(concentration.clientes).toHaveLength(6);
    expect(concentration.top5Total + concentration.demaisTotal).toBe(665);
    expect(concentration.demaisTotal).toBe(1);
    const mix = analisarMixCategorias(history);
    expect(mix.map(item => item.categoria)).toEqual(
      expect.arrayContaining(["RET", "OVAL", "QUAD"])
    );
    expect(mix.find(item => item.categoria === "OVAL")?.modelos[0].nome).toBe("OVAL - 8x10");
    expect(categoriaTipoPlaca("RETANGULAR 5x15")).toBe("RET");
  });

  it("gera acumulado anual, sazonalidade multi-ano e matriz cliente×tipo reconciliável", () => {
    const accumulated = analisarAcumulado(history);
    expect(accumulated.find(item => item.ano === 2025 && item.mes === "FEVEREIRO")?.acumulado).toBe(280);
    expect(accumulated.find(item => item.ano === 2026 && item.mes === "FEVEREIRO")?.acumulado).toBe(374);
    const seasonality = analisarSazonalidade(history);
    expect(seasonality.anos).toEqual([2024, 2025, 2026]);
    expect(seasonality.linhas.find(item => item.mes === "JANEIRO")?.valores["2026"]).toBe(170);
    const matrix = criarMatrizClienteTipo(history);
    expect(matrix.valores.RECORRENTE["RET - 8x20"]).toBe(270);
    expect(matrix.anos).toEqual([2024, 2025, 2026]);
    expect(matrix.valoresPorAno["2026"].RECORRENTE["RET - 8x20"]).toBe(170);
    const matrixTotal = Object.values(matrix.valores).reduce(
      (sum, client) => sum + Object.values(client).reduce((inner, value) => inner + value, 0),
      0
    );
    expect(matrixTotal).toBe(664);
  });

  it("gera relatório determinístico com resultados comparativos e estatísticos", () => {
    const comparison = compararPeriodos(
      history,
      { ano: 2025, mesInicio: "JANEIRO", mesFim: "FEVEREIRO" },
      { ano: 2026, mesInicio: "JANEIRO", mesFim: "FEVEREIRO" }
    );
    const report = gerarRelatorioDeterministico(comparison, history);
    expect(report).toContain("94 placas");
    expect(report).toContain("recorrentes");
    expect(report).toContain("reativados");
    expect(report).toContain("desvio padrão");
  });
});
