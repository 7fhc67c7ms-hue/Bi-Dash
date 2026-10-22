import type { ClientFilterMode } from "@shared/clientFilters";
import { isObrasClient } from "@shared/clientFilters";

interface ClientFilterLabelInput {
  mode: ClientFilterMode;
  clients: readonly string[];
}

function summarizeClients(clients: readonly string[]): string {
  const visible = clients.slice(0, 8).join(", ");
  const remaining = clients.length - Math.min(clients.length, 8);
  return remaining > 0 ? `${visible} +${remaining} cliente(s)` : visible;
}

export function describeClientFilter({ mode, clients }: ClientFilterLabelInput): string {
  if (clients.length === 0) return "Clientes: todos";

  const allAreObras = clients.every(isObrasClient);
  if (mode === "INCLUIR" && allAreObras) {
    return `Clientes: somente obras (${clients.length})`;
  }
  if (mode === "EXCLUIR" && allAreObras) {
    return `Clientes: sem obras (excluídas ${clients.length})`;
  }

  return `Clientes ${mode === "INCLUIR" ? "incluídos" : "excluídos"}: ${summarizeClients(clients)}`;
}
