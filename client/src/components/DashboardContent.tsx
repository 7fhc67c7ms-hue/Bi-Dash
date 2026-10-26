import { useEffect, useMemo, useState } from "react";
import { User } from "@shared/types";
import type { ClientFilterMode } from "@shared/clientFilters";
import type { PeriodSelection } from "@shared/analytics";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2,
  Upload,
  LogOut,
  RefreshCw,
  Database,
  History,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import PDFUploader from "./PDFUploader";
import MonthSelector from "./MonthSelector";
import KPICards from "./KPICards";
import ProductionTable from "./ProductionTable";
import ProductionRecords from "./ProductionRecords";
import AdvancedMetrics from "./AdvancedMetrics";
import MarketInsights from "./MarketInsights";
import RankingSection from "./RankingSection";
import ChartsSection from "./ChartsSection";
import ProductionAnalysisTabs from "./ProductionAnalysisTabs";
import ExecutiveAnalyticsTabs from "./ExecutiveAnalyticsTabs";
import ClientFilterSelector from "./ClientFilterSelector";
import {
  downloadProductionAnalysisPdf,
  downloadRenderedAnalysisPdf,
} from "@/lib/analysisPdf";
import { describeClientFilter } from "@/lib/clientFilterLabel";
import BIWorkspace from "./BIWorkspace";
import StockManagement from "./StockManagement";
import CostsManagement from "./CostsManagement";
import CustomerCoverage from "./CustomerCoverage";
import ClientProductionAnalysis from "./ClientProductionAnalysis";
import ProductionAssistant from "./ProductionAssistant";
import MasterDataManagement from "./MasterDataManagement";
import FormulaManagement from "./FormulaManagement";

interface DashboardContentProps {
  user: User | null;
}

export default function DashboardContent({ user }: DashboardContentProps) {
  const [analysisMode, setAnalysisMode] = useState<"EXPLORAR" | "RELATORIO">(
    "EXPLORAR"
  );
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [clientFilterMode, setClientFilterMode] =
    useState<ClientFilterMode>("INCLUIR");
  const [selectedPlate, setSelectedPlate] = useState("");
  const [selectedPlates, setSelectedPlates] = useState<string[]>([]);
  const [category, setCategory] = useState<"TODOS" | "OBRAS" | "COMUNS">(
    "TODOS"
  );
  const [periodoA, setPeriodoA] = useState<PeriodSelection>();
  const [periodoB, setPeriodoB] = useState<PeriodSelection>();
  const [showUploader, setShowUploader] = useState(false);
  const [showRecords, setShowRecords] = useState(false);
  const [showUploads, setShowUploads] = useState(false);
  const [reportOptions, setReportOptions] = useState({
    incluirGraficos: true,
    incluirTabelas: true,
    incluirTexto: true,
    incluirDetalhesClientes: true,
    incluirComparacao: true,
  });
  const [activeModule, setActiveModule] = useState<"PRODUCAO" | "ESTOQUE" | "CLIENTE" | "CUSTOS" | "COBERTURA" | "CADASTROS" | "FICHAS">("PRODUCAO");

  useEffect(() => {
    const navigateModule = (event: Event) => {
      const destination = (event as CustomEvent<string>).detail;
      if (destination === "custos") setActiveModule("CUSTOS");
      if (destination === "cobertura") setActiveModule("COBERTURA");
      if (destination === "cadastros") setActiveModule("CADASTROS");
      if (destination === "fichas") setActiveModule("FICHAS");
    };
    window.addEventListener("bi:navigate", navigateModule);
    return () => window.removeEventListener("bi:navigate", navigateModule);
  }, []);

  const queryInput = useMemo(
    () => ({
      months: selectedMonths.length > 0 ? selectedMonths : undefined,
      years: selectedYears.length > 0 ? selectedYears : undefined,
      selectedClients,
      clientFilterMode,
      tipoPlaca: selectedPlates.length === 0 ? selectedPlate || undefined : undefined,
      tiposPlaca: selectedPlates.length > 0 ? selectedPlates : undefined,
      categoria: category,
      periodoA,
      periodoB,
    }),
    [
      selectedMonths,
      selectedYears,
      selectedClients,
      clientFilterMode,
      selectedPlate,
      selectedPlates,
      category,
      periodoA,
      periodoB,
    ]
  );

  const analyticsQuery = trpc.production.getAnalytics.useQuery(queryInput);
  const recordsQuery = trpc.production.getData.useQuery(queryInput);
  const uploadsQuery = trpc.production.listUploads.useQuery(undefined, {
    enabled: showUploads,
  });
  const utils = trpc.useUtils();
  const logoutMutation = trpc.auth.logout.useMutation();

  const invalidateDashboard = () => {
    void utils.production.getAnalytics.invalidate();
    void utils.production.getData.invalidate();
    void utils.production.listUploads.invalidate();
  };

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    window.location.href = "/";
  };

  const clearFilters = () => {
    setSelectedMonths([]);
    setSelectedYears([]);
    setSelectedClients([]);
    setClientFilterMode("INCLUIR");
    setSelectedPlate("");
    setSelectedPlates([]);
    setCategory("TODOS");
  };

  const analyticsData = analyticsQuery.data;
  useEffect(() => {
    const available = analyticsData?.periodosDisponiveis ?? [];
    if (available.length < 2) return;
    const years = Array.from(new Set(available.map(item => item.ano))).sort(
      (a, b) => a - b
    );
    if (!periodoA) {
      const first = available[0];
      setPeriodoA(
        years.length > 1
          ? { ano: years[0], mesInicio: "JANEIRO", mesFim: "DEZEMBRO" }
          : { ano: first.ano, mesInicio: first.mes, mesFim: first.mes }
      );
    }
    if (!periodoB) {
      const last = available.at(-1)!;
      setPeriodoB(
        years.length > 1
          ? { ano: years.at(-1)!, mesInicio: "JANEIRO", mesFim: "DEZEMBRO" }
          : { ano: last.ano, mesInicio: last.mes, mesFim: last.mes }
      );
    }
  }, [analyticsData?.periodosDisponiveis, periodoA, periodoB]);
  const hasData = Boolean(analyticsData && analyticsData.totalRegistros > 0);
  const formatPeriod = (period?: PeriodSelection) =>
    period ? `${period.mesInicio}–${period.mesFim}/${period.ano}` : "não definido";
  const filterDescription = [
    describeClientFilter({ mode: clientFilterMode, clients: selectedClients }),
    `Meses: ${selectedMonths.length ? selectedMonths.join(", ") : "todos"}`,
    `Anos: ${selectedYears.length ? selectedYears.join(", ") : "todos"}`,
    `Tipos: ${selectedPlates.length ? selectedPlates.join(", ") : selectedPlate || "todos"}`,
    `Segmento: ${category === "TODOS" ? "todos" : category === "OBRAS" ? "obras" : "comuns"}`,
    `Período A: ${formatPeriod(periodoA)}`,
    `Período B: ${formatPeriod(periodoB)}`,
  ].join(" · ");

  const exportOperationalReport = () => {
    if (!analyticsData) return;
    const esc = (value: unknown) =>
      String(value ?? "").replace(
        /[&<>\"']/g,
        char =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[char] ?? char
      );
    const rows = analyticsData.tabelaProducao
      .map(
        row =>
          `<tr><td>${esc(row.cliente)}</td><td>${row.itens.map(item => `${esc(item.tipoPlaca)} (${item.quantidade})`).join("<br>")}</td><td>${row.total.toLocaleString("pt-BR")}</td></tr>`
      )
      .join("");
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório operacional de produção</title><style>body{font-family:Arial,sans-serif;color:#172033;margin:40px;line-height:1.5}h1{color:#0f766e}table{border-collapse:collapse;width:100%;margin-top:20px}th,td{border:1px solid #d9e1ea;padding:10px;text-align:left}th{background:#eef4f7}.kpis{display:flex;gap:16px;flex-wrap:wrap}.kpi{border:1px solid #d9e1ea;border-radius:10px;padding:12px 16px;min-width:150px}.label{font-size:12px;color:#64748b}.value{font-size:22px;font-weight:bold}</style></head><body><h1>Relatório operacional · Produção</h1><p>Gerado em ${new Date().toLocaleString("pt-BR")} · Período: ${esc(selectedMonths.length ? selectedMonths.join(", ") : "todos os meses")} · ${esc(filterDescription)}</p><div class="kpis"><div class="kpi"><div class="label">Produção total</div><div class="value">${analyticsData.kpis.totalProducao.toLocaleString("pt-BR")}</div></div><div class="kpi"><div class="label">Pedidos</div><div class="value">${analyticsData.kpis.numeroPedidos}</div></div><div class="kpi"><div class="label">Ticket médio</div><div class="value">${analyticsData.kpis.ticketMedio.toLocaleString("pt-BR")}</div></div><div class="kpi"><div class="label">Produto estrela</div><div class="value">${esc(analyticsData.kpis.produtoEstrela)}</div></div></div><h2>Produção por cliente</h2><table><thead><tr><th>Cliente</th><th>Itens</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table><h2>Notas de leitura</h2><p>Clientes de obras representam ${analyticsData.metricasAvancadas.participacaoObras.toLocaleString("pt-BR")}% do volume; os cinco maiores clientes representam ${analyticsData.metricasAvancadas.participacaoTop5Clientes.toLocaleString("pt-BR")}%. Estes indicadores ajudam a acompanhar dependência comercial e oportunidade de diversificação.</p></body></html>`;
    const url = URL.createObjectURL(
      new Blob([html], { type: "text/html;charset=utf-8" })
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `relatorio-operacional-${new Date().toISOString().slice(0, 10)}.html`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    const records = recordsQuery.data ?? [];
    const header = [
      "ROMANEIO",
      "CLIENTE",
      "TIPO DE PLACA",
      "QUANTIDADE",
      "MÊS",
      "ANO",
    ];
    const lines = records.map(record => [
      record.romaneio ?? "",
      record.cliente,
      record.tipoPlaca,
      String(record.quantidade),
      record.mes,
      String(record.ano),
    ]);
    const csv = [header, ...lines]
      .map(line =>
        line.map(value => `"${value.replaceAll('"', '""')}"`).join(";")
      )
      .join("\n");
    const blob = new Blob(["\\ufeff" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `producao-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = async () => {
    if (!analyticsData) return;
    try {
      toast.info("Preparando PDF profissional da análise atual…");
      downloadProductionAnalysisPdf({
        title: "RELATÓRIO DE PRODUÇÃO",
        subtitle: "Análise executiva e operacional",
        filterDescription,
        fileName: `relatorio-${analysisMode.toLowerCase()}`,
        data: analyticsData,
        options: reportOptions,
      });
      toast.success("PDF gerado com sucesso");
    } catch (error) {
      console.error("Falha ao gerar PDF profissional", error);
      try {
        const element = document.getElementById("bi-workspace");
        if (!element) throw new Error("Análise visível não encontrada");
        toast.info("Gerando alternativa visual do PDF…");
        await downloadRenderedAnalysisPdf({
          element,
          fileName: `relatorio-${analysisMode.toLowerCase()}`,
        });
        toast.success("PDF visual gerado com sucesso");
      } catch (fallbackError) {
        console.error("Falha também na alternativa visual", fallbackError);
        toast.error("Não foi possível gerar o PDF. Verifique os dados e tente novamente.");
      }
    }
  };

  const exportExcel = () => {
    const records = recordsQuery.data ?? [];
    const rows = [
      ["ROMANEIO", "CLIENTE", "TIPO DE PLACA", "QUANTIDADE", "MÊS", "ANO"],
      ...records.map(record => [
        record.romaneio ?? "",
        record.cliente,
        record.tipoPlaca,
        String(record.quantidade),
        record.mes,
        String(record.ano),
      ]),
    ];
    const csv = rows
      .map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(";"))
      .join("\n");
    const url = URL.createObjectURL(
      new Blob(["\ufeff" + csv], { type: "application/vnd.ms-excel;charset=utf-8" })
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `producao-excel-${new Date().toISOString().slice(0, 10)}.xls`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background/80 p-4 sm:p-6 lg:p-10">
      <div className="mx-auto max-w-[1600px]">
        <header data-print-block className="mb-8 flex flex-col gap-6 border-b border-border/70 pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
              <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_14px_rgba(15,118,110,0.55)]" />
              Centro de operações · visão geral
            </div>
            <h1 className="bi-shell-title text-3xl font-semibold text-foreground md:text-4xl">
              Dashboard de Produção
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Fotoporcelanas, placas memoriais e produção por cliente num único
              painel de decisão.
            </p>
          </div>
          <div data-print-ui className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary">
              {user?.name || user?.email}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => analyticsQuery.refetch()}
              disabled={analyticsQuery.isFetching}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${analyticsQuery.isFetching ? "animate-spin" : ""}`}
              />
              Atualizar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </header>

        <section
          id="visao-geral"
          data-print-block
          className="mb-8 scroll-mt-6 grid gap-4 md:grid-cols-3"
        >
          <Card className="border-primary/20 bg-primary/5 shadow-lg shadow-primary/5 md:col-span-2">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  Entrada de dados
                </p>
                <h2 className="mt-1 text-lg font-semibold text-foreground">
                  Importe um romaneio e transforme-o em análise
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  PDF até 15 MB · extração assistida por IA · deduplicação por
                  ficheiro
                </p>
              </div>
              <Button
                onClick={() => setShowUploader(value => !value)}
                className="shrink-0 bg-primary text-primary-foreground"
              >
                <Upload className="mr-2 h-4 w-4" />
                {showUploader ? "Fechar importação" : "Importar PDF"}
              </Button>
            </CardContent>
          </Card>
          <Card className="border-border/70 bg-card/80 shadow-lg">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-[0.16em]">
                  Sinal de negócio
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Use o mix, a concentração e a evolução mensal para priorizar
                clientes recorrentes e reduzir dependência de poucos
                compradores.
              </p>
            </CardContent>
          </Card>
        </section>

        {showUploader && (
          <div className="mb-8" data-print-block>
            <PDFUploader onSuccess={invalidateDashboard} />
          </div>
        )}

        <section data-print-ui className="mb-8 space-y-4" aria-label="Filtros do dashboard">
          <Card className="border-primary/20 bg-primary/5 shadow-sm">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  Modo de trabalho
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Explorar atualiza todo o BI; Relatório prepara as seções e exportações.
                </p>
              </div>
              <div className="flex rounded-lg border bg-background p-1">
                <Button size="sm" variant={analysisMode === "EXPLORAR" ? "default" : "ghost"} onClick={() => setAnalysisMode("EXPLORAR")}>
                  Explorar
                </Button>
                <Button size="sm" variant={analysisMode === "RELATORIO" ? "default" : "ghost"} onClick={() => setAnalysisMode("RELATORIO")}>
                  Relatório
                </Button>
              </div>
            </CardContent>
          </Card>
          <MonthSelector
            selectedMonths={selectedMonths}
            onMonthsChange={setSelectedMonths}
          />
          <ClientFilterSelector
            clients={analyticsData?.clientes ?? []}
            selectedClients={selectedClients}
            mode={clientFilterMode}
            onSelectedClientsChange={setSelectedClients}
            onModeChange={setClientFilterMode}
          />
          <Card className="border-border/70 bg-card/80 shadow-lg">
            <CardContent className="space-y-4 p-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Ano (seleção múltipla)</p>
                  <div className="mt-1 flex min-h-10 flex-wrap gap-2 rounded-md border p-2">
                    {Array.from(new Set((analyticsData?.periodosDisponiveis ?? []).map(item => item.ano))).sort((a, b) => a - b).map(year => (
                      <label key={year} className="flex items-center gap-2 rounded border px-2 py-1 text-sm">
                        <input type="checkbox" checked={selectedYears.includes(year)} onChange={() => setSelectedYears(current => current.includes(year) ? current.filter(item => item !== year) : [...current, year])} />
                        {year}
                      </label>
                    ))}
                  </div>
                </div>
              <label className="flex-1 space-y-1 text-xs font-medium text-muted-foreground">
                Tipo de placa (seleção rápida)
                <select
                  value={selectedPlate}
                  onChange={event => setSelectedPlate(event.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Todos os modelos</option>
                  {analyticsData?.tiposPlaca.map(plate => (
                    <option key={plate} value={plate}>
                      {plate}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex-1 space-y-1 text-xs font-medium text-muted-foreground">
                Segmento
                <select
                  value={category}
                  onChange={event =>
                    setCategory(event.target.value as typeof category)
                  }
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="TODOS">Todos</option>
                  <option value="COMUNS">Clientes comuns</option>
                  <option value="OBRAS">Clientes de obras</option>
                </select>
              </label>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Tipos de placa (seleção múltipla)</p>
                <div className="mt-1 grid max-h-32 gap-2 overflow-y-auto rounded-md border p-2 sm:grid-cols-2 lg:grid-cols-3">
                  {analyticsData?.tiposPlaca.map(plate => (
                    <label key={plate} className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={selectedPlates.includes(plate)} onChange={() => setSelectedPlates(current => current.includes(plate) ? current.filter(item => item !== plate) : [...current, plate])} />
                      <span className="truncate" title={plate}>{plate}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2">
                  <Button variant="outline" disabled title="Indisponível: schema sem DATA diária">Dia</Button>
                  <Button variant="outline" disabled title="Indisponível: schema sem DATA diária">Semana</Button>
                  <span className="self-center text-xs text-muted-foreground">Mês · trimestre · semestre · ano · personalizado via seleções acima</span>
                </div>
                <Button variant="outline" onClick={clearFilters}>Limpar filtros</Button>
              </div>
              <p className="text-xs text-muted-foreground">Dia e semana estão desabilitados porque o schema real contém ANO e MÊS, mas não DATA diária.</p>
            </CardContent>
          </Card>
        </section>

        <div data-print-ui className="mb-8 flex flex-wrap gap-1.5 rounded-2xl border border-border/70 bg-card/80 p-2 shadow-sm backdrop-blur" aria-label="Módulos do sistema">
          <Button variant={activeModule === "PRODUCAO" ? "default" : "ghost"} onClick={() => setActiveModule("PRODUCAO")}>Controle principal de produção</Button>
          <Button variant={activeModule === "ESTOQUE" ? "default" : "ghost"} onClick={() => setActiveModule("ESTOQUE")}>Controle de estoque</Button>
          <Button variant={activeModule === "CLIENTE" ? "default" : "ghost"} onClick={() => setActiveModule("CLIENTE")}>Análise por cliente</Button>
          <Button variant={activeModule === "CUSTOS" ? "default" : "ghost"} onClick={() => setActiveModule("CUSTOS")}>Preços e custos</Button>
          <Button variant={activeModule === "COBERTURA" ? "default" : "ghost"} onClick={() => setActiveModule("COBERTURA")}>Mapa de clientes</Button>
          <Button variant={activeModule === "CADASTROS" ? "default" : "ghost"} onClick={() => setActiveModule("CADASTROS")}>Cadastros mestres</Button>
          <Button variant={activeModule === "FICHAS" ? "default" : "ghost"} onClick={() => setActiveModule("FICHAS")}>Fichas técnicas</Button>
        </div>

        {analyticsQuery.isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : analyticsQuery.isError ? (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="p-6">
              <p className="font-medium text-destructive">
                Não foi possível carregar o dashboard.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Verifique a ligação à base de dados e tente atualizar. O sistema
                não deve ocultar um erro de origem.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => analyticsQuery.refetch()}
              >
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        ) : analyticsData ? (
          activeModule === "FICHAS" ? (
            <FormulaManagement />
          ) : activeModule === "CADASTROS" ? (
            <MasterDataManagement />
          ) : activeModule === "ESTOQUE" ? (
            <StockManagement tiposPlaca={analyticsData.tiposPlaca} />
          ) : activeModule === "CUSTOS" ? (
            <div id="custos" className="scroll-mt-6"><CostsManagement tiposPlaca={analyticsData.tiposPlaca} /></div>
          ) : activeModule === "COBERTURA" ? (
            <div id="cobertura" className="scroll-mt-6"><CustomerCoverage /></div>
          ) : activeModule === "CLIENTE" ? (
            <div data-print-block><ClientProductionAnalysis clientes={analyticsData.clientes} /></div>
          ) : (
          <div className="space-y-8" data-print-block>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">
                  Período selecionado
                </p>
                <p className="font-medium text-foreground">
                  {selectedMonths.length
                    ? selectedMonths.join(" · ")
                    : "Todos os meses disponíveis"}{" "}
                  · {analyticsData.totalRegistros} linhas
                </p>
                <p className="text-xs text-muted-foreground">
                  {filterDescription}
                </p>
              </div>
              <div data-print-ui className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={exportPdf}
                  disabled={!analyticsData}
                >
                  Gerar PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={exportOperationalReport}
                  disabled={!analyticsData}
                >
                  Relatório HTML
                </Button>
                <Button
                  variant="outline"
                  onClick={exportCsv}
                  disabled={!recordsQuery.data?.length}
                >
                  Exportar CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={exportExcel}
                  disabled={!recordsQuery.data?.length}
                >
                  Excel compatível
                </Button>
                <Button
                  id="toggle-data-manager"
                  variant="outline"
                  onClick={() => setShowRecords(value => !value)}
                >
                  <Database className="mr-2 h-4 w-4" />
                  {showRecords ? "Fechar gestão de dados" : "Gerir registros"}
                </Button>
              </div>
            </div>
            <BIWorkspace
              data={analyticsData}
              periodoA={periodoA}
              periodoB={periodoB}
              onPeriodoAChange={setPeriodoA}
              onPeriodoBChange={setPeriodoB}
              onExportPdf={exportPdf}
              onExportCsv={exportCsv}
              onExportExcel={exportExcel}
              filterDescription={filterDescription}
              reportOptions={reportOptions}
              onReportOptionsChange={setReportOptions}
              analysisMode={analysisMode}
            />
            <ProductionAssistant data={{ ...analyticsData, totalRegistros: analyticsData.totalRegistros, clientes: analyticsData.clientes, tiposPlaca: analyticsData.tiposPlaca }} filterDescription={filterDescription} />
            <MarketInsights />
            {showRecords && (
              <div id="dados" className="scroll-mt-6">
                <ProductionRecords
                  months={selectedMonths}
                  selectedClients={selectedClients}
                  clientFilterMode={clientFilterMode}
                  onChanged={invalidateDashboard}
                />
              </div>
            )}
            <Card
              id="importacoes"
              className="scroll-mt-6 border-border/70 bg-card/80 shadow-lg"
            >
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <History className="h-5 w-5 text-primary" />
                  Histórico de importações
                </CardTitle>
                <Button
                  data-print-ui
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUploads(value => !value)}
                >
                  {showUploads ? "Ocultar" : "Ver histórico"}
                </Button>
              </CardHeader>
              {showUploads && (
                <CardContent>
                  {uploadsQuery.isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : uploadsQuery.data?.length ? (
                    <div className="space-y-2">
                      {uploadsQuery.data.map(upload => (
                        <div
                          key={upload.id}
                          className="flex flex-col gap-2 rounded-lg border border-border/60 bg-background/50 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="font-medium text-foreground">
                              {upload.fileName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(upload.createdAt).toLocaleString(
                                "pt-BR"
                              )}{" "}
                              · {upload.rowsExtracted} válidos ·{" "}
                              {upload.rowsRejected} rejeitados ·{" "}
                              {upload.duplicatesAvoided} duplicados evitados
                            </p>
                          </div>
                          <span
                            className={`w-fit rounded-full px-2 py-1 text-xs ${upload.status === "completed" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : upload.status === "failed" ? "bg-destructive/15 text-destructive" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"}`}
                          >
                            {upload.status === "completed"
                              ? "Concluído"
                              : upload.status === "failed"
                                ? "Falhou"
                                : "A processar"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Ainda não existem importações registadas.
                    </p>
                  )}
                </CardContent>
              )}
            </Card>
          </div>
          )
        ) : (
          <Card>
            <CardContent className="p-10 text-center">
              <p className="font-medium text-foreground">
                Nenhum dado disponível.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Importe o primeiro romaneio para começar a análise.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
