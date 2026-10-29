export type ClientFilterMode = "INCLUIR" | "EXCLUIR";

export function isObrasClient(client: string): boolean {
  return client.toLocaleUpperCase("pt-BR").includes("OBRAS");
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
