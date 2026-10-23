import { describe, expect, it } from "vitest";
import { summarizeCustomerLocations } from "./customerLocations";

describe("summarizeCustomerLocations", () => {
  it("agrupa clientes por estado e cidade", () => {
    const date = new Date("2026-01-01T00:00:00.000Z");
    const result = summarizeCustomerLocations([
      { id: 1, userId: 1, nome: "A", cep: "01001000", cidade: "São Paulo", uf: "SP", estado: "São Paulo", codigoIbge: "1", fonteLocalizacao: "cep", createdAt: date, updatedAt: date },
      { id: 2, userId: 1, nome: "B", cep: null, cidade: "São Paulo", uf: "SP", estado: "São Paulo", codigoIbge: "1", fonteLocalizacao: "cidade_uf", createdAt: date, updatedAt: date },
      { id: 3, userId: 1, nome: "C", cep: null, cidade: "Curitiba", uf: "PR", estado: "Paraná", codigoIbge: "2", fonteLocalizacao: "cidade_uf", createdAt: date, updatedAt: date },
    ]);

    expect(result.totalClientes).toBe(3);
    expect(result.estadosAtendidos).toBe(2);
    expect(result.porEstado[0]).toMatchObject({ uf: "SP", total: 2 });
    expect(result.porCidade[0]).toMatchObject({ cidade: "São Paulo", uf: "SP", total: 2 });
  });
});
