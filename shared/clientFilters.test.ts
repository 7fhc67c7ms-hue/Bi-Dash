import { describe, expect, it } from "vitest";
import { isObrasClient, matchesClientFilter } from "./clientFilters";

describe("client filter helpers", () => {
  it("identifica OBRAS em qualquer capitalização", () => {
    expect(isObrasClient("BETA OBRAS")).toBe(true);
    expect(isObrasClient("Construtora obras especiais")).toBe(true);
    expect(isObrasClient("ALFA")).toBe(false);
  });

  it("inclui todos quando não há seleção", () => {
    expect(matchesClientFilter("ALFA", [], "INCLUIR")).toBe(true);
    expect(matchesClientFilter("ALFA", [], "EXCLUIR")).toBe(true);
  });

  it("aplica o modo de inclusão e exclusão por nome exato", () => {
    expect(matchesClientFilter("ALFA", ["ALFA"], "INCLUIR")).toBe(true);
    expect(matchesClientFilter("BETA OBRAS", ["ALFA"], "INCLUIR")).toBe(false);
    expect(matchesClientFilter("BETA OBRAS", ["BETA OBRAS"], "EXCLUIR")).toBe(false);
  });
});
