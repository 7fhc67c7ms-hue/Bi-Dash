import {
  BarChart3,
  FileText,
  GitCompareArrows,
  Layers3,
  UsersRound,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ProductionAnalysisReportData } from "@/lib/analysisPdf";
import type { PeriodSelection } from "@shared/analytics";

const MESES = [
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

const formatNumber = (value: number) => value.toLocaleString("pt-BR");
const formatPercent = (value: number | null) =>
  value === null ? "—" : `${value.toLocaleString("pt-BR")} %`;
const signClass = (value: number) =>
  value >= 0
    ? "text-emerald-600 dark:text-emerald-300"
    : "text-rose-600 dark:text-rose-300";

function EmptyState({ message }: { message: string }) {
  return (
    <p className="py-8 text-center text-sm text-muted-foreground">{message}</p>
  );
}

function PeriodField({
  label,
  value,
  years,
  onChange,
}: {
  label: string;
  value?: PeriodSelection;
  years: number[];
  onChange: (value: PeriodSelection) => void;
}) {
  if (!value)
    return (
      <p className="text-xs text-muted-foreground">
        {label}: período indisponível
      </p>
    );
  return (
    <fieldset className="min-w-0 flex-1 space-y-2 rounded-lg border border-border/60 p-3">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </legend>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="space-y-1 text-xs text-muted-foreground">
          Ano
          <select
            value={value.ano}
            onChange={event =>
              onChange({ ...value, ano: Number(event.target.value) })
            }
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground"
          >
            {years.map(year => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          Mês inicial
          <select
            value={value.mesInicio}
            onChange={event =>
              onChange({ ...value, mesInicio: event.target.value })
            }
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground"
          >
            {MESES.map(month => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          Mês final
          <select
            value={value.mesFim}
            onChange={event =>
              onChange({ ...value, mesFim: event.target.value })
            }
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground"
          >
            {MESES.map(month => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
        </label>
      </div>
    </fieldset>
  );
}

interface ExecutiveAnalyticsTabsProps {
  data: ProductionAnalysisReportData & {
    periodosDisponiveis: Array<{ ano: number; mes: string }>;
  };
  periodoA?: PeriodSelection;
  periodoB?: PeriodSelection;
  onPeriodoAChange: (value: PeriodSelection) => void;
  onPeriodoBChange: (value: PeriodSelection) => void;
  filterDescription?: string;
}

export default function ExecutiveAnalyticsTabs({
  data,
  periodoA,
  periodoB,
  onPeriodoAChange,
  onPeriodoBChange,
  filterDescription,
}: ExecutiveAnalyticsTabsProps) {
  const years = Array.from(
    new Set(data.periodosDisponiveis.map(item => item.ano))
  ).sort((a, b) => a - b);
  const metrics = data.metricasExecutivas;
  const comparison = data.comparacaoPeriodos;
  const hasClients = data.analiseClientes.length > 0;
  const hasTypes = data.analiseTipos.length > 0;

  return (
    <section
      aria-label="Análises executivas e comparação de períodos"
      className="space-y-4"
    >
      <Tabs defaultValue="executivo" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 bg-card/80 p-1 sm:grid-cols-3 lg:grid-cols-5">
          <TabsTrigger value="executivo" className="min-h-10">
            <BarChart3 className="h-4 w-4" />
            Executivo
          </TabsTrigger>
          <TabsTrigger value="clientes" className="min-h-10">
            <UsersRound className="h-4 w-4" />
            Clientes
          </TabsTrigger>
          <TabsTrigger value="tipos" className="min-h-10">
            <Layers3 className="h-4 w-4" />
            Tipos de placa
          </TabsTrigger>
          <TabsTrigger value="periodos" className="min-h-10">
            <GitCompareArrows className="h-4 w-4" />
            Períodos A × B
          </TabsTrigger>
          <TabsTrigger value="relatorio" className="min-h-10">
            <FileText className="h-4 w-4" />
            Relatório
          </TabsTrigger>
        </TabsList>

        <TabsContent value="executivo" className="mt-4">
          <Card className="border-border/70 bg-card/80 shadow-lg">
            <CardHeader>
              <CardTitle className="text-foreground">
                Métricas executivas
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Estatísticas derivadas somente dos registros filtrados.{" "}
                {filterDescription}
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {[
                  ["Produção total", formatNumber(metrics.totalProducao)],
                  ["Clientes", formatNumber(metrics.totalClientes)],
                  ["Média por cliente", formatNumber(metrics.mediaPorCliente)],
                  [
                    "Mediana por cliente",
                    formatNumber(metrics.medianaPorCliente),
                  ],
                  [
                    "Mínimo por cliente",
                    formatNumber(metrics.minimoPorCliente),
                  ],
                  [
                    "Máximo por cliente",
                    formatNumber(metrics.maximoPorCliente),
                  ],
                  [
                    "Desvio padrão",
                    formatNumber(metrics.desvioPadraoPorCliente),
                  ],
                  ["Média mensal", formatNumber(metrics.mediaMensal)],
                  ["Média por tipo", formatNumber(metrics.mediaPorTipo)],
                  [
                    "Meses com produção",
                    formatNumber(metrics.mesesComProducao),
                  ],
                  [
                    "Dias de produção",
                    metrics.dadosDiariosDisponiveis
                      ? formatNumber(metrics.diasProducao ?? 0)
                      : "Não disponível",
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-lg border border-border/60 bg-background/40 p-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {label}
                    </p>
                    <p className="mt-2 text-xl font-semibold text-foreground">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
              {!metrics.dadosDiariosDisponiveis && (
                <p className="mt-4 text-xs text-muted-foreground">
                  Dias com e sem produção não são calculados porque o schema
                  atual possui apenas mês e ano, sem data diária.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clientes" className="mt-4">
          <Card className="border-border/70 bg-card/80 shadow-lg">
            <CardHeader>
              <CardTitle className="text-foreground">
                Análise independente por cliente
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Mix, concentração, média mensal e evolução dos clientes no
                filtro atual.
              </p>
            </CardHeader>
            <CardContent>
              {!hasClients ? (
                <EmptyState message="Nenhum cliente disponível no recorte atual." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-3 py-3">Cliente</th>
                        <th className="px-3 py-3 text-right">Total</th>
                        <th className="px-3 py-3 text-right">Tipos</th>
                        <th className="px-3 py-3">Mais produzido</th>
                        <th className="px-3 py-3">Menos produzido</th>
                        <th className="px-3 py-3 text-right">Média/tipo</th>
                        <th className="px-3 py-3 text-right">Participação</th>
                        <th className="px-3 py-3 text-right">Média/mês</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.analiseClientes.map(item => (
                        <tr
                          key={item.cliente}
                          className="border-b border-border/60 hover:bg-muted/40"
                        >
                          <td className="px-3 py-3 font-medium text-foreground">
                            {item.cliente}
                          </td>
                          <td className="px-3 py-3 text-right text-foreground">
                            {formatNumber(item.total)}
                          </td>
                          <td className="px-3 py-3 text-right text-muted-foreground">
                            {formatNumber(item.tipos)}
                          </td>
                          <td className="px-3 py-3 text-foreground">
                            {item.tipoMaisProduzido}
                          </td>
                          <td className="px-3 py-3 text-muted-foreground">
                            {item.tipoMenosProduzido}
                          </td>
                          <td className="px-3 py-3 text-right text-muted-foreground">
                            {formatNumber(item.mediaPorTipo)}
                          </td>
                          <td className="px-3 py-3 text-right text-muted-foreground">
                            {item.participacao.toLocaleString("pt-BR")} %
                          </td>
                          <td className="px-3 py-3 text-right text-muted-foreground">
                            {formatNumber(item.mediaMensal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tipos" className="mt-4">
          <Card className="border-border/70 bg-card/80 shadow-lg">
            <CardHeader>
              <CardTitle className="text-foreground">
                Análise independente por tipo de placa
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Participação, clientes atendidos, extremos e evolução mensal de
                cada tipo.
              </p>
            </CardHeader>
            <CardContent>
              {!hasTypes ? (
                <EmptyState message="Nenhum tipo de placa disponível no recorte atual." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1000px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-3 py-3">Tipo de placa</th>
                        <th className="px-3 py-3 text-right">Total</th>
                        <th className="px-3 py-3 text-right">Clientes</th>
                        <th className="px-3 py-3 text-right">Média/cliente</th>
                        <th className="px-3 py-3">Maior cliente</th>
                        <th className="px-3 py-3">Menor cliente</th>
                        <th className="px-3 py-3 text-right">Participação</th>
                        <th className="px-3 py-3">Evolução</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.analiseTipos.map(item => (
                        <tr
                          key={item.tipoPlaca}
                          className="border-b border-border/60 hover:bg-muted/40"
                        >
                          <td className="px-3 py-3 font-medium text-foreground">
                            {item.tipoPlaca}
                          </td>
                          <td className="px-3 py-3 text-right text-foreground">
                            {formatNumber(item.total)}
                          </td>
                          <td className="px-3 py-3 text-right text-muted-foreground">
                            {formatNumber(item.clientes)}
                          </td>
                          <td className="px-3 py-3 text-right text-muted-foreground">
                            {formatNumber(item.mediaPorCliente)}
                          </td>
                          <td className="px-3 py-3 text-foreground">
                            {item.maiorCliente
                              ? `${item.maiorCliente.nome} (${formatNumber(item.maiorCliente.quantidade)})`
                              : "—"}
                          </td>
                          <td className="px-3 py-3 text-muted-foreground">
                            {item.menorCliente
                              ? `${item.menorCliente.nome} (${formatNumber(item.menorCliente.quantidade)})`
                              : "—"}
                          </td>
                          <td className="px-3 py-3 text-right text-muted-foreground">
                            {item.participacao.toLocaleString("pt-BR")} %
                          </td>
                          <td className="px-3 py-3 text-xs text-muted-foreground">
                            {item.evolucaoMensal
                              .map(
                                point =>
                                  `${point.mes.slice(0, 3)}/${point.ano}: ${formatNumber(point.quantidade)}`
                              )
                              .join(" · ") || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="periodos" className="mt-4 space-y-4">
          <Card className="border-border/70 bg-card/80 shadow-lg">
            <CardHeader>
              <CardTitle className="text-foreground">
                Comparação de períodos
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Escolha intervalos de meses/anos quando essa informação existir
                no histórico. O filtro global de meses e clientes continua
                aplicado.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 lg:grid-cols-2">
                <PeriodField
                  label="Período A"
                  value={periodoA}
                  years={years}
                  onChange={onPeriodoAChange}
                />
                <PeriodField
                  label="Período B"
                  value={periodoB}
                  years={years}
                  onChange={onPeriodoBChange}
                />
              </div>
              {!comparison.disponivel ? (
                <EmptyState
                  message={
                    comparison.motivo ??
                    "Comparação indisponível no recorte atual."
                  }
                />
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                          <th className="px-3 py-3">Indicador</th>
                          <th className="px-3 py-3 text-right">
                            {comparison.periodoA.label}
                          </th>
                          <th className="px-3 py-3 text-right">
                            {comparison.periodoB.label}
                          </th>
                          <th className="px-3 py-3 text-right">Diferença</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          [
                            "Produção total",
                            comparison.periodoA.total,
                            comparison.periodoB.total,
                            comparison.diferencaAbsoluta,
                          ],
                          [
                            "Média mensal",
                            comparison.periodoA.mediaMensal,
                            comparison.periodoB.mediaMensal,
                            comparison.periodoB.mediaMensal -
                              comparison.periodoA.mediaMensal,
                          ],
                          [
                            "Média por cliente",
                            comparison.periodoA.mediaPorCliente,
                            comparison.periodoB.mediaPorCliente,
                            comparison.periodoB.mediaPorCliente -
                              comparison.periodoA.mediaPorCliente,
                          ],
                          [
                            "Clientes",
                            comparison.periodoA.clientes,
                            comparison.periodoB.clientes,
                            comparison.periodoB.clientes -
                              comparison.periodoA.clientes,
                          ],
                          [
                            "Tipos",
                            comparison.periodoA.tipos,
                            comparison.periodoB.tipos,
                            comparison.periodoB.tipos -
                              comparison.periodoA.tipos,
                          ],
                        ].map(([label, a, b, diff]) => (
                          <tr
                            key={label as string}
                            className="border-b border-border/60"
                          >
                            <td className="px-3 py-3 font-medium text-foreground">
                              {label}
                            </td>
                            <td className="px-3 py-3 text-right text-muted-foreground">
                              {formatNumber(a as number)}
                            </td>
                            <td className="px-3 py-3 text-right text-muted-foreground">
                              {formatNumber(b as number)}
                            </td>
                            <td
                              className={`px-3 py-3 text-right ${signClass(diff as number)}`}
                            >
                              {formatNumber(diff as number)}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-muted/40">
                          <td className="px-3 py-3 font-semibold text-foreground">
                            Variação percentual
                          </td>
                          <td className="px-3 py-3 text-right">—</td>
                          <td className="px-3 py-3 text-right">—</td>
                          <td
                            className={`px-3 py-3 text-right ${signClass(comparison.diferencaAbsoluta)}`}
                          >
                            {formatPercent(comparison.diferencaPercentual)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg border border-border/60 p-3">
                      <p className="text-xs text-muted-foreground">
                        Clientes novos
                      </p>
                      <p className="mt-1 text-xl font-semibold text-foreground">
                        {comparison.clientesNovos.length}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {comparison.clientesNovos.join(" · ") || "Nenhum"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/60 p-3">
                      <p className="text-xs text-muted-foreground">
                        Clientes perdidos
                      </p>
                      <p className="mt-1 text-xl font-semibold text-foreground">
                        {comparison.clientesPerdidos.length}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {comparison.clientesPerdidos.join(" · ") || "Nenhum"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/60 p-3">
                      <p className="text-xs text-muted-foreground">
                        Aumentaram
                      </p>
                      <p className="mt-1 text-xl font-semibold text-emerald-600 dark:text-emerald-300">
                        {comparison.clientesAumentaram.length}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {comparison.clientesAumentaram
                          .slice(0, 3)
                          .map(item => item.cliente)
                          .join(" · ") || "Nenhum"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/60 p-3">
                      <p className="text-xs text-muted-foreground">
                        Diminuíram
                      </p>
                      <p className="mt-1 text-xl font-semibold text-rose-600 dark:text-rose-300">
                        {comparison.clientesDiminuiram.length}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {comparison.clientesDiminuiram
                          .slice(0, 3)
                          .map(item => item.cliente)
                          .join(" · ") || "Nenhum"}
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-border/60 bg-background/40 p-3 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">
                        Tipos que aumentaram:
                      </span>{" "}
                      {comparison.tiposAumentaram
                        .map(
                          item =>
                            `${item.tipoPlaca} (+${formatNumber(item.diferencaAbsoluta)})`
                        )
                        .join(" · ") || "Nenhum"}
                    </div>
                    <div className="rounded-lg border border-border/60 bg-background/40 p-3 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">
                        Tipos que diminuíram:
                      </span>{" "}
                      {comparison.tiposDiminuiram
                        .map(
                          item =>
                            `${item.tipoPlaca} (${formatNumber(item.diferencaAbsoluta)})`
                        )
                        .join(" · ") || "Nenhum"}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Maior cliente:{" "}
                    {comparison.periodoB.maiorCliente?.nome ?? "N/A"}. Tipo mais
                    produzido: {comparison.periodoB.tipoMaisProduzido}.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="relatorio" className="mt-4">
          <Card className="border-border/70 bg-card/80 shadow-lg">
            <CardHeader>
              <CardTitle className="text-foreground">
                Relatório descritivo determinístico
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Texto gerado somente a partir dos dados e filtros atuais;
                nenhuma IA externa é usada nesta interpretação.
              </p>
            </CardHeader>
            <CardContent>
              <blockquote className="rounded-lg border-l-4 border-primary bg-primary/5 p-4 text-sm leading-7 text-foreground">
                {data.relatorioDeterministico}
              </blockquote>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  );
}
