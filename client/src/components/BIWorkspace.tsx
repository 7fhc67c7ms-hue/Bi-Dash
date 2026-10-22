import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  Calculator,
  ChartNoAxesCombined,
  Download,
  FileText,
  GitCompareArrows,
  History,
  LayoutDashboard,
  Layers3,
  ListOrdered,
  PackageOpen,
  TableProperties,
  UsersRound,
} from "lucide-react";
import type { ProductionAnalysisReportData } from "@/lib/analysisPdf";
import type { PeriodSelection } from "@shared/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  ["dashboard", "Dashboard", LayoutDashboard],
  ["producao", "Produção", PackageOpen],
  ["clientes", "Clientes", UsersRound],
  ["tipos", "Tipos", Layers3],
  ["comparacoes", "Comparações", GitCompareArrows],
  ["evolucao", "Evolução", ChartNoAxesCombined],
  ["estatisticas", "Estatísticas", Calculator],
  ["rankings", "Rankings", ListOrdered],
  ["historico", "Histórico", History],
  ["relatorios", "Relatórios", FileText],
  ["exportacao", "Exportação", Download],
] as const;

const MONTHS = [
  "JANEIRO",
  "FEVEREIRO",
  "MARÇO",
  "ABRIL",
  "MAIO",
  "JUNHO",
  "JULHO",
  "AGOSTO",
  "SETEMBRO",
  "OUTUBRO",
  "NOVEMBRO",
  "DEZEMBRO",
];
const COLORS = ["#2563eb", "#14b8a6", "#f59e0b", "#8b5cf6", "#ef4444", "#64748b"];
const n = (value: number) => value.toLocaleString("pt-BR");
const pct = (value: number | null) => (value === null ? "—" : `${value.toLocaleString("pt-BR")} %`);
const deltaClass = (value: number) =>
  value > 0
    ? "text-emerald-600 dark:text-emerald-300"
    : value < 0
      ? "text-rose-600 dark:text-rose-300"
      : "text-muted-foreground";

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-5" data-print-block>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Análise de produção</p>
      <h2 className="mt-1 text-2xl font-semibold text-foreground">{title}</h2>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{children}</p>;
}

function Metric({ label, value, hint, accent, onClick }: { label: string; value: string; hint?: string; accent?: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label}: ${value}${hint ? `. ${hint}` : ""}`}
      data-print-block
      className="min-h-28 rounded-xl border border-border/70 bg-card p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
      title={hint}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${accent ?? "text-foreground"}`}>{value}</p>
      {hint && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{hint}</p>}
    </button>
  );
}

function DataTable({
  columns,
  rows,
  minWidth = 760,
}: {
  columns: string[];
  rows: Array<Array<string | number | React.ReactNode>>;
  minWidth?: number;
}) {
  if (!rows.length) return <Empty>Nenhum dado disponível neste recorte.</Empty>;
  return (
    <div className="overflow-x-auto rounded-lg border border-border/70" data-print-block>
      <table className="w-full text-sm" style={{ minWidth }}>
        <thead className="bg-muted/60">
          <tr>
            {columns.map(column => (
              <th key={column} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-t border-border/60 hover:bg-muted/30">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-3 align-top text-foreground">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PeriodField({
  title,
  value,
  years,
  onChange,
}: {
  title: string;
  value?: PeriodSelection;
  years: number[];
  onChange: (period: PeriodSelection) => void;
}) {
  if (!value) return <Empty>Importe pelo menos dois períodos para configurar {title}.</Empty>;
  const selectClass = "mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm";
  return (
    <fieldset data-print-ui className="rounded-xl border border-border/70 p-4">
      <legend className="px-2 text-sm font-semibold text-foreground">{title}</legend>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs text-muted-foreground">Ano
          <select className={selectClass} value={value.ano} onChange={event => onChange({ ...value, ano: Number(event.target.value) })}>
            {years.map(year => <option key={year}>{year}</option>)}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">Mês inicial
          <select className={selectClass} value={value.mesInicio} onChange={event => onChange({ ...value, mesInicio: event.target.value })}>
            {MONTHS.map(month => <option key={month}>{month}</option>)}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">Mês final
          <select className={selectClass} value={value.mesFim} onChange={event => onChange({ ...value, mesFim: event.target.value })}>
            {MONTHS.map(month => <option key={month}>{month}</option>)}
          </select>
        </label>
      </div>
    </fieldset>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="border-border/70 bg-card/90 shadow-sm" data-print-block>
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="h-80">{children}</CardContent>
    </Card>
  );
}

interface BIWorkspaceProps {
  data: ProductionAnalysisReportData & { periodosDisponiveis: Array<{ ano: number; mes: string }> };
  periodoA?: PeriodSelection;
  periodoB?: PeriodSelection;
  onPeriodoAChange: (period: PeriodSelection) => void;
  onPeriodoBChange: (period: PeriodSelection) => void;
  onExportPdf: () => void;
  onExportCsv: () => void;
  onExportExcel: () => void;
  filterDescription: string;
  reportOptions: {
    incluirGraficos: boolean;
    incluirTabelas: boolean;
    incluirTexto: boolean;
    incluirDetalhesClientes: boolean;
    incluirComparacao: boolean;
  };
  onReportOptionsChange: (value: BIWorkspaceProps["reportOptions"]) => void;
  analysisMode: "EXPLORAR" | "RELATORIO";
}

export default function BIWorkspace({
  data,
  periodoA,
  periodoB,
  onPeriodoAChange,
  onPeriodoBChange,
  onExportPdf,
  onExportCsv,
  onExportExcel,
  filterDescription,
  reportOptions,
  onReportOptionsChange,
  analysisMode,
}: BIWorkspaceProps) {
  const [section, setSection] = useState<(typeof NAV_ITEMS)[number][0]>("dashboard");
  const [selectedClientDrill, setSelectedClientDrill] = useState(data.analiseClientes[0]?.cliente ?? "");
  const [comparisonClients, setComparisonClients] = useState<string[]>(
    data.analiseClientes.slice(0, 4).map(item => item.cliente)
  );
  const [selectedType, setSelectedType] = useState(data.analiseTipos[0]?.tipoPlaca ?? "");
  const [rankingMetric, setRankingMetric] = useState<
    "total" | "crescimentoAbs" | "crescimentoPct" | "reducaoAbs" | "reducaoPct"
  >("total");
  const [rankingEntity, setRankingEntity] = useState<"clientes" | "tipos">("clientes");

  useEffect(() => {
    if (analysisMode === "RELATORIO") setSection("relatorios");
  }, [analysisMode]);

  useEffect(() => {
    const navigate = (event: Event) => {
      const destination = (event as CustomEvent<string>).detail;
      if (NAV_ITEMS.some(([id]) => id === destination)) {
        setSection(destination as (typeof NAV_ITEMS)[number][0]);
        window.setTimeout(
          () => document.getElementById("bi-workspace")?.scrollIntoView({ behavior: "smooth" }),
          30
        );
      }
    };
    const navigateFromUrl = () => {
      const destination = window.location.hash.replace(/^#/, "") || "dashboard";
      if (NAV_ITEMS.some(([id]) => id === destination)) {
        navigate(new CustomEvent<string>("bi:navigate", { detail: destination }));
      }
    };
    window.addEventListener("bi:navigate", navigate);
    window.addEventListener("hashchange", navigateFromUrl);
    window.addEventListener("popstate", navigateFromUrl);
    navigateFromUrl();
    return () => {
      window.removeEventListener("bi:navigate", navigate);
      window.removeEventListener("hashchange", navigateFromUrl);
      window.removeEventListener("popstate", navigateFromUrl);
    };
  }, []);

  const years = Array.from(new Set(data.periodosDisponiveis.map(item => item.ano))).sort((a, b) => a - b);
  const metrics = data.metricasExecutivas;
  const comparison = data.comparacaoPeriodos;
  const client = data.analiseClientes.find(item => item.cliente === selectedClientDrill) ?? data.analiseClientes[0];
  const plateType = data.analiseTipos.find(item => item.tipoPlaca === selectedType) ?? data.analiseTipos[0];
  const comparisonRows = data.analiseClientes.filter(item => comparisonClients.includes(item.cliente));
  const comparisonChart = useMemo(() => {
    const keys = new Set<string>();
    comparisonRows.forEach(item => item.evolucaoMensal.forEach(point => keys.add(`${point.ano}-${point.mes}`)));
    return Array.from(keys)
      .map(key => {
        const [year, month] = key.split("-");
        return Object.fromEntries([
          ["periodo", `${month.slice(0, 3)}/${year}`],
          ...comparisonRows.map(item => [
            item.cliente,
            item.evolucaoMensal.find(point => point.ano === Number(year) && point.mes === month)?.quantidade ?? 0,
          ]),
        ]);
      })
      .sort((a, b) => String(a.periodo).localeCompare(String(b.periodo)));
  }, [comparisonRows]);
  const groupedComparison = useMemo(() => {
    const points = new Map<string, Record<string, string | number>>();
    comparison.periodoA.evolucaoMensal.forEach(point => {
      points.set(point.mes, { mes: point.mes.slice(0, 3), A: point.quantidade, B: 0 });
    });
    comparison.periodoB.evolucaoMensal.forEach(point => {
      const current = points.get(point.mes) ?? { mes: point.mes.slice(0, 3), A: 0, B: 0 };
      current.B = point.quantidade;
      points.set(point.mes, current);
    });
    return MONTHS.filter(month => points.has(month)).map(month => points.get(month)!);
  }, [comparison]);
  const ranking = useMemo(() => {
    const clientChanges = new Map(
      [...comparison.clientesAumentaram, ...comparison.clientesDiminuiram, ...comparison.clientesEstaveis]
        .map(item => [item.cliente, item] as const)
    );
    const typeChanges = new Map(
      [...comparison.tiposAumentaram, ...comparison.tiposDiminuiram]
        .map(item => [item.tipoPlaca, item] as const)
    );
    if (rankingEntity === "tipos") {
      return data.analiseTipos
        .map(item => {
          const change = typeChanges.get(item.tipoPlaca);
          return { nome: item.tipoPlaca, total: item.total, crescimento: change?.diferencaAbsoluta ?? item.crescimentoAbsoluto, percentual: change?.diferencaPercentual ?? item.crescimentoPercentual ?? 0 };
        })
        .sort((a, b) => {
          if (rankingMetric === "total") return b.total - a.total;
          if (rankingMetric === "crescimentoAbs") return b.crescimento - a.crescimento;
          if (rankingMetric === "crescimentoPct") return b.percentual - a.percentual;
          if (rankingMetric === "reducaoPct") return a.percentual - b.percentual;
          return a.crescimento - b.crescimento;
        });
    }
    return data.analiseClientes
      .map(item => {
        const change = clientChanges.get(item.cliente);
        return { nome: item.cliente, total: item.total, crescimento: change?.diferencaAbsoluta ?? item.crescimentoAbsoluto, percentual: change?.diferencaPercentual ?? item.crescimentoPercentual ?? 0 };
      })
      .sort((a, b) => {
        if (rankingMetric === "total") return b.total - a.total;
        if (rankingMetric === "crescimentoAbs") return b.crescimento - a.crescimento;
        if (rankingMetric === "crescimentoPct") return b.percentual - a.percentual;
        if (rankingMetric === "reducaoPct") return a.percentual - b.percentual;
        return a.crescimento - b.crescimento;
      });
  }, [data, rankingEntity, rankingMetric]);

  const content = (() => {
    if (section === "dashboard") {
      return (
        <>
          <SectionTitle title="Dashboard executivo" description="Indicadores clicáveis e rastreáveis, calculados sobre todos os filtros globais ativos." />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            <Metric label="Produção total" value={n(metrics.totalProducao)} hint={`${metrics.mesesComProducao} mês(es) com produção`} onClick={() => setSection("producao")} />
            <Metric label="Clientes" value={n(metrics.totalClientes)} hint={metrics.maiorCliente ? `Maior: ${metrics.maiorCliente.nome}` : "Sem clientes"} onClick={() => setSection("clientes")} />
            <Metric label="Média por cliente" value={n(metrics.mediaPorCliente)} hint={`Mediana: ${n(metrics.medianaPorCliente)}`} />
            <Metric label="Mínimo / máximo" value={`${n(metrics.minimoPorCliente)} / ${n(metrics.maximoPorCliente)}`} hint={`Desvio padrão: ${n(metrics.desvioPadraoPorCliente)}`} />
            <Metric label="Média mensal" value={n(metrics.mediaMensal)} hint="Total ÷ meses com produção" />
            <Metric label="Média diária" value={metrics.mediaDiaria === null ? "Indisponível" : n(metrics.mediaDiaria)} hint="O schema não possui campo DATA diária" />
            <Metric label="Média semanal" value={metrics.mediaSemanal === null ? "Indisponível" : n(metrics.mediaSemanal)} hint="O schema não possui campo DATA diária" />
            <Metric label="Tipos produzidos" value={n(metrics.tiposProduzidos)} hint={`Produto estrela: ${metrics.produtoEstrela}`} onClick={() => setSection("tipos")} />
            <Metric label="Concentração Top 5" value={pct(metrics.participacaoTop5)} hint={`Demais clientes: ${pct(data.concentracao.demaisParticipacao)}`} onClick={() => setSection("clientes")} />
            <Metric label="Variação recente" value={metrics.variacaoAbsoluta === null ? "Indisponível" : `${metrics.variacaoAbsoluta >= 0 ? "+" : ""}${n(metrics.variacaoAbsoluta)}`} hint={`${metrics.periodoAnterior ?? "—"} → ${metrics.periodoAtual ?? "—"} · ${pct(metrics.variacaoPercentual)}`} accent={metrics.variacaoAbsoluta === null ? undefined : deltaClass(metrics.variacaoAbsoluta)} onClick={() => setSection("comparacoes")} />
          </div>
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            <ChartCard title="Linha · evolução mensal">
              <ResponsiveContainer width="100%" height="100%"><LineChart data={data.evolucaoAcumulada}><CartesianGrid strokeDasharray="3 3" opacity={0.25} /><XAxis dataKey="periodo" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Line type="monotone" dataKey="quantidade" name="Produção" stroke="#2563eb" strokeWidth={3} /></LineChart></ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Donut · concentração por cliente">
              <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={[...data.concentracao.clientes.slice(0, 5).map(item => ({ name: item.cliente, value: item.total })), { name: "Demais", value: data.concentracao.demaisTotal }].filter(item => item.value > 0)} dataKey="value" nameKey="name" innerRadius={65} outerRadius={105} paddingAngle={2}>{COLORS.map(color => <Cell key={color} fill={color} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer>
            </ChartCard>
          </div>
          <div data-print-block className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-muted-foreground">
            <strong className="text-foreground">Granularidade diária e semanal:</strong> indisponível. O schema real contém ANO e MÊS, mas não DATA; por isso dias com/sem produção, filtros de dia/semana e médias diária/semanal ficam explicitamente desabilitados, sem estimativas inventadas.
          </div>
        </>
      );
    }

    if (section === "producao") {
      return (
        <>
          <SectionTitle title="Produção detalhada" description="Resumo mensal, categorias RET/OVAL/QUAD e detalhamento por modelo, mantendo o recorte global." />
          <div className="grid gap-4 xl:grid-cols-2">
            <ChartCard title="Barras · volume mensal"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.resumoMensal}><CartesianGrid strokeDasharray="3 3" opacity={0.25} /><XAxis dataKey="mes" fontSize={10} /><YAxis fontSize={11} /><Tooltip /><Bar dataKey="total" name="Produção" fill="#2563eb" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></ChartCard>
            <ChartCard title="Pizza · mix de categorias"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data.mixCategorias.map(item => ({ name: item.categoria, value: item.total }))} dataKey="value" nameKey="name" outerRadius={105} label>{data.mixCategorias.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></ChartCard>
          </div>
          <Card className="mt-4"><CardHeader><CardTitle>Mix por categoria e modelo</CardTitle></CardHeader><CardContent><DataTable columns={["Categoria", "Total", "Participação", "Modelos detalhados"]} rows={data.mixCategorias.map(item => [item.categoria, n(item.total), pct(item.participacao), item.modelos.map(model => `${model.nome}: ${n(model.quantidade)}`).join(" · ")])} /></CardContent></Card>
        </>
      );
    }

    if (section === "clientes") {
      return (
        <>
          <SectionTitle title="Clientes" description="Seleção múltipla independente, comparação lado a lado e drill-down de histórico, evolução e mix." />
          <Card data-print-ui><CardHeader><CardTitle>Selecionar clientes para comparação</CardTitle></CardHeader><CardContent><div className="grid max-h-44 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">{data.analiseClientes.map(item => <label key={item.cliente} className="flex items-center gap-2 rounded-md border p-2 text-sm"><input type="checkbox" checked={comparisonClients.includes(item.cliente)} onChange={() => setComparisonClients(current => current.includes(item.cliente) ? current.filter(name => name !== item.cliente) : [...current, item.cliente])} />{item.cliente}</label>)}</div></CardContent></Card>
          <Card className="mt-4"><CardHeader><CardTitle>Tabela comparativa entre clientes</CardTitle></CardHeader><CardContent><DataTable columns={["Cliente", "Total", "Média/mês", "Maior mês", "Menor mês", "Tipos", "Participação", "Ranking"]} rows={comparisonRows.map(item => [item.cliente, n(item.total), n(item.mediaMensal), item.maiorMes ? `${item.maiorMes.nome}: ${n(item.maiorMes.quantidade)}` : "—", item.menorMes ? `${item.menorMes.nome}: ${n(item.menorMes.quantidade)}` : "—", item.tipos, pct(item.participacao), `#${item.rankingHistorico}`])} /></CardContent></Card>
          {comparisonRows.length > 0 && <div className="mt-4"><ChartCard title="Evolução dos clientes selecionados"><ResponsiveContainer width="100%" height="100%"><LineChart data={comparisonChart}><CartesianGrid strokeDasharray="3 3" opacity={0.25} /><XAxis dataKey="periodo" fontSize={11} /><YAxis /><Tooltip /><Legend />{comparisonRows.map((item, index) => <Line key={item.cliente} type="monotone" dataKey={item.cliente} stroke={COLORS[index % COLORS.length]} strokeWidth={2} />)}</LineChart></ResponsiveContainer></ChartCard></div>}
          <Card className="mt-4"><CardHeader><CardTitle>Drill-down individual</CardTitle></CardHeader><CardContent className="space-y-4"><select data-print-ui value={client?.cliente ?? ""} onChange={event => setSelectedClientDrill(event.target.value)} className="h-10 w-full max-w-md rounded-md border bg-background px-3 text-sm">{data.analiseClientes.map(item => <option key={item.cliente}>{item.cliente}</option>)}</select>{client ? <><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Total" value={n(client.total)} /><Metric label="Tipo principal" value={client.tipoMaisProduzido} /><Metric label="Crescimento" value={pct(client.crescimentoPercentual)} accent={deltaClass(client.crescimentoAbsoluto)} /><Metric label="Ranking histórico" value={`#${client.rankingHistorico}`} /></div><DataTable columns={["Período", "Ano", "Produção"]} rows={client.evolucaoMensal.map(point => [point.periodo, point.ano, n(point.quantidade)])} minWidth={480} /><DataTable columns={["Tipo", "Produção"]} rows={client.mixTipos.map(item => [item.nome, n(item.quantidade)])} minWidth={480} /></> : <Empty>Nenhum cliente no recorte.</Empty>}</CardContent></Card>
          <Card className="mt-4"><CardHeader><CardTitle>Matriz cliente × tipo · total histórico</CardTitle></CardHeader><CardContent><DataTable columns={["Cliente", ...data.matrizClienteTipo.tipos]} rows={data.matrizClienteTipo.clientes.map(clienteName => [clienteName, ...data.matrizClienteTipo.tipos.map(type => n(data.matrizClienteTipo.valores[clienteName]?.[type] ?? 0))])} minWidth={900} /></CardContent></Card>
          <Card className="mt-4"><CardHeader><CardTitle>Matriz cliente × tipo · comparação anual</CardTitle><p className="text-sm text-muted-foreground">Mostra a mudança do mix por cliente entre o primeiro e o último ano disponível.</p></CardHeader><CardContent><DataTable columns={["Cliente", "Tipo", ...data.matrizClienteTipo.anos.map(String), "Diferença"]} rows={data.matrizClienteTipo.clientes.flatMap(clienteName => data.matrizClienteTipo.tipos.map(type => { const values = data.matrizClienteTipo.anos.map(year => data.matrizClienteTipo.valoresPorAno[String(year)]?.[clienteName]?.[type] ?? 0); return [clienteName, type, ...values.map(n), values.length > 1 ? n(values.at(-1)! - values[0]) : "—"]; }))} minWidth={900} /></CardContent></Card>
        </>
      );
    }

    if (section === "tipos") {
      return (
        <>
          <SectionTitle title="Tipos de placa" description="Análise independente por modelo: volume, clientes, médias, participação, extremos, evolução, ranking e comparação." />
          <label data-print-ui className="mb-4 block max-w-lg text-xs text-muted-foreground">Modelo para drill-down<select value={plateType?.tipoPlaca ?? ""} onChange={event => setSelectedType(event.target.value)} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm">{data.analiseTipos.map(item => <option key={item.tipoPlaca}>{item.tipoPlaca}</option>)}</select></label>
          {plateType && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Total" value={n(plateType.total)} /><Metric label="Clientes" value={n(plateType.clientes)} hint={`Média: ${n(plateType.mediaPorCliente)}`} /><Metric label="Participação" value={pct(plateType.participacao)} hint={`Categoria ${plateType.categoria}`} /><Metric label="Ranking" value={`#${plateType.ranking}`} hint={`Variação histórica: ${pct(plateType.crescimentoPercentual)}`} /></div>}
          <Card className="mt-4"><CardHeader><CardTitle>Ranking e comparação de tipos</CardTitle></CardHeader><CardContent><DataTable columns={["#", "Tipo", "Categoria", "Total", "Clientes", "Média/cliente", "Maior cliente", "Menor cliente", "Participação", "Evolução"]} rows={data.analiseTipos.map(item => [item.ranking, item.tipoPlaca, item.categoria, n(item.total), item.clientes, n(item.mediaPorCliente), item.maiorCliente ? `${item.maiorCliente.nome}: ${n(item.maiorCliente.quantidade)}` : "—", item.menorCliente ? `${item.menorCliente.nome}: ${n(item.menorCliente.quantidade)}` : "—", pct(item.participacao), pct(item.crescimentoPercentual)])} minWidth={1180} /></CardContent></Card>
          <Card className="mt-4"><CardHeader><CardTitle>Evolução anual por tipo</CardTitle></CardHeader><CardContent><DataTable columns={["Tipo", ...years.map(String), "Diferença"]} rows={data.analiseTipos.map(item => { const values = years.map(year => item.evolucaoAnual.find(point => point.ano === year)?.quantidade ?? 0); return [item.tipoPlaca, ...values.map(n), values.length > 1 ? n(values.at(-1)! - values[0]) : "—"]; })} minWidth={760} /></CardContent></Card>
          {plateType && <div className="mt-4"><ChartCard title={`Evolução · ${plateType.tipoPlaca}`}><ResponsiveContainer width="100%" height="100%"><LineChart data={plateType.evolucaoMensal}><CartesianGrid strokeDasharray="3 3" opacity={0.25} /><XAxis dataKey="periodo" /><YAxis /><Tooltip /><Line type="monotone" dataKey="quantidade" stroke="#14b8a6" strokeWidth={3} /></LineChart></ResponsiveContainer></ChartCard></div>}
        </>
      );
    }

    if (section === "comparacoes") {
      return (
        <>
          <SectionTitle title="Comparações A × B e ano a ano" description="Seleção real de ano e intervalo de meses. Para mesmos meses entre anos, escolha intervalos idênticos e anos diferentes." />
          <div className="grid gap-4 lg:grid-cols-2"><PeriodField title="Período A" value={periodoA} years={years} onChange={onPeriodoAChange} /><PeriodField title="Período B" value={periodoB} years={years} onChange={onPeriodoBChange} /></div>
          {comparison.disponivel ? <><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Produção A" value={n(comparison.periodoA.total)} hint={comparison.periodoA.label} /><Metric label="Produção B" value={n(comparison.periodoB.total)} hint={comparison.periodoB.label} /><Metric label="Diferença" value={`${comparison.diferencaAbsoluta >= 0 ? "+" : ""}${n(comparison.diferencaAbsoluta)}`} accent={deltaClass(comparison.diferencaAbsoluta)} /><Metric label="Variação" value={pct(comparison.diferencaPercentual)} accent={deltaClass(comparison.diferencaAbsoluta)} /></div>
          <div className="mt-4 grid gap-4 xl:grid-cols-2"><ChartCard title="Barras agrupadas · A × B"><ResponsiveContainer width="100%" height="100%"><BarChart data={groupedComparison}><CartesianGrid strokeDasharray="3 3" opacity={0.25} /><XAxis dataKey="mes" /><YAxis /><Tooltip /><Legend /><Bar dataKey="A" fill="#2563eb" /><Bar dataKey="B" fill="#14b8a6" /></BarChart></ResponsiveContainer></ChartCard><Card><CardHeader><CardTitle>Resumo comparativo</CardTitle></CardHeader><CardContent><DataTable columns={["Indicador", "Período A", "Período B", "Diferença"]} rows={[["Produção", n(comparison.periodoA.total), n(comparison.periodoB.total), n(comparison.diferencaAbsoluta)], ["Média mensal", n(comparison.periodoA.mediaMensal), n(comparison.periodoB.mediaMensal), n(comparison.periodoB.mediaMensal - comparison.periodoA.mediaMensal)], ["Média/cliente", n(comparison.periodoA.mediaPorCliente), n(comparison.periodoB.mediaPorCliente), n(comparison.periodoB.mediaPorCliente - comparison.periodoA.mediaPorCliente)], ["Clientes", comparison.periodoA.clientes, comparison.periodoB.clientes, comparison.periodoB.clientes - comparison.periodoA.clientes], ["Tipos", comparison.periodoA.tipos, comparison.periodoB.tipos, comparison.periodoB.tipos - comparison.periodoA.tipos], ["Maior cliente", comparison.periodoA.maiorCliente?.nome ?? "—", comparison.periodoB.maiorCliente?.nome ?? "—", "—"], ["Tipo principal", comparison.periodoA.tipoMaisProduzido, comparison.periodoB.tipoMaisProduzido, "—"], ["Concentração Top 5", pct(comparison.periodoA.concentracaoTop5), pct(comparison.periodoB.concentracaoTop5), `${comparison.concentracaoDiferencaPontosPercentuais} p.p.`]]} /></CardContent></Card></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["Novos", comparison.clientesNovos], ["Perdidos", comparison.clientesPerdidos], ["Recorrentes", comparison.clientesRecorrentes], ["Reativados", comparison.clientesReativados]].map(([label, items]) => <Card key={label as string}><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">{label as string}</p><p className="mt-1 text-2xl font-semibold">{(items as string[]).length}</p><p className="mt-2 text-xs text-muted-foreground">{(items as string[]).join(" · ") || "Nenhum"}</p></CardContent></Card>)}</div>
          <Card className="mt-4"><CardHeader><CardTitle>Clientes que aumentaram, diminuíram ou ficaram estáveis</CardTitle></CardHeader><CardContent><DataTable columns={["Cliente", "A", "B", "Diferença", "Variação"]} rows={[...comparison.clientesAumentaram, ...comparison.clientesDiminuiram, ...comparison.clientesEstaveis].map(item => [item.cliente, n(item.periodoA), n(item.periodoB), n(item.diferencaAbsoluta), pct(item.diferencaPercentual)])} /></CardContent></Card>
          <div className="mt-4 grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle>Tipos que mudaram</CardTitle></CardHeader><CardContent><DataTable columns={["Tipo", "A", "B", "Diferença", "Variação"]} rows={[...comparison.tiposAumentaram, ...comparison.tiposDiminuiram].map(item => [item.tipoPlaca, n(item.periodoA), n(item.periodoB), n(item.diferencaAbsoluta), pct(item.diferencaPercentual)])} /></CardContent></Card><Card><CardHeader><CardTitle>Mix alterado</CardTitle></CardHeader><CardContent><DataTable columns={["Categoria", "A", "B", "Mudança"]} rows={comparison.mixAlterado.map(item => [item.categoria, pct(item.participacaoA), pct(item.participacaoB), `${item.diferencaPontosPercentuais} p.p.`])} /></CardContent></Card></div></> : <div className="mt-4"><Empty>{comparison.motivo ?? "Comparação indisponível."}</Empty></div>}
        </>
      );
    }

    if (section === "evolucao") {
      return (
        <>
          <SectionTitle title="Evolução e sazonalidade" description="Análise mensal, acumulado no ano, comparação multi-ano e média histórica de cada mês." />
          <div className="grid gap-4 xl:grid-cols-2"><ChartCard title="Área acumulada no ano"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data.evolucaoAcumulada}><CartesianGrid strokeDasharray="3 3" opacity={0.25} /><XAxis dataKey="periodo" /><YAxis /><Tooltip /><Area type="monotone" dataKey="acumulado" stroke="#2563eb" fill="#2563eb" fillOpacity={0.25} /></AreaChart></ResponsiveContainer></ChartCard><ChartCard title="Sazonalidade multi-ano"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.sazonalidade.linhas}><CartesianGrid strokeDasharray="3 3" opacity={0.25} /><XAxis dataKey="mes" fontSize={10} /><YAxis /><Tooltip /><Legend />{data.sazonalidade.anos.map((year, index) => <Line key={year} dataKey={`valores.${year}`} name={String(year)} stroke={COLORS[index % COLORS.length]} strokeWidth={2} />)}</LineChart></ResponsiveContainer></ChartCard></div>
          <Card className="mt-4"><CardHeader><CardTitle>Histórico sazonal</CardTitle></CardHeader><CardContent><DataTable columns={["Mês", ...data.sazonalidade.anos.map(String), "Média histórica"]} rows={data.sazonalidade.linhas.map(row => [row.mes, ...data.sazonalidade.anos.map(year => n(row.valores[String(year)] ?? 0)), n(row.mediaHistorica)])} /></CardContent></Card>
        </>
      );
    }

    if (section === "estatisticas") {
      return (
        <>
          <SectionTitle title="Estatísticas e crescimento" description="Médias, dispersão, extremos e classificação numérica com limiares transparentes." />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Média geral" value={n(metrics.mediaGeral)} hint="Total ÷ clientes" /><Metric label="Média mensal" value={n(metrics.mediaMensal)} hint="Total ÷ meses ativos" /><Metric label="Média por tipo" value={n(metrics.mediaPorTipo)} hint="Total ÷ tipos" /><Metric label="Mediana" value={n(metrics.medianaPorCliente)} /><Metric label="Mínimo" value={n(metrics.minimoPorCliente)} /><Metric label="Máximo" value={n(metrics.maximoPorCliente)} /><Metric label="Desvio padrão" value={n(metrics.desvioPadraoPorCliente)} hint="Desvio populacional dos totais por cliente" /><Metric label="Média diária/semanal" value="Indisponível" hint="Sem campo DATA no schema" /></div>
          <Card className="mt-4"><CardHeader><CardTitle>Categorias derivadas numericamente</CardTitle><p className="text-sm text-muted-foreground">Estável: variação absoluta percentual até 5%; crescimento: acima de 5%; alto crescimento: a partir de 50%; redução: abaixo de -5%; novo: A=0/B&gt;0; sem produção recente: A&gt;0/B=0.</p></CardHeader><CardContent><DataTable columns={["Cliente", "A", "B", "Diferença", "Variação", "Categoria"]} rows={comparison.classificacaoCrescimento.map(item => [item.nome, n(item.periodoA), n(item.periodoB), n(item.diferencaAbsoluta), pct(item.diferencaPercentual), item.categoria.replaceAll("_", " ")])} /></CardContent></Card>
        </>
      );
    }

    if (section === "rankings") {
      return (
        <>
          <SectionTitle title="Rankings configuráveis" description="Escolha entidade e métrica; quando os períodos A e B estão configurados, crescimento e redução usam essa comparação." />
          <div data-print-ui className="mb-4 flex flex-wrap gap-3"><label className="text-xs text-muted-foreground">Entidade<select className="ml-2 h-9 rounded-md border bg-background px-2 text-sm" value={rankingEntity} onChange={event => setRankingEntity(event.target.value as typeof rankingEntity)}><option value="clientes">Clientes</option><option value="tipos">Tipos</option></select></label><label className="text-xs text-muted-foreground">Métrica<select className="ml-2 h-9 rounded-md border bg-background px-2 text-sm" value={rankingMetric} onChange={event => setRankingMetric(event.target.value as typeof rankingMetric)}><option value="total">Volume total</option><option value="crescimentoAbs">Maior aumento absoluto</option><option value="crescimentoPct">Maior aumento percentual</option><option value="reducaoAbs">Maior redução absoluta</option><option value="reducaoPct">Maior redução percentual</option></select></label></div>
          <div className="grid gap-4 xl:grid-cols-2"><ChartCard title="Ranking em barras"><ResponsiveContainer width="100%" height="100%"><BarChart data={ranking.slice(0, 10)} layout="vertical" margin={{ left: 70 }}><CartesianGrid strokeDasharray="3 3" opacity={0.25} /><XAxis type="number" /><YAxis type="category" dataKey="nome" width={130} fontSize={10} /><Tooltip /><Bar dataKey={rankingMetric === "total" ? "total" : rankingMetric.endsWith("Pct") ? "percentual" : "crescimento"} fill={rankingMetric.startsWith("reducao") ? "#ef4444" : "#2563eb"} /></BarChart></ResponsiveContainer></ChartCard><Card><CardHeader><CardTitle>Classificação completa</CardTitle></CardHeader><CardContent><DataTable columns={["Posição", rankingEntity === "clientes" ? "Cliente" : "Tipo", "Total", "Variação absoluta", "Variação percentual"]} rows={ranking.map((item, index) => [index + 1, item.nome, n(item.total), n(item.crescimento), pct(item.percentual)])} minWidth={620} /></CardContent></Card></div>
        </>
      );
    }

    if (section === "historico") {
      const heatMax = Math.max(1, ...data.analiseClientes.flatMap(item => item.evolucaoMensal.map(point => point.quantidade)));
      return (
        <>
          <SectionTitle title="Histórico completo" description="Todos os anos disponíveis, evolução cliente+tipo e heatmap mensal de intensidade." />
          <Card><CardHeader><CardTitle>Heatmap cliente × período</CardTitle></CardHeader><CardContent><div className="overflow-x-auto"><table className="min-w-[900px] text-xs"><thead><tr><th className="p-2 text-left">Cliente</th>{data.evolucaoAcumulada.map(point => <th key={point.periodo} className="p-2 text-center">{point.mes.slice(0, 3)}/{String(point.ano).slice(-2)}</th>)}</tr></thead><tbody>{data.analiseClientes.map(item => <tr key={item.cliente}><td className="whitespace-nowrap p-2 font-medium">{item.cliente}</td>{data.evolucaoAcumulada.map(period => { const value = item.evolucaoMensal.find(point => point.ano === period.ano && point.mes === period.mes)?.quantidade ?? 0; const opacity = value ? 0.15 + (value / heatMax) * 0.85 : 0.04; return <td key={period.periodo} className="p-1"><div title={`${item.cliente} · ${period.periodo}: ${n(value)}`} className="flex h-9 min-w-14 items-center justify-center rounded text-[10px]" style={{ backgroundColor: `rgba(37,99,235,${opacity})`, color: opacity > 0.55 ? "white" : "inherit" }}>{value ? n(value) : "—"}</div></td>; })}</tr>)}</tbody></table></div></CardContent></Card>
          <Card className="mt-4"><CardHeader><CardTitle>Evolução anual por cliente</CardTitle></CardHeader><CardContent><DataTable columns={["Cliente", "Ano", "Produção"]} rows={data.analiseClientes.flatMap(item => item.evolucaoAnual.map(year => [item.cliente, year.ano, n(year.quantidade)]))} /></CardContent></Card>
        </>
      );
    }

    if (section === "relatorios") {
      return (
        <>
          <SectionTitle title="Relatório" description="Modo de configuração do documento profissional e narrativa determinística baseada somente nos dados." />
          <Card><CardHeader><CardTitle>Opções do relatório</CardTitle></CardHeader><CardContent className="space-y-4"><div data-print-ui className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(reportOptions).map(([key, checked]) => <label key={key} className="flex items-center gap-2 rounded-md border p-3 text-sm"><input type="checkbox" checked={checked} onChange={() => onReportOptionsChange({ ...reportOptions, [key]: !checked })} />{({ incluirGraficos: "Incluir gráficos", incluirTabelas: "Incluir tabelas", incluirTexto: "Incluir análise textual", incluirDetalhesClientes: "Incluir detalhes por cliente", incluirComparacao: "Incluir comparação A × B" } as Record<string, string>)[key]}</label>)}</div><Button data-print-ui onClick={onExportPdf}><FileText className="mr-2 h-4 w-4" />Gerar relatório PDF profissional</Button></CardContent></Card>
          <Card className="mt-4"><CardHeader><CardTitle>Relatório descritivo automático</CardTitle></CardHeader><CardContent><blockquote className="rounded-lg border-l-4 border-primary bg-primary/5 p-5 text-sm leading-7 text-foreground">{data.relatorioDeterministico}</blockquote></CardContent></Card>
        </>
      );
    }

    return (
      <>
        <SectionTitle title="Exportação" description="Todos os arquivos usam exatamente o mesmo recorte dos filtros globais e as opções do relatório." />
        <div data-print-ui className="grid gap-4 md:grid-cols-3"><button onClick={onExportPdf} className="rounded-xl border bg-card p-6 text-left shadow-sm hover:border-primary/50"><FileText className="h-7 w-7 text-primary" /><h3 className="mt-4 font-semibold">PDF profissional</h3><p className="mt-1 text-sm text-muted-foreground">Capa, resumo, evolução, clientes, tipos, comparação, detalhes e conclusões estatísticas.</p></button><button onClick={onExportCsv} className="rounded-xl border bg-card p-6 text-left shadow-sm hover:border-primary/50"><TableProperties className="h-7 w-7 text-primary" /><h3 className="mt-4 font-semibold">CSV</h3><p className="mt-1 text-sm text-muted-foreground">Registros filtrados em UTF-8, separados por ponto e vírgula.</p></button><button onClick={onExportExcel} className="rounded-xl border bg-card p-6 text-left shadow-sm hover:border-primary/50"><BarChart3 className="h-7 w-7 text-primary" /><h3 className="mt-4 font-semibold">Excel compatível</h3><p className="mt-1 text-sm text-muted-foreground">CSV UTF-8 com extensão .xls para abertura direta no Excel.</p></button></div>
      </>
    );
  })();

  return (
    <section id="bi-workspace" className="scroll-mt-5">
      <div data-print-ui className="mb-5 overflow-x-auto rounded-xl border border-border/70 bg-card p-2 shadow-sm">
        <nav className="flex min-w-max gap-1" aria-label="Áreas do BI">
          {NAV_ITEMS.map(([id, label, Icon]) => (
            <button key={id} onClick={() => setSection(id)} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${section === id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </nav>
      </div>
      <div data-print-ui className="mb-5 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Filtros ativos:</span> {filterDescription}
      </div>
      <div id={section} className="scroll-mt-5" data-print-block>{content}</div>
    </section>
  );
}
