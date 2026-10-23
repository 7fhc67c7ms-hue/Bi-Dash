import { useEffect, useMemo, useState } from "react";
import { Calculator, CircleDollarSign, PackagePlus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const money = (centavos: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((centavos ?? 0) / 100);
const number = (value: number | string | null | undefined) =>
  Number(value ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 3 });
const today = () => new Date().toISOString().slice(0, 10);
const toCentavos = (value: string) => {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : null;
};
const toIsoDate = (value: string) => (value ? new Date(`${value}T12:00:00`).toISOString() : undefined);

export default function CostsManagement({ tiposPlaca }: { tiposPlaca: string[] }) {
  const overviewQuery = trpc.costs.getOverview.useQuery();
  const utils = trpc.useUtils();
  const [tipoPlaca, setTipoPlaca] = useState(tiposPlaca[0] ?? "");
  const [custoCompra, setCustoCompra] = useState("");
  const [precoVenda, setPrecoVenda] = useState("");
  const [vigenteDesde, setVigenteDesde] = useState(today());
  const [precoObservacao, setPrecoObservacao] = useState("");
  const [nomeInsumo, setNomeInsumo] = useState("");
  const [unidadeInsumo, setUnidadeInsumo] = useState("unidade");
  const [custoInsumo, setCustoInsumo] = useState("");
  const [insumoObservacao, setInsumoObservacao] = useState("");
  const [supplyId, setSupplyId] = useState("");
  const [periodicidade, setPeriodicidade] = useState<"diaria" | "semanal" | "por_placas">("diaria");
  const [consumoQuantidade, setConsumoQuantidade] = useState("");
  const [consumoCusto, setConsumoCusto] = useState("");
  const [placasProduzidas, setPlacasProduzidas] = useState("");
  const [referenciaEm, setReferenciaEm] = useState(today());
  const [consumoObservacao, setConsumoObservacao] = useState("");

  const prices = overviewQuery.data?.prices ?? [];
  const supplies = overviewQuery.data?.supplies ?? [];
  const consumptions = overviewQuery.data?.consumptions ?? [];
  const analysis = overviewQuery.data?.analysis;
  const activeSupplies = supplies.filter(item => item.ativo);

  useEffect(() => {
    if (!tipoPlaca && tiposPlaca[0]) setTipoPlaca(tiposPlaca[0]);
  }, [tipoPlaca, tiposPlaca]);

  useEffect(() => {
    const selected = supplies.find(item => String(item.id) === supplyId);
    if (selected && !consumoCusto) setConsumoCusto((selected.custoUnitarioCentavos / 100).toFixed(2).replace(".", ","));
  }, [consumoCusto, supplies, supplyId]);

  const invalidate = async () => {
    await utils.costs.getOverview.invalidate();
  };
  const createPrice = trpc.costs.createPrice.useMutation({
    onSuccess: async () => {
      setCustoCompra("");
      setPrecoVenda("");
      setPrecoObservacao("");
      await invalidate();
      toast.success("Preço salvo no histórico.");
    },
    onError: error => toast.error(error.message),
  });
  const createSupply = trpc.costs.createSupply.useMutation({
    onSuccess: async () => {
      setNomeInsumo("");
      setCustoInsumo("");
      setInsumoObservacao("");
      await invalidate();
      toast.success("Insumo cadastrado.");
    },
    onError: error => toast.error(error.message),
  });
  const updateSupply = trpc.costs.updateSupply.useMutation({
    onSuccess: invalidate,
    onError: error => toast.error(error.message),
  });
  const createConsumption = trpc.costs.createConsumption.useMutation({
    onSuccess: async () => {
      setConsumoQuantidade("");
      setPlacasProduzidas("");
      setConsumoObservacao("");
      await invalidate();
      toast.success("Consumo registrado.");
    },
    onError: error => toast.error(error.message),
  });
  const deleteConsumption = trpc.costs.deleteConsumption.useMutation({
    onSuccess: async () => {
      await invalidate();
      toast.success("Lançamento de consumo removido.");
    },
    onError: error => toast.error(error.message),
  });

  const selectedSupply = supplies.find(item => String(item.id) === supplyId);
  const currentPriceByType = useMemo(() => {
    const map = new Map<string, typeof prices[number]>();
    for (const price of prices) if (!map.has(price.tipoPlaca)) map.set(price.tipoPlaca, price);
    return map;
  }, [prices]);

  const submitPrice = (event: React.FormEvent) => {
    event.preventDefault();
    const purchase = toCentavos(custoCompra);
    const sale = toCentavos(precoVenda);
    if (purchase === null || sale === null || !tipoPlaca) {
      toast.error("Informe tipo de placa, custo de compra e preço de venda válidos.");
      return;
    }
    createPrice.mutate({ tipoPlaca, custoCompraCentavos: purchase, precoVendaCentavos: sale, vigenteDesde: toIsoDate(vigenteDesde), observacao: precoObservacao || null });
  };

  const submitSupply = (event: React.FormEvent) => {
    event.preventDefault();
    const cost = toCentavos(custoInsumo);
    if (!nomeInsumo.trim() || cost === null || !unidadeInsumo.trim()) {
      toast.error("Informe nome, unidade e custo unitário válidos.");
      return;
    }
    createSupply.mutate({ nome: nomeInsumo, unidade: unidadeInsumo, custoUnitarioCentavos: cost, observacao: insumoObservacao || null });
  };

  const submitConsumption = (event: React.FormEvent) => {
    event.preventDefault();
    const quantity = Number(consumoQuantidade.replace(",", "."));
    const cost = toCentavos(consumoCusto);
    if (!supplyId || !Number.isFinite(quantity) || quantity <= 0 || cost === null || (periodicidade === "por_placas" && (!placasProduzidas || Number(placasProduzidas) <= 0))) {
      toast.error("Informe insumo, quantidade, custo e, quando aplicável, placas produzidas.");
      return;
    }
    createConsumption.mutate({
      supplyId: Number(supplyId),
      periodicidade,
      quantidade: quantity,
      custoUnitarioCentavos: cost,
      placasProduzidas: periodicidade === "por_placas" ? Number(placasProduzidas) : null,
      referenciaEm: toIsoDate(referenciaEm),
      observacao: consumoObservacao || null,
    });
  };

  if (overviewQuery.isLoading) return <div className="py-16 text-center text-sm text-muted-foreground">Carregando preços e custos…</div>;
  if (overviewQuery.isError) return <Card><CardContent className="p-6 text-sm text-destructive">Não foi possível carregar o módulo de custos. Atualize a página e tente novamente.</CardContent></Card>;

  return (
    <section className="space-y-5" aria-label="Preços e custos" data-print-block>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Módulo financeiro operacional</p>
        <h2 className="mt-1 text-2xl font-semibold">Preços, custos e insumos</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Cadastre valores sem alterar a produção importada. O histórico de preços preserva as vigências e os consumos ficam separados por frequência.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Card><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">Faturamento estimado</p><p className="mt-2 text-xl font-semibold text-emerald-600">{money(analysis?.faturamentoCentavos)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">Custo de compra</p><p className="mt-2 text-xl font-semibold">{money(analysis?.custoCompraCentavos)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">Custo de insumos</p><p className="mt-2 text-xl font-semibold text-orange-600">{money(analysis?.custoInsumosCentavos)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">Custo médio / placa</p><p className="mt-2 text-xl font-semibold">{analysis?.custoMedioPorPlacaCentavos == null ? "—" : money(analysis.custoMedioPorPlacaCentavos)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">Margem bruta</p><p className={`mt-2 text-xl font-semibold ${(analysis?.margemBrutaCentavos ?? 0) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{money(analysis?.margemBrutaCentavos)}{analysis?.margemBrutaPercentual == null ? "" : ` · ${analysis.margemBrutaPercentual.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}</p></CardContent></Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><CircleDollarSign className="h-5 w-5 text-primary" />Cadastrar preço de placa</CardTitle></CardHeader><CardContent><form onSubmit={submitPrice} className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-muted-foreground">Tipo de placa<select value={tipoPlaca} onChange={event => setTipoPlaca(event.target.value)} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Selecione</option>{tiposPlaca.map(item => <option key={item}>{item}</option>)}</select></label>
          <label className="text-xs text-muted-foreground">Vigente desde<input type="date" value={vigenteDesde} onChange={event => setVigenteDesde(event.target.value)} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" /></label>
          <label className="text-xs text-muted-foreground">Custo de compra (R$)<input value={custoCompra} onChange={event => setCustoCompra(event.target.value)} placeholder="0,00" inputMode="decimal" className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" /></label>
          <label className="text-xs text-muted-foreground">Preço de venda (R$)<input value={precoVenda} onChange={event => setPrecoVenda(event.target.value)} placeholder="0,00" inputMode="decimal" className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" /></label>
          <label className="text-xs text-muted-foreground sm:col-span-2">Observação<input value={precoObservacao} onChange={event => setPrecoObservacao(event.target.value)} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" placeholder="Fornecedor, acabamento ou tabela vigente" /></label>
          <Button type="submit" disabled={createPrice.isPending} className="sm:col-span-2 sm:w-fit"><Plus className="mr-2 h-4 w-4" />Salvar novo preço</Button>
        </form></CardContent></Card>

        <Card><CardHeader><CardTitle className="flex items-center gap-2"><PackagePlus className="h-5 w-5 text-primary" />Cadastrar insumo</CardTitle></CardHeader><CardContent><form onSubmit={submitSupply} className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-muted-foreground">Nome<input value={nomeInsumo} onChange={event => setNomeInsumo(event.target.value)} placeholder="Ex.: embalagem" className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" /></label>
          <label className="text-xs text-muted-foreground">Unidade<input value={unidadeInsumo} onChange={event => setUnidadeInsumo(event.target.value)} placeholder="unidade, litro, kg…" className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" /></label>
          <label className="text-xs text-muted-foreground">Custo unitário (R$)<input value={custoInsumo} onChange={event => setCustoInsumo(event.target.value)} placeholder="0,00" inputMode="decimal" className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" /></label>
          <label className="text-xs text-muted-foreground">Observação<input value={insumoObservacao} onChange={event => setInsumoObservacao(event.target.value)} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" /></label>
          <Button type="submit" disabled={createSupply.isPending} className="sm:col-span-2 sm:w-fit"><Plus className="mr-2 h-4 w-4" />Cadastrar insumo</Button>
        </form></CardContent></Card>
      </div>

      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5 text-primary" />Lançar consumo</CardTitle></CardHeader><CardContent><form onSubmit={submitConsumption} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs text-muted-foreground">Insumo<select value={supplyId} onChange={event => { setSupplyId(event.target.value); setConsumoCusto(""); }} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Selecione</option>{activeSupplies.map(item => <option key={item.id} value={item.id}>{item.nome} ({item.unidade})</option>)}</select></label>
        <label className="text-xs text-muted-foreground">Frequência<select value={periodicidade} onChange={event => setPeriodicidade(event.target.value as typeof periodicidade)} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="diaria">Por dia</option><option value="semanal">Por semana</option><option value="por_placas">Por quantidade de placas</option></select></label>
        <label className="text-xs text-muted-foreground">Quantidade<input value={consumoQuantidade} onChange={event => setConsumoQuantidade(event.target.value)} placeholder={selectedSupply ? `em ${selectedSupply.unidade}` : "0"} inputMode="decimal" className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" /></label>
        <label className="text-xs text-muted-foreground">Custo unitário (R$)<input value={consumoCusto} onChange={event => setConsumoCusto(event.target.value)} placeholder="0,00" inputMode="decimal" className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" /></label>
        {periodicidade === "por_placas" && <label className="text-xs text-muted-foreground">Placas produzidas<input type="number" min="1" value={placasProduzidas} onChange={event => setPlacasProduzidas(event.target.value)} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" /></label>}
        <label className="text-xs text-muted-foreground">Data de referência<input type="date" value={referenciaEm} onChange={event => setReferenciaEm(event.target.value)} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" /></label>
        <label className="text-xs text-muted-foreground lg:col-span-2">Observação<input value={consumoObservacao} onChange={event => setConsumoObservacao(event.target.value)} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" /></label>
        <Button type="submit" disabled={createConsumption.isPending || activeSupplies.length === 0} className="lg:col-span-4 lg:w-fit"><Plus className="mr-2 h-4 w-4" />Registrar consumo</Button>
      </form></CardContent></Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card><CardHeader><CardTitle>Preços vigentes e histórico</CardTitle></CardHeader><CardContent><div className="space-y-2">{prices.length ? prices.map(item => <div key={item.id} className="flex flex-col gap-1 rounded-lg border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{item.tipoPlaca}</p><p className="text-xs text-muted-foreground">Desde {new Date(item.vigenteDesde).toLocaleDateString("pt-BR")}{item.observacao ? ` · ${item.observacao}` : ""}</p></div><p className="font-medium">Compra {money(item.custoCompraCentavos)} · Venda {money(item.precoVendaCentavos)}</p></div>) : <p className="text-sm text-muted-foreground">Nenhum preço cadastrado.</p>}</div></CardContent></Card>
        <Card><CardHeader><CardTitle>Insumos cadastrados</CardTitle></CardHeader><CardContent><div className="space-y-2">{supplies.length ? supplies.map(item => <div key={item.id} className="flex items-center justify-between rounded-lg border p-3 text-sm"><div><p className="font-medium">{item.nome} <span className="text-muted-foreground">/ {item.unidade}</span></p><p className="text-xs text-muted-foreground">{money(item.custoUnitarioCentavos)} por {item.unidade}</p></div><Button size="sm" variant="outline" onClick={() => updateSupply.mutate({ id: item.id, ativo: !item.ativo })}>{item.ativo ? "Desativar" : "Ativar"}</Button></div>) : <p className="text-sm text-muted-foreground">Nenhum insumo cadastrado.</p>}</div></CardContent></Card>
      </div>

      <Card><CardHeader><CardTitle>Histórico de consumo</CardTitle></CardHeader><CardContent><div className="space-y-2">{consumptions.length ? consumptions.map(item => <div key={item.id} className="flex flex-col gap-2 rounded-lg border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{item.supplyNome} · {number(item.quantidade)} {item.supplyUnidade} · {item.periodicidade === "por_placas" ? "por placas" : item.periodicidade}</p><p className="text-xs text-muted-foreground">{new Date(item.referenciaEm).toLocaleDateString("pt-BR")} · custo {money(Number(item.quantidade) * item.custoUnitarioCentavos)}{item.placasProduzidas ? ` · ${number(item.placasProduzidas)} placas` : ""}</p></div><Button size="sm" variant="ghost" onClick={() => deleteConsumption.mutate({ id: item.id })} aria-label="Remover consumo"><Trash2 className="h-4 w-4 text-destructive" /></Button></div>) : <p className="text-sm text-muted-foreground">Nenhum consumo lançado.</p>}</div></CardContent></Card>

      <p className="text-xs text-muted-foreground">O resumo considera toda a produção e os lançamentos cadastrados até o momento. Preços sem cadastro são tratados como zero até você registrar a tabela correspondente.</p>
    </section>
  );
}
