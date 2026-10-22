import { useMemo } from "react";
import { isObrasClient, type ClientFilterMode } from "@shared/clientFilters";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsersRound } from "lucide-react";

interface ClientFilterSelectorProps {
  clients: string[];
  selectedClients: string[];
  mode: ClientFilterMode;
  onSelectedClientsChange: (clients: string[]) => void;
  onModeChange: (mode: ClientFilterMode) => void;
}

type Shortcut = "TODOS" | "OBRAS" | "SEM_OBRAS" | "PERSONALIZADA";

function sameClients(left: readonly string[], right: readonly string[]) {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((client) => rightSet.has(client));
}

export default function ClientFilterSelector({
  clients,
  selectedClients,
  mode,
  onSelectedClientsChange,
  onModeChange,
}: ClientFilterSelectorProps) {
  const obrasClients = useMemo(() => clients.filter(isObrasClient), [clients]);
  const shortcut: Shortcut =
    selectedClients.length === 0
      ? "TODOS"
      : mode === "INCLUIR" && sameClients(selectedClients, obrasClients)
        ? "OBRAS"
        : mode === "EXCLUIR" && sameClients(selectedClients, obrasClients)
          ? "SEM_OBRAS"
          : "PERSONALIZADA";

  const applyShortcut = (next: Exclude<Shortcut, "PERSONALIZADA">) => {
    if (next === "TODOS") {
      onModeChange("INCLUIR");
      onSelectedClientsChange([]);
      return;
    }
    onSelectedClientsChange(obrasClients);
    onModeChange(next === "OBRAS" ? "INCLUIR" : "EXCLUIR");
  };

  const toggleClient = (client: string) => {
    onSelectedClientsChange(
      selectedClients.includes(client)
        ? selectedClients.filter((item) => item !== client)
        : [...selectedClients, client],
    );
  };

  return (
    <Card className="border-primary/20 bg-card/80 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-foreground">
          <UsersRound className="h-4 w-4 text-primary" />
          Filtro global de clientes
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          O filtro é aplicado aos KPIs, gráficos, rankings, tabelas, abas e exportações.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2" aria-label="Atalhos de clientes">
          <Button
            type="button"
            size="sm"
            variant={shortcut === "TODOS" ? "default" : "outline"}
            onClick={() => applyShortcut("TODOS")}
          >
            Todos
          </Button>
          <Button
            type="button"
            size="sm"
            variant={shortcut === "OBRAS" ? "default" : "outline"}
            onClick={() => applyShortcut("OBRAS")}
            disabled={obrasClients.length === 0}
          >
            Somente obras
          </Button>
          <Button
            type="button"
            size="sm"
            variant={shortcut === "SEM_OBRAS" ? "default" : "outline"}
            onClick={() => applyShortcut("SEM_OBRAS")}
            disabled={obrasClients.length === 0}
          >
            Sem obras
          </Button>
          <Button
            type="button"
            size="sm"
            variant={shortcut === "PERSONALIZADA" ? "default" : "outline"}
            onClick={() => document.getElementById("client-filter-options")?.focus()}
            aria-pressed={shortcut === "PERSONALIZADA"}
            aria-controls="client-filter-options"
          >
            Seleção personalizada
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-[180px_1fr] md:items-start">
          <label className="space-y-1 text-xs font-medium text-muted-foreground">
            Modo do filtro
            <select
              value={mode}
              onChange={(event) => onModeChange(event.target.value as ClientFilterMode)}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="INCLUIR">Incluir selecionados</option>
              <option value="EXCLUIR">Excluir selecionados</option>
            </select>
          </label>
          <fieldset>
            <legend className="text-xs font-medium text-muted-foreground">
              Clientes selecionados ({selectedClients.length})
            </legend>
            <div id="client-filter-options" tabIndex={-1} className="mt-1 grid max-h-36 gap-2 overflow-y-auto rounded-md border border-input bg-background/50 p-3 outline-none focus:ring-2 focus:ring-ring sm:grid-cols-2 lg:grid-cols-3">
              {clients.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum cliente disponível.</p>
              ) : (
                clients.map((client) => (
                  <label key={client} className="flex min-w-0 cursor-pointer items-center gap-2 text-xs text-foreground">
                    <Checkbox
                      checked={selectedClients.includes(client)}
                      onCheckedChange={() => toggleClient(client)}
                    />
                    <span className="truncate" title={client}>{client}</span>
                  </label>
                ))
              )}
            </div>
          </fieldset>
        </div>
        <p className="text-xs text-muted-foreground">
          {shortcut === "TODOS"
            ? "Todos os clientes estão incluídos."
            : shortcut === "OBRAS"
              ? "Apenas clientes cujo nome contém OBRAS estão incluídos."
              : shortcut === "SEM_OBRAS"
                ? "Todos os clientes estão incluídos, exceto os cujo nome contém OBRAS."
                : `${mode === "INCLUIR" ? "Incluindo" : "Excluindo"} ${selectedClients.length} cliente(s) selecionado(s).`}
        </p>
      </CardContent>
    </Card>
  );
}

export type { ClientFilterSelectorProps };
