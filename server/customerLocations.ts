import type { CustomerLocation } from "../drizzle/schema";

export const BRAZIL_STATES = [
  ["AC", "Acre"], ["AL", "Alagoas"], ["AP", "Amapá"], ["AM", "Amazonas"], ["BA", "Bahia"], ["CE", "Ceará"],
  ["DF", "Distrito Federal"], ["ES", "Espírito Santo"], ["GO", "Goiás"], ["MA", "Maranhão"], ["MT", "Mato Grosso"], ["MS", "Mato Grosso do Sul"],
  ["MG", "Minas Gerais"], ["PA", "Pará"], ["PB", "Paraíba"], ["PR", "Paraná"], ["PE", "Pernambuco"], ["PI", "Piauí"],
  ["RJ", "Rio de Janeiro"], ["RN", "Rio Grande do Norte"], ["RS", "Rio Grande do Sul"], ["RO", "Rondônia"], ["RR", "Roraima"],
  ["SC", "Santa Catarina"], ["SP", "São Paulo"], ["SE", "Sergipe"], ["TO", "Tocantins"],
] as const;

const stateNames = new Map<string, string>(BRAZIL_STATES);
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
const onlyDigits = (value: string) => value.replace(/\D/g, "");

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(7000), headers: { Accept: "application/json" } });
    if (!response.ok) return null;
    return await response.json() as T;
  } catch {
    return null;
  }
}

export type LocationLookupResult = {
  cep: string | null;
  cidade: string;
  uf: string;
  estado: string;
  codigoIbge: string | null;
  fonteLocalizacao: "cep" | "cidade_uf";
};

type ViaCepResponse = { erro?: boolean; cep?: string; localidade?: string; uf?: string; estado?: string; ibge?: string };
type BrasilApiResponse = { cep?: string; city?: string; state?: string; ibge?: { city?: string } };
type IbgeCity = { id?: number; nome?: string; microrregiao?: { mesorregiao?: { UF?: { sigla?: string; nome?: string } } } };

export async function lookupCustomerLocation(input: { cep?: string; cidade?: string; uf?: string }): Promise<LocationLookupResult> {
  const cep = input.cep ? onlyDigits(input.cep) : "";
  if (cep.length === 8) {
    const viaCep = await fetchJson<ViaCepResponse>(`https://viacep.com.br/ws/${cep}/json/`);
    if (viaCep && !viaCep.erro && viaCep.localidade && viaCep.uf) {
      return {
        cep: viaCep.cep ?? cep,
        cidade: viaCep.localidade,
        uf: viaCep.uf.toUpperCase(),
        estado: viaCep.estado ?? stateNames.get(viaCep.uf.toUpperCase()) ?? viaCep.uf.toUpperCase(),
        codigoIbge: viaCep.ibge ?? null,
        fonteLocalizacao: "cep",
      };
    }
    const brasilApi = await fetchJson<BrasilApiResponse>(`https://brasilapi.com.br/api/cep/v2/${cep}`);
    if (brasilApi?.city && brasilApi.state) {
      const uf = brasilApi.state.toUpperCase();
      return {
        cep: brasilApi.cep ?? cep,
        cidade: brasilApi.city,
        uf,
        estado: stateNames.get(uf) ?? uf,
        codigoIbge: brasilApi.ibge?.city ?? null,
        fonteLocalizacao: "cep",
      };
    }
  }

  const uf = (input.uf ?? "").trim().toUpperCase();
  const cidade = (input.cidade ?? "").trim();
  if (!stateNames.has(uf) || cidade.length < 2) {
    throw new Error("CEP não localizado. Informe uma cidade e uma UF válidas para o fallback.");
  }
  const cities = await fetchJson<IbgeCity[]>(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
  const match = cities?.find(item => normalize(item.nome ?? "") === normalize(cidade));
  if (!match?.nome) {
    throw new Error("Não encontrei essa cidade dentro da UF informada. Confira a cidade e o estado.");
  }
  return {
    cep: cep.length === 8 ? cep : null,
    cidade: match.nome,
    uf,
    estado: stateNames.get(uf) ?? uf,
    codigoIbge: match.id ? String(match.id) : null,
    fonteLocalizacao: "cidade_uf",
  };
}

export function summarizeCustomerLocations(locations: CustomerLocation[]) {
  const byState = new Map<string, { uf: string; estado: string; total: number }>();
  const byCity = new Map<string, { cidade: string; uf: string; estado: string; total: number }>();
  for (const location of locations) {
    const state = byState.get(location.uf) ?? { uf: location.uf, estado: location.estado, total: 0 };
    state.total += 1;
    byState.set(location.uf, state);
    const cityKey = `${location.uf}:${normalize(location.cidade)}`;
    const city = byCity.get(cityKey) ?? { cidade: location.cidade, uf: location.uf, estado: location.estado, total: 0 };
    city.total += 1;
    byCity.set(cityKey, city);
  }
  return {
    totalClientes: locations.length,
    estadosAtendidos: byState.size,
    porEstado: Array.from(byState.values()).sort((a, b) => b.total - a.total || a.estado.localeCompare(b.estado)),
    porCidade: Array.from(byCity.values()).sort((a, b) => b.total - a.total || a.cidade.localeCompare(b.cidade)),
  };
}
