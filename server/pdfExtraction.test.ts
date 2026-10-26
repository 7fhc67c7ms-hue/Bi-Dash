import { describe, it, expect, vi } from "vitest";
import { normalizarRegistrosExtraidos, validarMes, obterMesesValidos, extrairDadosDoPDFComQualidade } from "./pdfExtraction";
import { invokeLLM } from "./_core/llm";

vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn() }));
const mockedInvokeLLM = vi.mocked(invokeLLM);

describe("PDF Extraction Functions", () => {
  describe("validarMes", () => {
    it("deve validar meses válidos em maiúsculas", () => {
      expect(validarMes("JANEIRO")).toBe(true);
      expect(validarMes("FEVEREIRO")).toBe(true);
      expect(validarMes("MARÇO")).toBe(true);
      expect(validarMes("DEZEMBRO")).toBe(true);
    });

    it("deve validar meses válidos em minúsculas", () => {
      expect(validarMes("janeiro")).toBe(true);
      expect(validarMes("fevereiro")).toBe(true);
      expect(validarMes("março")).toBe(true);
      expect(validarMes("MARCO")).toBe(true);
      expect(validarMes("  abril  ")).toBe(true);
    });

    it("deve rejeitar meses inválidos", () => {
      expect(validarMes("JANEIRO2")).toBe(false);
      expect(validarMes("JAN")).toBe(false);
      expect(validarMes("INVALIDO")).toBe(false);
      expect(validarMes("")).toBe(false);
    });
  });

  describe("normalizarRegistrosExtraidos", () => {
    it("deve aceitar cabeçalhos alternativos e quantidade brasileira", () => {
      const result = normalizarRegistrosExtraidos([{ PEDIDO: "A-1", NOME: "CLIENTE X", PRODUTO: "OVAL 6X8", QTD: "1.250,00", MES: "marco", ANO: 2026 }]);
      expect(result.dados[0]).toMatchObject({ romaneio: "A-1", cliente: "CLIENTE X", tipoPlaca: "OVAL 6X8", quantidade: 1250, mes: "MARÇO", ano: 2026 });
      expect(result.linhasRejeitadas).toBe(0);
      const wrapped = normalizarRegistrosExtraidos({ rows: [{ cliente: "CLIENTE Y", modelo: "RET", quantidade: 1, mes: "maio" }] });
      expect(wrapped.dados[0].cliente).toBe("CLIENTE Y");
    });

    it("deve rejeitar linhas inválidas e deduplicar romaneios", () => {
      const result = normalizarRegistrosExtraidos([{ romaneio: "1", cliente: "A", tipoPlaca: "B", quantidade: 2, mes: "abril" }, { romaneio: "1", cliente: "A", tipoPlaca: "B", quantidade: 3, mes: "abril" }, { cliente: "", tipoPlaca: "B", quantidade: 1, mes: "abril" }]);
      expect(result.dados).toHaveLength(1);
      expect(result.duplicadosEvitados).toBe(1);
      expect(result.linhasRejeitadas).toBe(1);
    });

    it("deve manter tipos diferentes no mesmo romaneio", () => {
      const result = normalizarRegistrosExtraidos([
        { romaneio: "1", cliente: "A", tipoPlaca: "RET 8X20", quantidade: 2, mes: "abril" },
        { romaneio: "1", cliente: "A", tipoPlaca: "OVAL 8X10", quantidade: 3, mes: "abril" },
      ]);
      expect(result.dados).toHaveLength(2);
      expect(result.duplicadosEvitados).toBe(0);
    });

    it("deve preservar CEP, endereço, cidade e UF encontrados no PDF", () => {
      const result = normalizarRegistrosExtraidos([{ cliente: "CLIENTE GEO", tipoPlaca: "RET", quantidade: 1, mes: "abril", cep: "01001-000", endereco: "Praça da Sé, 1", cidade: "São Paulo", uf: "sp" }]);
      expect(result.dados[0]).toMatchObject({ cep: "01001-000", endereco: "Praça da Sé, 1", cidade: "São Paulo", uf: "SP" });
    });

    it("deve falhar quando a resposta não é um array", () => {
      expect(() => normalizarRegistrosExtraidos({ cliente: "A" })).toThrow("não é um array");
    });
  });

  describe("extrairDadosDoPDFComQualidade", () => {
    it("deve rejeitar resposta vazia da IA", async () => {
      mockedInvokeLLM.mockResolvedValueOnce({ choices: [{ message: { content: null } }] } as any);
      await expect(extrairDadosDoPDFComQualidade("https://example.com/file.pdf")).rejects.toThrow("Resposta vazia");
    });

    it("deve rejeitar JSON malformado da IA", async () => {
      mockedInvokeLLM.mockResolvedValueOnce({ choices: [{ message: { content: "{json incompleto" } }] } as any);
      await expect(extrairDadosDoPDFComQualidade("https://example.com/file.pdf")).rejects.toThrow("JSON inválido");
    });
  });

  describe("obterMesesValidos", () => {
    it("deve retornar lista de meses válidos", () => {
      const meses = obterMesesValidos();

      expect(meses.length).toBe(12);
      expect(meses).toContain("JANEIRO");
      expect(meses).toContain("DEZEMBRO");
      expect(meses[0]).toBe("JANEIRO");
      expect(meses[11]).toBe("DEZEMBRO");
    });
  });
});
