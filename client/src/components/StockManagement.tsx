import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  PackageCheck,
  PackageX,
  Pencil,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { StockMovement, StockMovementKind } from "@shared/types";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const number = (value: number) =>
  value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

const movementLabel: Record<StockMovementKind, string> = {
  entrada: "Entrada",
  saida: "Saída",
  descarte: "Descarte",
  devolucao: "Devolução",
};

const movementTone: Record<StockMovementKind, string> = {
  entrada: "text-emerald-600",
  saida: "text-rose-600",
  descarte: "text-orange-600",
  devolucao: "text-sky-600",
};

const movementIcon = (movement: StockMovementKind) => {
  if (movement === "entrada")
    return <ArrowDownToLine className="mr-2 h-4 w-4" />;
  if (movement === "saida") return <ArrowUpFromLine className="mr-2 h-4 w-4" />;
  if (movement === "descarte") return <PackageX className="mr-2 h-4 w-4" />;
  return <RotateCcw className="mr-2 h-4 w-4" />;
};

const isPositiveMovement = (movement: StockMovementKind) =>
  movement === "entrada" || movement === "devolucao";

export default function StockManagement({
  tiposPlaca,
}: {
  tiposPlaca: string[];
}) {
  const [coberturaMeses, setCoberturaMeses] = useState(1);
  const [tipoPlaca, setTipoPlaca] = useState(tiposPlaca[0] ?? "");
  const [movimento, setMovimento] = useState<StockMovementKind>("entrada");
  const [quantidade, setQuantidade] = useState("");
  const [observacao, setObservacao] = useState("");
  const [editingMovementId, setEditingMovementId] = useState<number | null>(null);
  const [editingVersion, setEditingVersion] = useState<number | null>(null);
  const [editingOccurredEm, setEditingOccurredEm] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(
    () => typeof navigator === "undefined" || navigator.onLine
  );

  useEffect(() => {
    if (!tipoPlaca && tiposPlaca[0]) setTipoPlaca(tiposPlaca[0]);
  }, [tipoPlaca, tiposPlaca]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const analysisQuery = trpc.production.getStockAnalysis.useQuery({
    coberturaMeses,
  });
  const movementsQuery = trpc.production.listStockMovements.useQuery();
  const auditQuery = trpc.production.listStockAudit.useQuery();
  const utils = trpc.useUtils();

  const resetForm = () => {
    setQuantidade("");
    setObservacao("");
    setEditingMovementId(null);
    setEditingVersion(null);
    setEditingOccurredEm(null);
  };

  const invalidateStock = async () => {
    await Promise.all([
      utils.production.getStockAnalysis.invalidate(),
      utils.production.listStockMovements.invalidate(),
      utils.production.listStockAudit.invalidate(),
    ]);
  };

  const createMovement = trpc.production.createStockMovement.useMutation({
    onSuccess: async () => {
      resetForm();
      await invalidateStock();
      toast.success("Movimento de estoque registrado.");
    },
    onError: error => toast.error(error.message),
  });
  const updateMovement = trpc.production.updateStockMovement.useMutation({
    onSuccess: async () => {
      resetForm();
      await invalidateStock();
      toast.success("Movimento de estoque atualizado.");
    },
    onError: async error => {
      if (error.data?.code === "CONFLICT") await invalidateStock();
      toast.error(error.message);
    },
  });
  const deleteMovement = trpc.production.deleteStockMovement.useMutation({
    onSuccess: async () => {
      await invalidateStock();
      toast.success("Movimento removido.");
    },
    onError: async error => {
      if (error.data?.code === "CONFLICT") await invalidateStock();
      toast.error(error.message);
    },
  });

  const items = analysisQuery.data?.itens ?? [];
  const totals = useMemo(
    () => ({
      repor: items.filter(item => item.status === "REPOR").length,
      recomendado: items.reduce(
        (sum, item) => sum + item.estoqueRecomendado,
        0
      ),
    }),
    [items]
  );

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = Number(quantidade);
    if (!tipoPlaca || !Number.isInteger(parsed) || parsed <= 0) {
      toast.error("Informe o tipo de placa e uma quantidade inteira positiva.");
      return;
    }
    const data = {
      tipoPlaca,
      movimento,
      quantidade: parsed,
      observacao: observacao || null,
      ...(editingMovementId !== null && editingOccurredEm
        ? { ocorridoEm: editingOccurredEm }
        : {}),
    };
    if (editingMovementId !== null && editingVersion !== null) {
      updateMovement.mutate({ id: editingMovementId, version: editingVersion, data });
    } else {
      createMovement.mutate(data);
    }
  };

  const beginEdit = (item: StockMovement) => {
    setEditingMovementId(item.id);
    setEditingVersion(item.version);
    setEditingOccurredEm(new Date(item.ocorridoEm).toISOString());
    setTipoPlaca(item.tipoPlaca);
    setMovimento(item.movimento);
    setQuantidade(String(item.quantidade));
    setObservacao(item.observacao ?? "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const removeMovement = (item: StockMovement) => {
    if (!window.confirm("Remover este movimento? A ação ficará registrada na auditoria.")) return;
    deleteMovement.mutate({ id: item.id, version: item.version });
  };

  return (
    <section
      className="space-y-5"
      aria-label="Controle de estoque"
      data-print-block
    >
      {(!isOnline || analysisQuery.isError || movementsQuery.isError || auditQuery.isError) && (
        <div
          role="alert"
          className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-800"
        >
          {!isOnline
            ? "Sem conexão. Nenhuma alteração será considerada salva até o backend confirmar."
            : "Não foi possível sincronizar o estoque agora. Confira a conexão e recarregue antes de repetir uma operação."}
        </div>
      )}
      <div data-print-block>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Módulo separado
        </p>
        <h2 className="mt-1 text-2xl font-semibold">Controle de estoque</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Controle entradas, saídas, descartes e devoluções sem alterar a
          produção importada. A entrada aumenta o saldo; saídas, descartes e
          devoluções reduzem o saldo disponível.
        </p>
      </div>

      <div
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
        data-print-block
      >
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-muted-foreground">
              Itens para repor
            </p>
            <p className="mt-2 text-2xl font-semibold text-amber-600">
              {totals.repor}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-muted-foreground">
              Estoque recomendado
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {number(totals.recomendado)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-muted-foreground">
              Saldo atual
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {number(analysisQuery.data?.saldoTotal ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-muted-foreground">
              Devoluções
            </p>
            <p className="mt-2 text-2xl font-semibold text-sky-600">
              {number(analysisQuery.data?.totalDevolucoes ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-muted-foreground">Descartes</p>
            <p className="mt-2 text-2xl font-semibold text-orange-600">
              {number(analysisQuery.data?.totalDescartes ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card data-print-block>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5 text-primary" />
            Parâmetro da recomendação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <label className="block max-w-xs text-xs font-medium text-muted-foreground">
            Cobertura desejada
            <select data-print-ui
              value={coberturaMeses}
              onChange={event => setCoberturaMeses(Number(event.target.value))}
              className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value={1}>1 mês de cobertura</option>
              <option value={2}>2 meses de cobertura</option>
              <option value={3}>3 meses de cobertura</option>
              <option value={6}>6 meses de cobertura</option>
            </select>
          </label>
          <p className="mt-2 text-xs text-muted-foreground">
            Recomendado = teto(média mensal dos romaneios × cobertura). Entradas
            e saídas não são misturadas com a produção.
          </p>
        </CardContent>
      </Card>

      <Card data-print-block>
        <CardHeader>
          <CardTitle>{editingMovementId !== null ? "Editar movimento" : "Registrar movimento"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form data-print-ui onSubmit={submit} className="grid gap-3 md:grid-cols-4">
            <label className="text-xs text-muted-foreground">
              Tipo
              <select
                value={tipoPlaca}
                onChange={event => setTipoPlaca(event.target.value)}
                className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Selecione</option>
                {tiposPlaca.map(tipo => (
                  <option key={tipo}>{tipo}</option>
                ))}
                {!tiposPlaca.includes(tipoPlaca) && tipoPlaca && (
                  <option>{tipoPlaca}</option>
                )}
              </select>
            </label>
            <label className="text-xs text-muted-foreground">
              Movimento
              <select
                value={movimento}
                onChange={event =>
                  setMovimento(event.target.value as StockMovementKind)
                }
                className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                {(Object.keys(movementLabel) as StockMovementKind[]).map(
                  value => (
                    <option key={value} value={value}>
                      {movementLabel[value]}
                    </option>
                  )
                )}
              </select>
            </label>
            <label className="text-xs text-muted-foreground">
              Quantidade
              <input
                type="number"
                min="1"
                step="1"
                value={quantidade}
                onChange={event => setQuantidade(event.target.value)}
                className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Observação
              <input
                value={observacao}
                onChange={event => setObservacao(event.target.value)}
                maxLength={1000}
                className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
                placeholder="Fornecedor, ajuste, inventário..."
              />
            </label>
            <Button
              type="submit"
              disabled={createMovement.isPending || updateMovement.isPending}
              className="md:col-span-4 md:w-fit"
            >
              {movementIcon(movimento)}{editingMovementId !== null ? "Salvar alterações" : "Registrar"}{" "}
              {movementLabel[movimento].toLowerCase()}
            </Button>
            {editingMovementId !== null && (
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                className="md:col-span-4 md:w-fit"
              >
                <X className="mr-2 h-4 w-4" />
                Cancelar edição
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <Card data-print-block>
        <CardHeader>
          <CardTitle>Recomendação por tipo de placa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1220px] text-sm">
              <thead className="bg-muted/60">
                <tr>
                  {[
                    "Tipo",
                    "Produção histórica",
                    "Meses",
                    "Média/mês",
                    "Entradas",
                    "Devoluções",
                    "Saídas",
                    "Descartes",
                    "Saldo",
                    "Recomendado",
                    "Reposição",
                    "Status",
                  ].map(label => (
                    <th
                      key={label}
                      className="px-3 py-3 text-left text-xs uppercase text-muted-foreground"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.tipoPlaca} className="border-t">
                    <td className="px-3 py-3 font-medium">{item.tipoPlaca}</td>
                    <td className="px-3 py-3">{number(item.producaoTotal)}</td>
                    <td className="px-3 py-3">{item.mesesComProducao}</td>
                    <td className="px-3 py-3">
                      {number(item.consumoMedioMensal)}
                    </td>
                    <td className="px-3 py-3 text-emerald-600">
                      {number(item.entradas)}
                    </td>
                    <td className="px-3 py-3 text-sky-600">
                      {number(item.devolucoes)}
                    </td>
                    <td className="px-3 py-3 text-rose-600">
                      {number(item.saidas)}
                    </td>
                    <td className="px-3 py-3 text-orange-600">
                      {number(item.descartes)}
                    </td>
                    <td className="px-3 py-3">{number(item.estoqueAtual)}</td>
                    <td className="px-3 py-3 font-semibold">
                      {number(item.estoqueRecomendado)}
                    </td>
                    <td className="px-3 py-3 font-semibold text-amber-600">
                      {number(item.necessidadeReposicao)}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${item.status === "OK" ? "bg-emerald-500/15 text-emerald-700" : "bg-amber-500/15 text-amber-700"}`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card data-print-block>
        <CardHeader>
          <CardTitle>Histórico de movimentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {movementsQuery.data?.length ? (
              movementsQuery.data.map(item => {
                const kind = item.movimento as StockMovementKind;
                const positive = isPositiveMovement(kind);
                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-2 rounded-lg border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium">
                        {item.tipoPlaca} ·{" "}
                        <span className={movementTone[kind]}>
                          {positive ? "+" : "−"}
                          {number(item.quantidade)} · {movementLabel[kind]}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.ocorridoEm).toLocaleString("pt-BR")}
                        {item.observacao ? ` · ${item.observacao}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button data-print-ui
                        variant="ghost"
                        size="sm"
                        onClick={() => beginEdit(item)}
                        aria-label="Editar movimento"
                      >
                        <Pencil className="h-4 w-4 text-primary" />
                      </Button>
                      <Button data-print-ui
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMovement(item)}
                        aria-label="Remover movimento"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum movimento de estoque registrado.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card data-print-block>
        <CardHeader>
          <CardTitle>Rastro de alterações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {auditQuery.data?.length ? (
              auditQuery.data.slice(0, 20).map(item => (
                <div key={item.id} className="rounded-lg border p-3 text-sm">
                  <p className="font-medium">
                    {item.acao === "create" ? "Criado" : item.acao === "update" ? "Atualizado" : "Removido"}
                    {" · "}{item.tipoPlaca} · {movementLabel[item.movimento as StockMovementKind]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.registradoEm).toLocaleString("pt-BR")} · quantidade {number(item.quantidade)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma alteração auditada ainda.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
