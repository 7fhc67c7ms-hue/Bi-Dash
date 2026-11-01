import { describe, expect, it } from "vitest";
import { analisarCustos, filtrarCustosPorPeriodo } from "./costs";

const date = new Date("2026-01-15T12:00:00.000Z");

describe("analisarCustos", () => {
  it("calcula faturamento, custo de compra, insumos e margem", () => {
    const result = analisarCustos(
      [
        {
          id: 1,
          userId: 1,
          uploadId: null,
          romaneio: "R1",
          cliente: "Cliente",
          tipoPlaca: "RET 20x30",
          quantidade: 10,
          mes: "JANEIRO",
          ano: 2026,
          pdfFileName: null,
          createdAt: date,
          updatedAt: date,
        },
      ],
      [
        {
          id: 1,
          userId: 1,
          tipoPlaca: "RET 20x30",
          custoCompraCentavos: 500,
          precoVendaCentavos: 1200,
          vigenteDesde: new Date("2026-01-01T00:00:00.000Z"),
          observacao: null,
          createdAt: date,
        },
      ],
      [
        {
          id: 1,
          userId: 1,
          supplyId: 1,
          periodicidade: "por_placas",
          quantidade: "2.5",
          custoUnitarioCentavos: 100,
          placasProduzidas: 10,
          referenciaEm: date,
          observacao: null,
          createdAt: date,
        },
      ],
      [],
    );

    expect(result.totalPlacas).toBe(10);
    expect(result.faturamentoCentavos).toBe(12000);
    expect(result.custoCompraCentavos).toBe(5000);
    expect(result.custoInsumosCentavos).toBe(250);
    expect(result.custoTotalCentavos).toBe(5250);
    expect(result.margemBrutaCentavos).toBe(6750);
    expect(result.custoMedioPorPlacaCentavos).toBe(525);
  });

  it("filtra produção e consumo por ano e mês", () => {
    const january = { ano: 2026, mes: "JANEIRO" };
    const februaryDate = new Date("2026-02-15T12:00:00.000Z");
    const production = [
      { id: 1, ano: 2026, mes: "JANEIRO" },
      { id: 2, ano: 2026, mes: "FEVEREIRO" },
    ] as Array<{ id: number; ano: number; mes: string }>;
    const consumptions = [
      { id: 1, referenciaEm: date },
      { id: 2, referenciaEm: februaryDate },
    ] as Array<{ id: number; referenciaEm: Date }>;
    const result = filtrarCustosPorPeriodo(production as never, consumptions as never, january);
    expect(result.production.map(item => item.id)).toEqual([1]);
    expect(result.consumptions.map(item => item.id)).toEqual([1]);
  });
});
