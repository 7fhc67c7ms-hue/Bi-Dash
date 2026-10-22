import { useState } from "react";
import type { ProductionData } from "@shared/types";
import type { ClientFilterMode } from "@shared/clientFilters";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";

const MONTHS = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
type RecordDraft = { romaneio: string; cliente: string; tipoPlaca: string; quantidade: number; mes: string; ano: number };
const emptyDraft = (): RecordDraft => ({ romaneio: "", cliente: "", tipoPlaca: "", quantidade: 1, mes: "JANEIRO", ano: new Date().getFullYear() });

export default function ProductionRecords({ months, selectedClients, clientFilterMode, onChanged }: { months: string[]; selectedClients: string[]; clientFilterMode: ClientFilterMode; onChanged: () => void }) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<RecordDraft>(emptyDraft());
  const recordsQuery = trpc.production.getData.useQuery({ months: months.length ? months : undefined, selectedClients, clientFilterMode, categoria: "TODOS" });
  const createMutation = trpc.production.createRecord.useMutation();
  const updateMutation = trpc.production.updateRecord.useMutation();
  const deleteMutation = trpc.production.deleteRecord.useMutation();

  const setField = <K extends keyof RecordDraft>(field: K, value: RecordDraft[K]) => setDraft((current) => ({ ...current, [field]: value }));
  const startEdit = (record: ProductionData) => {
    setEditingId(record.id);
    setDraft({ romaneio: record.romaneio ?? "", cliente: record.cliente, tipoPlaca: record.tipoPlaca, quantidade: record.quantidade, mes: record.mes, ano: record.ano });
  };
  const save = async () => {
    if (!draft.cliente.trim() || !draft.tipoPlaca.trim() || draft.quantidade <= 0) { toast.error("Preencha cliente, modelo e quantidade."); return; }
    try {
      if (editingId) await updateMutation.mutateAsync({ id: editingId, data: { ...draft, romaneio: draft.romaneio || null } });
      else await createMutation.mutateAsync({ ...draft, romaneio: draft.romaneio || null });
      toast.success(editingId ? "Registro atualizado." : "Registro criado.");
      setEditingId(null); setShowCreate(false); setDraft(emptyDraft()); onChanged(); void recordsQuery.refetch();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível guardar o registro."); }
  };
  const remove = async (id: number) => {
    if (!window.confirm("Eliminar este registro? Esta ação não pode ser desfeita.")) return;
    try { await deleteMutation.mutateAsync({ id }); toast.success("Registro eliminado."); onChanged(); void recordsQuery.refetch(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível eliminar o registro."); }
  };

  return <Card className="border-border/70 bg-card/80 shadow-lg"><CardHeader className="flex flex-row items-center justify-between"><div><CardTitle className="text-foreground">Gestão de registros</CardTitle><p className="mt-1 text-sm text-muted-foreground">Corrija importações e adicione lançamentos manuais sem sair do painel.</p></div><Button onClick={() => { setShowCreate(true); setEditingId(null); setDraft(emptyDraft()); }}><Plus className="mr-2 h-4 w-4" />Novo registro</Button></CardHeader><CardContent className="space-y-4">
    {(showCreate || editingId) && <div className="grid gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 md:grid-cols-6"><Input placeholder="Romaneio" value={draft.romaneio} onChange={(event) => setField("romaneio", event.target.value)} /><Input placeholder="Cliente" value={draft.cliente} onChange={(event) => setField("cliente", event.target.value)} /><Input placeholder="Tipo de placa" value={draft.tipoPlaca} onChange={(event) => setField("tipoPlaca", event.target.value)} /><Input type="number" min={1} placeholder="Qtd." value={draft.quantidade} onChange={(event) => setField("quantidade", Number(event.target.value))} /><select value={draft.mes} onChange={(event) => setField("mes", event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">{MONTHS.map((month) => <option key={month}>{month}</option>)}</select><div className="flex gap-2"><Button onClick={save} disabled={createMutation.isPending || updateMutation.isPending}><Save className="mr-2 h-4 w-4" />Guardar</Button><Button variant="outline" onClick={() => { setShowCreate(false); setEditingId(null); }}><X className="mr-2 h-4 w-4" />Cancelar</Button></div></div>}
    {recordsQuery.isLoading ? <p className="text-sm text-muted-foreground">A carregar registros…</p> : recordsQuery.data?.length ? <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead><tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground"><th className="p-3">Romaneio</th><th className="p-3">Cliente</th><th className="p-3">Modelo</th><th className="p-3 text-right">Qtd.</th><th className="p-3">Mês/Ano</th><th className="p-3 text-right">Ações</th></tr></thead><tbody>{recordsQuery.data.map((record, index) => <tr key={record.id} className={index % 2 ? "bg-muted/10" : ""}><td className="p-3 text-muted-foreground">{record.romaneio || "—"}</td><td className="p-3 font-medium text-foreground">{record.cliente}</td><td className="p-3 text-muted-foreground">{record.tipoPlaca}</td><td className="p-3 text-right font-semibold text-foreground">{record.quantidade.toLocaleString("pt-BR")}</td><td className="p-3 text-muted-foreground">{record.mes} / {record.ano}</td><td className="p-3"><div className="flex justify-end gap-2"><Button variant="ghost" size="icon" aria-label={`Editar ${record.cliente}`} onClick={() => startEdit(record)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" aria-label={`Eliminar ${record.cliente}`} onClick={() => remove(record.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></td></tr>)}</tbody></table></div> : <p className="text-sm text-muted-foreground">Não existem registros no período selecionado.</p>}
  </CardContent></Card>;
}
