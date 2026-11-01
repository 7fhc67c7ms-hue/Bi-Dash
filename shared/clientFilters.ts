export type ClientFilterMode = "INCLUIR" | "EXCLUIR";

export const ANJO_DA_GUARDA_CANONICAL = "ANJO DA GUARDA";
const ANJO_DA_GUARDA_MARKERS = ["CEPAG", "AFAGU", "ALAMEDA", "PAZ ETERNA"];

export function isObrasClient(client: string): boolean {
  return client.toLocaleUpperCase("pt-BR").includes("OBRAS");
}

export function isAnjoDaGuardaClient(client: string): boolean {
  const normalized = client.toLocaleUpperCase("pt-BR");
  return ANJO_DA_GUARDA_MARKERS.some(marker => normalized.includes(marker));
}

export function canonicalizeClient(client: string, anjoDaGuarda = false): string {
  return anjoDaGuarda && isAnjoDaGuardaClient(client)
    ? ANJO_DA_GUARDA_CANONICAL
    : client;
}

export function matchesClientFilter(
  client: string,
  selectedClients: readonly string[] = [],
  mode: ClientFilterMode = "INCLUIR",
): boolean {
  if (selectedClients.length === 0) return true;
  const selected = new Set(selectedClients);
  return mode === "EXCLUIR" ? !selected.has(client) : selected.has(client);
}
