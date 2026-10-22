import { invokeLLM } from "./_core/llm";
import { z } from "zod";

export const ProductionDataSchema = z.object({ romaneio: z.string().optional(), cliente: z.string(), tipoPlaca: z.string(), quantidade: z.number().int(), mes: z.string(), ano: z.number().int().min(2000).max(2100).optional() });
export type ExtractedProductionData = z.infer<typeof ProductionDataSchema>;
export interface ExtractionQuality { dados: ExtractedProductionData[]; linhasRejeitadas: number; duplicadosEvitados: number; }

const MESES_VALIDOS = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
const MONTH_ALIASES: Record<string, string> = { JANEIRO: "JANEIRO", FEVEREIRO: "FEVEREIRO", MARCO: "MARÇO", MAR: "MARÇO", MARÇO: "MARÇO", ABRIL: "ABRIL", MAIO: "MAIO", JUNHO: "JUNHO", JULHO: "JULHO", AGOSTO: "AGOSTO", SETEMBRO: "SETEMBRO", OUTUBRO: "OUTUBRO", NOVEMBRO: "NOVEMBRO", DEZEMBRO: "DEZEMBRO" };

function normalizeKey(key: string) { return key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase(); }
function readField(item: Record<string, unknown>, keys: string[]) { const wanted = keys.map(normalizeKey); return Object.entries(item).find(([key]) => wanted.includes(normalizeKey(key)))?.[1]; }
function normalizeMonth(value: unknown) { const raw = String(value ?? "").trim().toUpperCase(); const bare = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); return MONTH_ALIASES[raw] ?? MONTH_ALIASES[bare] ?? ""; }
function normalizeQuantity(value: unknown) { if (typeof value === "number") return Math.trunc(value); const parsed = Number(String(value ?? "").trim().replace(/\./g, "").replace(",", ".").replace(/[^0-9.-]/g, "")); return Number.isFinite(parsed) ? Math.trunc(parsed) : 0; }

export function normalizarRegistrosExtraidos(parsed: unknown): ExtractionQuality {
  const rawRows = Array.isArray(parsed) ? parsed : (parsed && typeof parsed === "object" && Array.isArray((parsed as { rows?: unknown }).rows) ? (parsed as { rows: unknown[] }).rows : null);
  if (!rawRows) throw new Error("Resposta do LLM não é um array de registros");
  const dados: ExtractedProductionData[] = []; const romaneios = new Set<string>(); let linhasRejeitadas = 0; let duplicadosEvitados = 0;
  for (const rawItem of rawRows) {
    if (!rawItem || typeof rawItem !== "object") { linhasRejeitadas++; continue; }
    const item = rawItem as Record<string, unknown>;
    const mes = normalizeMonth(readField(item, ["mes", "mês", "periodo", "competencia"]));
    const cliente = String(readField(item, ["cliente", "nome", "razao social"]) ?? "").trim();
    const tipoPlaca = String(readField(item, ["tipoPlaca", "tipo de placa", "produto", "modelo"]) ?? "").trim();
    const quantidade = normalizeQuantity(readField(item, ["quantidade", "qtd", "qtde", "volume"]));
    const rawAno = normalizeQuantity(readField(item, ["ano", "year"]));
    const ano = rawAno >= 2000 && rawAno <= 2100 ? rawAno : undefined;
    const romaneio = String(readField(item, ["romaneio", "pedido", "ordem"]) ?? "").trim() || undefined;
    if (!MESES_VALIDOS.includes(mes) || !cliente || !tipoPlaca || quantidade <= 0) { linhasRejeitadas++; continue; }
    // Um romaneio pode conter várias linhas (cliente/modelo). A chave inclui
    // os campos da linha para remover apenas duplicatas reais, sem perder o
    // mix de placas do mesmo pedido.
    const linhaKey = romaneio
      ? [romaneio, cliente, tipoPlaca, mes, ano ?? ""].join("|").toUpperCase()
      : "";
    if (linhaKey && romaneios.has(linhaKey)) { duplicadosEvitados++; continue; }
    if (linhaKey) romaneios.add(linhaKey);
    dados.push(ProductionDataSchema.parse({ romaneio, cliente, tipoPlaca, quantidade, mes, ano }));
  }
  return { dados, linhasRejeitadas, duplicadosEvitados };
}

async function extrairComQualidade(pdfUrl: string): Promise<ExtractionQuality> {
  const systemPrompt = `Você é um assistente especializado em extração de tabelas de produção de fotoporcelanas. Extraia TODOS os registros de todas as páginas. O layout pode usar ROMANEIO, OBS, CLIENTE, TIPO DE PLACA, QTD, MÊS e ANO; ignore OBS. Aceite aliases CLIENTE/NOME, TIPO DE PLACA/PRODUTO/MODELO, QTD/QUANTIDADE, MÊS/MES/PERÍODO e ANO/YEAR. Preserve nomes e modelos, converta números brasileiros para inteiros e meses para maiúsculas em português. Extraia ano do cabeçalho ou documento quando estiver claro; caso contrário retorne null. Se o mês estiver no título, aplique-o às linhas. Não invente dados. Retorne um objeto JSON no formato {"rows":[...]} e nenhum texto adicional.`;
  const response = await invokeLLM({ messages: [{ role: "system", content: systemPrompt }, { role: "user", content: [{ type: "text", text: "Analise o PDF e extraia todos os registros de produção." }, { type: "file_url", file_url: { url: pdfUrl, mime_type: "application/pdf" } }] }], response_format: { type: "json_schema", json_schema: { name: "production_rows", strict: true, schema: { type: "object", properties: { rows: { type: "array", items: { type: "object", properties: { romaneio: { type: ["string", "null"] }, cliente: { type: "string" }, tipoPlaca: { type: "string" }, quantidade: { type: "integer" }, mes: { type: "string" }, ano: { type: ["integer", "null"] } }, required: ["romaneio", "cliente", "tipoPlaca", "quantidade", "mes", "ano"], additionalProperties: false } } }, required: ["rows"], additionalProperties: false } } } });
  const content = response.choices[0]?.message.content;
  if (!content || typeof content !== "string") throw new Error("Resposta vazia do LLM");
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  let parsed: unknown; try { parsed = JSON.parse(jsonMatch?.[1] ?? content); } catch { throw new Error("O LLM devolveu JSON inválido"); }
  return normalizarRegistrosExtraidos(parsed);
}

export async function extrairDadosDoPDFComQualidade(pdfUrl: string) { try { const result = await extrairComQualidade(pdfUrl); if (result.dados.length === 0) throw new Error("Nenhum registro válido foi extraído do PDF"); return result; } catch (error) { console.error("Erro ao extrair dados do PDF:", error); throw new Error(`Falha na extração de dados do PDF: ${error instanceof Error ? error.message : "Erro desconhecido"}`); } }
export async function extrairDadosDoPDF(pdfUrl: string): Promise<ExtractedProductionData[]> { return (await extrairDadosDoPDFComQualidade(pdfUrl)).dados; }
export function validarMes(mes: string): boolean { const raw = mes.trim().toUpperCase(); const bare = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); return Boolean(MONTH_ALIASES[raw] ?? MONTH_ALIASES[bare]); }
export function obterMesesValidos(): string[] { return MESES_VALIDOS; }
