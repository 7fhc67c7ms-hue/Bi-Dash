import { useMemo, useState } from "react";
import { MapPinned, Search, Trash2, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import brazilMap from "@/data/brazilMap";

const STATES: Array<[string, string]> = [
  ["AC", "Acre"], ["AL", "Alagoas"], ["AP", "Amapá"], ["AM", "Amazonas"], ["BA", "Bahia"], ["CE", "Ceará"], ["DF", "Distrito Federal"],
  ["ES", "Espírito Santo"], ["GO", "Goiás"], ["MA", "Maranhão"], ["MT", "Mato Grosso"], ["MS", "Mato Grosso do Sul"], ["MG", "Minas Gerais"],
  ["PA", "Pará"], ["PB", "Paraíba"], ["PR", "Paraná"], ["PE", "Pernambuco"], ["PI", "Piauí"], ["RJ", "Rio de Janeiro"], ["RN", "Rio Grande do Norte"],
  ["RS", "Rio Grande do Sul"], ["RO", "Rondônia"], ["RR", "Roraima"], ["SC", "Santa Catarina"], ["SP", "São Paulo"], ["SE", "Sergipe"], ["TO", "Tocantins"],
];
const stateName = new Map(STATES);
const normalizeCep = (value: string) => value.replace(/\D/g, "").slice(0, 8);
const mapLocations = (brazilMap as { locations: Array<{ id: string; name: string; path: string }>; viewBox: string }).locations;

const fillForCount = (count: number, max: number) => {
  if (!count) return "#e8eef4";
  const intensity = Math.max(0.22, count / Math.max(max, 1));
  return `hsl(174 72% ${Math.round(84 - intensity * 42)}%)`;
};

export default function CustomerCoverage() {
  const overviewQuery = trpc.customers.getOverview.useQuery();
  const utils = trpc.useUtils();
  const [nome, setNome] = useState("");
  const [cep, setCep] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [lookupMessage, setLookupMessage] = useState("");

  const summary = overviewQuery.data?.summary;
  const locations = overviewQuery.data?.locations ?? [];
  const stateCounts = useMemo(() => new Map((summary?.porEstado ?? []).map(item => [item.uf, item.total])), [summary?.porEstado]);
  const maxStateCount = Math.max(...Array.from(stateCounts.values()), 0);

  const lookup = trpc.customers.lookupLocation.useMutation({
    onSuccess: result => {
      setCep(result.cep ?? cep);
      setCidade(result.cidade);
      setUf(result.uf);
      setLookupMessage(result.fonteLocalizacao === "cep" ? `Local encontrado pelo CEP: ${result.cidade} / ${result.uf}.` : `CEP não localizado; cidade e UF confirmadas pelo IBGE: ${result.cidade} / ${result.uf}.`);
    },
    onError: error => {
      setLookupMessage("");
      toast.error(error.message);
    },
  });
  const create = trpc.customers.create.useMutation({
    onSuccess: async result => {
      setCep(result.location.cep ?? "");
      setCidade(result.location.cidade);
      setUf(result.location.uf);
      setNome("");
      setLookupMessage("Cliente salvo no mapa de cobertura.");
      await utils.customers.getOverview.invalidate();
      toast.success("Cliente cadastrado.");
    },
    onError: error => toast.error(error.message),
  });
  const remove = trpc.customers.delete.useMutation({
    onSuccess: async () => {
      await utils.customers.getOverview.invalidate();
      toast.success("Cliente removido do mapa.");
    },
    onError: error => toast.error(error.message),
  });

  const searchLocation = () => {
    if (normalizeCep(cep).length !== 8 && (!cidade.trim() || !uf)) {
      toast.error("Informe um CEP com 8 dígitos ou cidade e UF para o fallback.");
      return;
    }
    lookup.mutate({ cep: cep || null, cidade: cidade || null, uf: uf || null });
  };
  const saveCustomer = (event: React.FormEvent) => {
    event.preventDefault();
    if (!nome.trim() || !cidade.trim() || !uf) {
      toast.error("Informe o nome e confirme a cidade e a UF.");
      return;
    }
    create.mutate({ nome, cep: cep || null, cidade, uf });
  };

  if (overviewQuery.isLoading) return <div className="py-16 text-center text-sm text-muted-foreground">Carregando cobertura de clientes…</div>;
  if (overviewQuery.isError) return <Card><CardContent className="p-6 text-sm text-destructive">Não foi possível carregar o cadastro geográfico de clientes.</CardContent></Card>;

  return (
    <section className="space-y-5" aria-label="Cobertura geográfica de clientes" data-print-block>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Inteligência comercial</p>
        <h2 className="mt-1 text-2xl font-semibold">Cobertura de clientes no Brasil</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Cadastre somente o necessário para acompanhar a presença nacional. O CEP preenche a cidade e o estado; se ele estiver desatualizado, use cidade e UF para confirmar a localização.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">Clientes cadastrados</p><p className="mt-2 text-2xl font-semibold">{summary?.totalClientes ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">Estados atendidos</p><p className="mt-2 text-2xl font-semibold text-primary">{summary?.estadosAtendidos ?? 0} / 27</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">Principal estado</p><p className="mt-2 text-2xl font-semibold">{summary?.porEstado[0]?.uf ?? "—"}</p></CardContent></Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden"><CardHeader><CardTitle className="flex items-center gap-2"><MapPinned className="h-5 w-5 text-primary" />Mapa de presença por estado</CardTitle><p className="text-sm text-muted-foreground">Passe o cursor sobre um estado para ver a quantidade de clientes.</p></CardHeader><CardContent><div className="rounded-2xl border bg-muted/45 p-3"><svg viewBox={brazilMap.viewBox} role="img" aria-label="Mapa do Brasil com clientes por estado" className="mx-auto max-h-[560px] w-full"><g stroke="white" strokeWidth="1.4" strokeLinejoin="round">{mapLocations.map(location => { const count = stateCounts.get(location.id.toUpperCase()) ?? 0; return <path key={location.id} d={location.path} fill={fillForCount(count, maxStateCount)} className="transition-opacity hover:opacity-75"><title>{location.name}: {count} cliente{count === 1 ? "" : "s"}</title></path>; })}</g></svg></div><div className="mt-3 flex items-center justify-between text-xs text-muted-foreground"><span>Sem clientes</span><span className="mx-3 h-2 flex-1 rounded-full bg-gradient-to-r from-[#e8eef4] via-[#8bd8cf] to-[#179f93]" /><span>Maior presença</span></div></CardContent></Card>

        <Card><CardHeader><CardTitle>Adicionar cliente</CardTitle><p className="text-sm text-muted-foreground">Nome é obrigatório. O endereço completo não é necessário.</p></CardHeader><CardContent><form onSubmit={saveCustomer} className="space-y-3">
          <label className="block text-xs text-muted-foreground">Nome do cliente<input value={nome} onChange={event => setNome(event.target.value)} placeholder="Ex.: João Porcelanas" className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" /></label>
          <div className="flex gap-2"><label className="min-w-0 flex-1 text-xs text-muted-foreground">CEP<input value={cep} onChange={event => setCep(normalizeCep(event.target.value))} placeholder="00000000" inputMode="numeric" className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" /></label><Button type="button" variant="outline" className="mt-5 shrink-0" onClick={searchLocation} disabled={lookup.isPending}><Search className="mr-2 h-4 w-4" />Buscar</Button></div>
          <div className="grid gap-3 sm:grid-cols-[1fr_110px]"><label className="text-xs text-muted-foreground">Cidade<input value={cidade} onChange={event => setCidade(event.target.value)} placeholder="Preenchida pelo CEP ou fallback" className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" /></label><label className="text-xs text-muted-foreground">UF<select value={uf} onChange={event => setUf(event.target.value)} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">UF</option>{STATES.map(([code, name]) => <option key={code} value={code}>{code} · {name}</option>)}</select></label></div>
          {lookupMessage && <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700">{lookupMessage}</p>}
          <Button type="submit" disabled={create.isPending} className="w-full"><UsersRound className="mr-2 h-4 w-4" />Salvar cliente no mapa</Button>
        </form></CardContent></Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card><CardHeader><CardTitle>Ranking por estado</CardTitle></CardHeader><CardContent><div className="space-y-3">{summary?.porEstado.length ? summary.porEstado.map(item => <div key={item.uf}><div className="mb-1 flex items-center justify-between text-sm"><span className="font-medium">{item.uf} · {item.estado}</span><span>{item.total}</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(item.total / maxStateCount) * 100}%` }} /></div></div>) : <p className="text-sm text-muted-foreground">Cadastre o primeiro cliente para criar o ranking.</p>}</div></CardContent></Card>
        <Card><CardHeader><CardTitle>Cidades com clientes</CardTitle></CardHeader><CardContent><div className="max-h-72 space-y-2 overflow-y-auto">{summary?.porCidade.length ? summary.porCidade.map(item => <div key={`${item.uf}-${item.cidade}`} className="flex items-center justify-between rounded-lg border p-3 text-sm"><span>{item.cidade} / {item.uf}</span><span className="rounded-full bg-primary/10 px-2 py-1 font-semibold text-primary">{item.total}</span></div>) : <p className="text-sm text-muted-foreground">Ainda não há cidades cadastradas.</p>}</div></CardContent></Card>
      </div>

      <Card><CardHeader><CardTitle>Clientes cadastrados</CardTitle></CardHeader><CardContent><div className="space-y-2">{locations.length ? locations.map(item => <div key={item.id} className="flex flex-col gap-2 rounded-lg border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{item.nome}</p><p className="text-xs text-muted-foreground">{item.cidade} / {item.uf}{item.cep ? ` · CEP ${item.cep}` : ""} · origem: {item.fonteLocalizacao === "cep" ? "CEP" : "cidade e UF"}</p></div><Button size="sm" variant="ghost" onClick={() => remove.mutate({ id: item.id })} aria-label={`Remover ${item.nome}`}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>) : <p className="text-sm text-muted-foreground">Nenhum cliente cadastrado.</p>}</div></CardContent></Card>
    </section>
  );
}
