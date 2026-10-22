import { describe, expect, it } from "vitest";
import { analisarEstoque } from "./stock";
import { analisarProducaoCliente } from "./clientAnalysis";

const production = [
  { tipoPlaca: "RET 10x10", quantidade: 100, ano: 2025, mes: "JANEIRO", cliente: "A", romaneio: "R1" },
  { tipoPlaca: "RET 10x10", quantidade: 140, ano: 2025, mes: "FEVEREIRO", cliente: "A", romaneio: "R2" },
  { tipoPlaca: "OVAL 8x10", quantidade: 50, ano: 2025, mes: "JANEIRO", cliente: "B", romaneio: "R3" },
] as any;

const movements = [
  { tipoPlaca: "RET 10x10", movimento: "entrada", quantidade: 80 },
  { tipoPlaca: "RET 10x10", movimento: "saida", quantidade: 20 },
  { tipoPlaca: "RET 10x10", movimento: "devolucao", quantidade: 15 },
  { tipoPlaca: "RET 10x10", movimento: "descarte", quantidade: 5 },
] as any;

describe("módulos de estoque e cliente", () => {
  it("recomenda cobertura baseada na média mensal dos romaneios", () => {
    const result = analisarEstoque(production, movements, 2);
    const item = result.itens.find(row => row.tipoPlaca === "RET 10x10")!;
    expect(item.consumoMedioMensal).toBe(120);
    expect(item.estoqueRecomendado).toBe(240);
    expect(item.estoqueAtual).toBe(40);
    expect(item.devolucoes).toBe(15);
    expect(item.descartes).toBe(5);
    expect(item.necessidadeReposicao).toBe(200);
    expect(item.status).toBe("REPOR");
  });

  it("detalha produção somente do cliente selecionado", () => {
    const result = analisarProducaoCliente(production, "A");
    expect(result.total).toBe(240);
    expect(result.totalRomaneios).toBe(2);
    expect(result.meses).toHaveLength(2);
    expect(result.tipos[0].tipoPlaca).toBe("RET 10x10");
    expect(result.romaneios.every(row => row.romaneio !== "R3")).toBe(true);
  });
});
