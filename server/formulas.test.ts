import { describe, expect, it } from "vitest";
import { calcularConsumoTeorico } from "./formulas";

describe("fichas técnicas", () => {
  it("calcula consumo base e consumo com perdas", () => {
    const result = calcularConsumoTeorico({
      rendimento: 10,
      perdaPercentual: 10,
      componentes: [{ componenteId: 7, quantidade: 2, perdaPercentual: 5 }],
    }, 20);
    expect(result[0].consumoBase).toBe(4);
    expect(result[0].consumoComPerdas).toBeCloseTo(4.62);
    expect(result[0].perdaAplicada).toBeCloseTo(0.62);
  });

  it("rejeita rendimento e quantidade inválidos", () => {
    expect(() => calcularConsumoTeorico({ rendimento: 0, perdaPercentual: 0, componentes: [] }, 1)).toThrow();
    expect(() => calcularConsumoTeorico({ rendimento: 1, perdaPercentual: 0, componentes: [] }, 0)).toThrow();
  });
});
