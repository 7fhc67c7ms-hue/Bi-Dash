import { describe, expect, it } from "vitest";
import { filterProductionData, isOwnedByUser } from "./filters";
import type { ProductionData } from "../drizzle/schema";

const rows = ([
  { id: 1, userId: 7, cliente: "ALFA", tipoPlaca: "OVAL", quantidade: 4, mes: "JANEIRO", ano: 2026 },
  { id: 2, userId: 7, cliente: "BETA OBRAS", tipoPlaca: "RETANGULAR", quantidade: 8, mes: "JANEIRO", ano: 2026 },
  { id: 3, userId: 8, cliente: "ALFA", tipoPlaca: "OVAL", quantidade: 2, mes: "FEVEREIRO", ano: 2026 },
] as unknown) as ProductionData[];

describe("Production filters", () => {
  it("separa clientes comuns e de obras", () => {
    expect(filterProductionData(rows, { categoria: "OBRAS" }).map((row) => row.cliente)).toEqual(["BETA OBRAS"]);
    expect(filterProductionData(rows, { categoria: "COMUNS" }).map((row) => row.cliente)).toEqual(["ALFA", "ALFA"]);
  });
  it("combina cliente e modelo", () => {
    expect(filterProductionData(rows, { cliente: "ALFA", tipoPlaca: "OVAL" })).toHaveLength(2);
  });
  it("filtra por múltiplos tipos e anos sem alterar os dados de origem", () => {
    const historical = [
      ...rows,
      { ...rows[0], id: 5, ano: 2025, tipoPlaca: "QUAD" },
    ];
    expect(
      filterProductionData(historical, {
        years: [2025],
        tiposPlaca: ["QUAD", "OVAL"],
      }).map(row => [row.ano, row.tipoPlaca])
    ).toEqual([[2025, "QUAD"]]);
    expect(historical).toHaveLength(4);
  });
  it("inclui somente os clientes selecionados", () => {
    expect(filterProductionData(rows, { selectedClients: ["ALFA"], clientFilterMode: "INCLUIR" }).map((row) => row.cliente)).toEqual(["ALFA", "ALFA"]);
  });
  it("exclui somente os clientes selecionados", () => {
    expect(filterProductionData(rows, { selectedClients: ["BETA OBRAS"], clientFilterMode: "EXCLUIR" }).map((row) => row.cliente)).toEqual(["ALFA", "ALFA"]);
  });
  it("permite excluir todos os clientes cujo nome contém OBRAS", () => {
    const withMoreObras = [...rows, { ...rows[0], id: 4, cliente: "Construtora obras especiais" }];
    expect(filterProductionData(withMoreObras, { selectedClients: ["BETA OBRAS", "Construtora obras especiais"], clientFilterMode: "EXCLUIR" }).map((row) => row.cliente)).toEqual(["ALFA", "ALFA"]);
  });
  it("não considera registros de outro utilizador como próprios", () => {
    expect(rows.filter((row) => isOwnedByUser(row, 7))).toHaveLength(2);
    expect(isOwnedByUser(rows[2], 7)).toBe(false);
  });
});
