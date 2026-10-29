import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import ProductionTable from "./ProductionTable";

describe("ProductionTable", () => {
  it("emite apenas linhas de tabela diretamente dentro do tbody", () => {
    const html = renderToStaticMarkup(
      <ProductionTable
        data={[{ cliente: "CLIENTE A", itens: [{ tipoPlaca: "OVAL", quantidade: 2 }], total: 2 }]}
      />,
    );

    expect(html).toMatch(/<tbody[^>]*><tr/);
    expect(html).not.toMatch(/<tbody[^>]*><div/);
    expect(html).toContain("Subtotal - CLIENTE A");
    expect(html).toContain("TOTAL GERAL");
  });
});
