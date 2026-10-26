import { useState } from "react";
import { ClipboardCheck, Play, Plus, Square, Pause, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const inputClass = "mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground";
const statusLabel: Record<string, string> = { rascunho: "Rascunho", planejada: "Planejada", em_producao: "Em produção", pausada: "Pausada", concluida: "Concluída", cancelada: "Cancelada" };

export default function ProductionOrderManagement() {
  const utils = trpc.useUtils();
  const masterQuery = trpc.masterData.overview.useQuery();
  const formulasQuery = trpc.formulas.list.useQuery();
  const ordersQuery = trpc.productionOrders.list.useQuery();
  const [codigo, setCodigo] = useState("");
  const [produtoId, setProdutoId] = useState("");
  const [formulaId, setFormulaId] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [prioridade, setPrioridade] = useState("3");
  const [setorId, setSetorId] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [prazoEm, setPrazoEm] = useState("");
  const [observacao, setObservacao] = useState("");
  const refresh = () => void Promise.all([utils.productionOrders.list.invalidate(), utils.formulas.list.invalidate()]);
  const create = trpc.productionOrders.create.useMutation({ onSuccess: () => { setCodigo(""); setProdutoId(""); setFormulaId(""); setQuantidade("1"); setResponsavel(""); setPrazoEm(""); setObservacao(""); refresh(); toast.success("Ordem criada com snapshot da ficha técnica."); }, onError: error => toast.error(error.message) });
  const transition = trpc.productionOrders.transition.useMutation({ onSuccess: result => { refresh(); toast.success(result.duplicate ? "Evento já registrado; nenhuma duplicidade criada." : "Evento registrado."); }, onError: error => toast.error(error.message) });
  const items = masterQuery.data?.items.filter(item => item.ativo && ["produto_acabado", "intermediario", "em_processo"].includes(item.tipo)) ?? [];
  const sectors = masterQuery.data?.locations.filter(location => location.ativo && location.tipo === "setor") ?? [];
  const formulas = formulasQuery.data?.filter(formula => formula.status === "ativa" && formula.produtoId === Number(produtoId)) ?? [];
  const makeKey = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (!codigo || !produtoId) { toast.error("Informe código e produto."); return; } create.mutate({ codigo, produtoId: Number(produtoId), formulaId: formulaId ? Number(formulaId) : null, quantidadePlanejada: Number(quantidade), prioridade: Number(prioridade), setorId: setorId ? Number(setorId) : null, responsavel: responsavel || null, prazoEm: prazoEm ? new Date(`${prazoEm}T12:00:00`).toISOString() : null, observacao: observacao || null, eventKey: `create-${makeKey()}` }); };
  const sendEvent = (id: number, evento: "planejada" | "iniciada" | "pausada" | "retomada" | "produzida" | "concluida" | "cancelada", quantity?: string) => transition.mutate({ id, evento, quantidade: quantity ? Number(quantity) : null, chaveIdempotencia: `${evento}-${id}-${makeKey()}`, observacao: null });
  return <section id="ordens" className="scroll-mt-6 space-y-5" aria-label="Ordens de produção">
    <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Bloco 5 · PCP</p><h2 className="mt-1 text-2xl font-semibold">Ordens de produção</h2><p className="mt-1 max-w-3xl text-sm text-muted-foreground">Planeje, inicie, pause, retome e conclua ordens. A ficha técnica ativa é copiada como snapshot no momento da criação.</p></div>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-primary" />Nova ordem</CardTitle></CardHeader><CardContent><form onSubmit={submit} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <label className="text-xs text-muted-foreground">Código<input className={inputClass} required value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="OP-2026-001" /></label>
      <label className="text-xs text-muted-foreground">Produto<select className={inputClass} required value={produtoId} onChange={e => { setProdutoId(e.target.value); setFormulaId(""); }}><option value="">Selecione</option>{items.map(item => <option key={item.id} value={item.id}>{item.codigo} · {item.nome}</option>)}</select></label>
      <label className="text-xs text-muted-foreground">Ficha ativa<select className={inputClass} value={formulaId} onChange={e => setFormulaId(e.target.value)}><option value="">Sem ficha</option>{formulas.map(formula => <option key={formula.id} value={formula.id}>v{formula.versao} · rendimento {String(formula.rendimento)}</option>)}</select></label>
      <label className="text-xs text-muted-foreground">Quantidade planejada<input className={inputClass} type="number" min="0.0001" step="0.0001" value={quantidade} onChange={e => setQuantidade(e.target.value)} /></label>
      <label className="text-xs text-muted-foreground">Prioridade<select className={inputClass} value={prioridade} onChange={e => setPrioridade(e.target.value)}><option value="1">1 · urgente</option><option value="2">2 · alta</option><option value="3">3 · normal</option><option value="4">4 · baixa</option><option value="5">5 · programada</option></select></label>
      <label className="text-xs text-muted-foreground">Setor<select className={inputClass} value={setorId} onChange={e => setSetorId(e.target.value)}><option value="">Sem setor</option>{sectors.map(sector => <option key={sector.id} value={sector.id}>{sector.nome}</option>)}</select></label>
      <label className="text-xs text-muted-foreground">Responsável<input className={inputClass} value={responsavel} onChange={e => setResponsavel(e.target.value)} /></label>
      <label className="text-xs text-muted-foreground">Prazo<input className={inputClass} type="date" value={prazoEm} onChange={e => setPrazoEm(e.target.value)} /></label>
      <label className="text-xs text-muted-foreground md:col-span-2 xl:col-span-4">Observação<input className={inputClass} value={observacao} onChange={e => setObservacao(e.target.value)} /></label>
      <Button type="submit" disabled={create.isPending} className="xl:col-span-4 xl:w-fit"><Plus className="mr-2 h-4 w-4" />Criar ordem</Button>
    </form></CardContent></Card>
    <Card><CardHeader><CardTitle>Fila e acompanhamento</CardTitle></CardHeader><CardContent>{ordersQuery.isLoading ? <p className="text-sm text-muted-foreground">Carregando ordens…</p> : ordersQuery.data?.length ? <div className="space-y-3">{ordersQuery.data.map(order => <div key={order.id} className="rounded-xl border p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><p className="font-semibold">{order.codigo} · {order.produto?.nome ?? "Produto removido"}</p><p className="text-xs text-muted-foreground">Planejada: {String(order.quantidadePlanejada)} · Produzida: {String(order.quantidadeProduzida)} · Aprovada: {String(order.quantidadeAprovada)} · Rejeitada: {String(order.quantidadeRejeitada)}</p><p className="mt-1 text-xs"><span className="rounded-full bg-primary/10 px-2 py-1 text-primary">{statusLabel[order.status]}</span> <span className="ml-2 text-muted-foreground">Prioridade {order.prioridade}{order.responsavel ? ` · ${order.responsavel}` : ""}</span></p></div><div className="flex flex-wrap gap-2">{order.status === "rascunho" && <Button size="sm" onClick={() => sendEvent(order.id, "planejada")}><ClipboardCheck className="mr-1 h-3 w-3" />Planejar</Button>}{["planejada", "pausada"].includes(order.status) && <Button size="sm" onClick={() => sendEvent(order.id, order.status === "pausada" ? "retomada" : "iniciada")}><Play className="mr-1 h-3 w-3" />{order.status === "pausada" ? "Retomar" : "Iniciar"}</Button>}{order.status === "em_producao" && <Button size="sm" variant="outline" onClick={() => sendEvent(order.id, "pausada")}><Pause className="mr-1 h-3 w-3" />Pausar</Button>}{["em_producao", "pausada"].includes(order.status) && <Button size="sm" variant="outline" onClick={() => sendEvent(order.id, "concluida")}><Square className="mr-1 h-3 w-3" />Concluir</Button>}{!["concluida", "cancelada"].includes(order.status) && <Button size="sm" variant="ghost" onClick={() => sendEvent(order.id, "cancelada")}><RotateCcw className="mr-1 h-3 w-3" />Cancelar</Button>}</div></div><div className="mt-3 text-xs text-muted-foreground">Eventos registrados: {order.eventos.length} · Snapshot: {order.formulaSnapshot ? "preservado" : "sem ficha"}</div></div>)}</div> : <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Nenhuma ordem de produção cadastrada.</p>}</CardContent></Card>
  </section>;
}
