import { useState } from "react";
import { ClipboardList, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const fieldClass = "mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground";
const statusLabel = { rascunho: "Rascunho", ativa: "Ativa", inativa: "Inativa" } as const;

type DraftComponent = { componenteId: string; quantidade: string; perdaPercentual: string; observacao: string };

export default function FormulaManagement() {
  const masterQuery = trpc.masterData.overview.useQuery();
  const formulasQuery = trpc.formulas.list.useQuery();
  const utils = trpc.useUtils();
  const [produtoId, setProdutoId] = useState("");
  const [rendimento, setRendimento] = useState("1");
  const [perdaPercentual, setPerdaPercentual] = useState("0");
  const [status, setStatus] = useState<"rascunho" | "ativa">("rascunho");
  const [observacao, setObservacao] = useState("");
  const [components, setComponents] = useState<DraftComponent[]>([{ componenteId: "", quantidade: "1", perdaPercentual: "0", observacao: "" }]);

  const refresh = () => void Promise.all([utils.formulas.list.invalidate(), utils.masterData.overview.invalidate()]);
  const createFormula = trpc.formulas.create.useMutation({
    onSuccess: result => { setProdutoId(""); setRendimento("1"); setPerdaPercentual("0"); setStatus("rascunho"); setObservacao(""); setComponents([{ componenteId: "", quantidade: "1", perdaPercentual: "0", observacao: "" }]); refresh(); toast.success(`Ficha técnica v${result.versao} criada.`); },
    onError: error => toast.error(error.message),
  });
  const setStatusMutation = trpc.formulas.setStatus.useMutation({ onSuccess: refresh, onError: error => toast.error(error.message) });

  const items = masterQuery.data?.items.filter(item => item.ativo) ?? [];
  const products = items.filter(item => ["produto_acabado", "intermediario", "em_processo"].includes(item.tipo));
  const componentsCatalog = items.filter(item => !["produto_acabado"].includes(item.tipo));
  const updateComponent = (index: number, patch: Partial<DraftComponent>) => setComponents(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!produtoId || components.some(component => !component.componenteId || Number(component.quantidade) <= 0)) { toast.error("Selecione o produto e informe todos os componentes com quantidade positiva."); return; }
    createFormula.mutate({
      produtoId: Number(produtoId),
      rendimento: Number(rendimento),
      perdaPercentual: Number(perdaPercentual),
      status,
      observacao: observacao || null,
      componentes: components.map(component => ({ componenteId: Number(component.componenteId), quantidade: Number(component.quantidade), perdaPercentual: Number(component.perdaPercentual), observacao: component.observacao || null })),
    });
  };

  return (
    <section id="fichas" className="scroll-mt-6 space-y-5" aria-label="Fichas técnicas">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Bloco 4 · engenharia do produto</p>
        <h2 className="mt-1 text-2xl font-semibold">Fichas técnicas versionadas</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Defina componentes, rendimento e perdas sem alterar a produção histórica. Cada nova ficha recebe uma versão e apenas uma versão pode ficar ativa por produto.</p>
      </div>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" />Nova ficha técnica</CardTitle></CardHeader><CardContent>
        {masterQuery.isLoading ? <p className="text-sm text-muted-foreground">Carregando catálogo…</p> : !products.length || !componentsCatalog.length ? <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Cadastre ao menos um produto/intermediário e um componente em Cadastros mestres antes de criar uma ficha.</p> : <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <label className="text-xs text-muted-foreground xl:col-span-2">Produto<select className={fieldClass} required value={produtoId} onChange={event => setProdutoId(event.target.value)}><option value="">Selecione</option>{products.map(item => <option key={item.id} value={item.id}>{item.codigo} · {item.nome}</option>)}</select></label>
            <label className="text-xs text-muted-foreground">Rendimento<input className={fieldClass} type="number" min="0.0001" step="0.0001" value={rendimento} onChange={event => setRendimento(event.target.value)} /></label>
            <label className="text-xs text-muted-foreground">Perda total (%)<input className={fieldClass} type="number" min="0" max="100" step="0.01" value={perdaPercentual} onChange={event => setPerdaPercentual(event.target.value)} /></label>
            <label className="text-xs text-muted-foreground">Estado inicial<select className={fieldClass} value={status} onChange={event => setStatus(event.target.value as "rascunho" | "ativa")}><option value="rascunho">Rascunho</option><option value="ativa">Ativa</option></select></label>
          </div>
          <label className="block text-xs text-muted-foreground">Observação<input className={fieldClass} maxLength={1000} value={observacao} onChange={event => setObservacao(event.target.value)} placeholder="Processo, fornecedor ou condição de uso" /></label>
          <div className="rounded-xl border p-4"><div className="mb-3 flex items-center justify-between gap-3"><div><p className="font-semibold">Componentes</p><p className="text-xs text-muted-foreground">Quantidade por unidade de rendimento; perdas ficam registradas no componente.</p></div><Button type="button" variant="outline" size="sm" onClick={() => setComponents(current => [...current, { componenteId: "", quantidade: "1", perdaPercentual: "0", observacao: "" }])}><Plus className="mr-2 h-4 w-4" />Adicionar componente</Button></div>
            <div className="space-y-3">{components.map((component, index) => <div key={index} className="grid gap-3 rounded-lg border bg-muted/20 p-3 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_2fr_auto]"><label className="text-xs text-muted-foreground">Componente<select className={fieldClass} required value={component.componenteId} onChange={event => updateComponent(index, { componenteId: event.target.value })}><option value="">Selecione</option>{componentsCatalog.filter(item => !components.some((selected, selectedIndex) => selectedIndex !== index && Number(selected.componenteId) === item.id)).map(item => <option key={item.id} value={item.id}>{item.codigo} · {item.nome}</option>)}</select></label><label className="text-xs text-muted-foreground">Quantidade<input className={fieldClass} type="number" min="0.000001" step="0.000001" value={component.quantidade} onChange={event => updateComponent(index, { quantidade: event.target.value })} /></label><label className="text-xs text-muted-foreground">Perda (%)<input className={fieldClass} type="number" min="0" max="100" step="0.01" value={component.perdaPercentual} onChange={event => updateComponent(index, { perdaPercentual: event.target.value })} /></label><label className="text-xs text-muted-foreground">Observação<input className={fieldClass} value={component.observacao} onChange={event => updateComponent(index, { observacao: event.target.value })} /></label><Button type="button" variant="ghost" size="sm" aria-label="Remover componente" disabled={components.length === 1} onClick={() => setComponents(current => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>)}</div>
          </div>
          <Button type="submit" disabled={createFormula.isPending}>Salvar ficha técnica</Button>
        </form>}
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Histórico de versões</CardTitle></CardHeader><CardContent>{formulasQuery.isLoading ? <p className="text-sm text-muted-foreground">Carregando versões…</p> : formulasQuery.data?.length ? <div className="space-y-3">{formulasQuery.data.map(formula => <div key={formula.id} className="rounded-xl border p-4"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><p className="font-semibold">{formula.produto?.codigo ?? "Produto removido"} · {formula.produto?.nome ?? "Sem nome"} <span className="ml-2 rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">v{formula.versao}</span></p><p className="mt-1 text-xs text-muted-foreground">Rendimento: {String(formula.rendimento)} · Perda total: {String(formula.perdaPercentual)}% · {statusLabel[formula.status]}</p></div><div className="flex gap-2">{formula.status !== "ativa" && <Button size="sm" onClick={() => setStatusMutation.mutate({ id: formula.id, status: "ativa" })}>Ativar</Button>}{formula.status === "ativa" && <Button size="sm" variant="outline" onClick={() => setStatusMutation.mutate({ id: formula.id, status: "inativa" })}>Inativar</Button>}</div></div><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{formula.componentes.map(component => <div key={component.id} className="rounded-lg bg-muted/40 p-3 text-xs"><b>{component.componente?.codigo ?? "Componente"}</b> · {component.componente?.nome ?? "Sem nome"}<br />Quantidade: {String(component.quantidade)} · perda: {String(component.perdaPercentual)}%</div>)}</div></div>)}</div> : <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Nenhuma ficha técnica cadastrada.</p>}</CardContent></Card>
    </section>
  );
}
