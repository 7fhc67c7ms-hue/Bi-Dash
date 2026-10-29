import type { ProductionData } from "../drizzle/schema";
import { matchesClientFilter, type ClientFilterMode } from "@shared/clientFilters";

export type ProductionFilters = {
  cliente?: string;
  clientes?: readonly string[];
  selectedClients?: readonly string[];
  modoClientes?: ClientFilterMode;
  clientFilterMode?: ClientFilterMode;
  tipoPlaca?: string;
  tiposPlaca?: readonly string[];
  years?: readonly number[];
  categoria?: "TODOS" | "OBRAS" | "COMUNS";
};

export function filterProductionData(
  data: ProductionData[],
  input: ProductionFilters
) {
  const selectedClients = input.clientes ?? input.selectedClients ?? [];
  const clientFilterMode =
    input.modoClientes ?? input.clientFilterMode ?? "INCLUIR";
  const selectedTypes = input.tiposPlaca ?? [];
  const selectedYears = input.years ?? [];
  return data.filter(item => {
    const clientMatches = input.cliente
      ? item.cliente === input.cliente
      : matchesClientFilter(item.cliente, selectedClients, clientFilterMode);
    const plateMatches = input.tipoPlaca
      ? item.tipoPlaca === input.tipoPlaca
      : selectedTypes.length === 0 || selectedTypes.includes(item.tipoPlaca);
    const yearMatches =
      selectedYears.length === 0 || selectedYears.includes(item.ano);
    const isObras = item.cliente.toLocaleUpperCase("pt-BR").includes("OBRAS");
    const categoryMatches =
      !input.categoria ||
      input.categoria === "TODOS" ||
      (input.categoria === "OBRAS" ? isObras : !isObras);
    return clientMatches && plateMatches && yearMatches && categoryMatches;
  });
}

export function isOwnedByUser(
  record: Pick<ProductionData, "userId">,
  userId: number
) {
  return record.userId === userId;
}
