import { BarChart3, GitCompareArrows, Layers3, Table2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ProductionAnalysisReportData } from "@/lib/analysisPdf";

interface ProductionAnalysisTabsProps {
  data: ProductionAnalysisReportData;
  selectedMonths: string[];
}

const formatNumber = (value: number) => value.toLocaleString("pt-BR");
const formatPercent = (value: number | null) => value === null ? "—" : `${value.toLocaleString("pt-BR")} %`;

function EmptyState({ message }: { message: string }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{message}</p>;
}

export default function ProductionAnalysisTabs({ data, selectedMonths }: ProductionAnalysisTabsProps) {
  const comparisonMonths = data.comparacaoMeses.meses;
  const comparisonTotal = data.comparacaoMeses.totais;
  const firstTotal = comparisonTotal[0]?.total ?? 0;
  const lastTotal = comparisonTotal.at(-1)?.total ?? 0;
  const totalVariation = comparisonTotal.length > 1 && firstTotal > 0 ? ((lastTotal - firstTotal) / firstTotal) * 100 : null;

  return (
    <section aria-label="Análises de produção por mês e modelo">
      <Tabs defaultValue="mensal" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 bg-card/80 p-1 md:grid-cols-4">
          <TabsTrigger value="mensal" className="min-h-10"><BarChart3 className="h-4 w-4" />Resumo mensal</TabsTrigger>
          <TabsTrigger value="modelos-mes" className="min-h-10"><Table2 className="h-4 w-4" />Modelos por mês</TabsTrigger>
          <TabsTrigger value="mix" className="min-h-10"><Layers3 className="h-4 w-4" />Mix de modelos</TabsTrigger>
          <TabsTrigger value="comparacao" className="min-h-10"><GitCompareArrows className="h-4 w-4" />Comparar meses</TabsTrigger>
        </TabsList>

        <TabsContent value="mensal" className="mt-4">
          <Card className="border-border/70 bg-card/80 shadow-lg">
            <CardHeader><CardTitle className="text-foreground">Resumo mensal</CardTitle><p className="text-sm text-muted-foreground">Volume, pedidos, variedade e modelo dominante em cada mês disponível.</p></CardHeader>
            <CardContent>
              {data.resumoMensal.length === 0 ? <EmptyState message="Nenhum mês disponível para análise." /> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground"><th className="px-3 py-3">Mês</th><th className="px-3 py-3 text-right">Produção</th><th className="px-3 py-3 text-right">Pedidos</th><th className="px-3 py-3 text-right">Modelos</th><th className="px-3 py-3">Modelo estrela</th><th className="px-3 py-3 text-right">Participação</th><th className="px-3 py-3 text-right">Variação</th></tr></thead><tbody>{data.resumoMensal.map((item) => <tr key={item.mes} className="border-b border-border/60 hover:bg-muted/40"><td className="px-3 py-3 font-medium text-foreground">{item.mes}</td><td className="px-3 py-3 text-right text-foreground">{formatNumber(item.total)}</td><td className="px-3 py-3 text-right text-muted-foreground">{formatNumber(item.numeroPedidos)}</td><td className="px-3 py-3 text-right text-muted-foreground">{formatNumber(item.modelosAtivos)}</td><td className="px-3 py-3 text-foreground">{item.modeloEstrela}</td><td className="px-3 py-3 text-right text-muted-foreground">{item.participacaoModeloEstrela.toLocaleString("pt-BR")} %</td><td className={`px-3 py-3 text-right ${item.variacaoPercentual !== null && item.variacaoPercentual >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300"}`}>{formatPercent(item.variacaoPercentual)}</td></tr>)}</tbody></table></div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modelos-mes" className="mt-4">
          <Card className="border-border/70 bg-card/80 shadow-lg">
            <CardHeader><CardTitle className="text-foreground">Modelos produzidos por mês</CardTitle><p className="text-sm text-muted-foreground">Cada linha mostra o volume do modelo e o seu peso dentro do mês.</p></CardHeader>
            <CardContent>
              {data.modelosPorMes.length === 0 ? <EmptyState message="Nenhum modelo disponível para análise." /> : <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><thead><tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground"><th className="px-3 py-3">Mês</th><th className="px-3 py-3">Modelo</th><th className="px-3 py-3 text-right">Quantidade</th><th className="px-3 py-3 text-right">Participação no mês</th></tr></thead><tbody>{data.modelosPorMes.map((item) => <tr key={`${item.mes}-${item.tipoPlaca}`} className="border-b border-border/60 hover:bg-muted/40"><td className="px-3 py-3 font-medium text-foreground">{item.mes}</td><td className="px-3 py-3 text-foreground">{item.tipoPlaca}</td><td className="px-3 py-3 text-right text-foreground">{formatNumber(item.quantidade)}</td><td className="px-3 py-3 text-right text-muted-foreground">{item.participacaoMes.toLocaleString("pt-BR")} %</td></tr>)}</tbody></table></div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mix" className="mt-4 space-y-4">
          <Card className="border-border/70 bg-card/80 shadow-lg">
            <CardHeader><CardTitle className="text-foreground">Matriz modelo × mês</CardTitle><p className="text-sm text-muted-foreground">Visão completa para identificar recorrência, sazonalidade e concentração do mix.</p></CardHeader>
            <CardContent>
              {data.matrizModeloMes.linhas.length === 0 ? <EmptyState message="Nenhum modelo disponível para montar a matriz." /> : <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-sm"><thead><tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground"><th className="sticky left-0 bg-card px-3 py-3">Modelo</th>{data.matrizModeloMes.meses.map((mes) => <th key={mes} className="px-3 py-3 text-right">{mes}</th>)}<th className="px-3 py-3 text-right">Total</th></tr></thead><tbody>{data.matrizModeloMes.linhas.map((linha) => <tr key={linha.tipoPlaca} className="border-b border-border/60 hover:bg-muted/40"><td className="sticky left-0 bg-card px-3 py-3 font-medium text-foreground">{linha.tipoPlaca}</td>{data.matrizModeloMes.meses.map((mes) => <td key={`${linha.tipoPlaca}-${mes}`} className="px-3 py-3 text-right text-muted-foreground">{formatNumber(linha.valores[mes] ?? 0)}</td>)}<td className="px-3 py-3 text-right font-semibold text-foreground">{formatNumber(linha.total)}</td></tr>)}</tbody></table></div>}
            </CardContent>
          </Card>
          <Card className="border-border/70 bg-card/80 shadow-lg">
            <CardHeader><CardTitle className="text-foreground">Análise completa do mix</CardTitle><p className="text-sm text-muted-foreground">Participação no período, meses ativos, média mensal e pico de cada modelo.</p></CardHeader>
            <CardContent>{data.analiseMixModelos.length === 0 ? <EmptyState message="Nenhum modelo disponível para análise." /> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground"><th className="px-3 py-3">Modelo</th><th className="px-3 py-3 text-right">Total</th><th className="px-3 py-3 text-right">Participação</th><th className="px-3 py-3 text-right">Meses ativos</th><th className="px-3 py-3 text-right">Média mensal</th><th className="px-3 py-3">Mês de pico</th><th className="px-3 py-3 text-right">Volume no pico</th></tr></thead><tbody>{data.analiseMixModelos.map((item) => <tr key={item.tipoPlaca} className="border-b border-border/60 hover:bg-muted/40"><td className="px-3 py-3 font-medium text-foreground">{item.tipoPlaca}</td><td className="px-3 py-3 text-right text-foreground">{formatNumber(item.total)}</td><td className="px-3 py-3 text-right text-muted-foreground">{item.participacao.toLocaleString("pt-BR")} %</td><td className="px-3 py-3 text-right text-muted-foreground">{formatNumber(item.mesesAtivos)}</td><td className="px-3 py-3 text-right text-muted-foreground">{item.mediaMensal.toLocaleString("pt-BR")}</td><td className="px-3 py-3 text-foreground">{item.mesPico}</td><td className="px-3 py-3 text-right text-foreground">{formatNumber(item.quantidadeMesPico)}</td></tr>)}</tbody></table></div>}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparacao" className="mt-4">
          <Card className="border-border/70 bg-card/80 shadow-lg">
            <CardHeader><CardTitle className="text-foreground">Comparação de dois ou mais meses</CardTitle><p className="text-sm text-muted-foreground">Selecione dois ou mais meses no filtro acima para comparar os modelos lado a lado. {selectedMonths.length > 0 ? `${selectedMonths.length} mês(es) selecionado(s).` : "Sem seleção, todos os meses são comparados."}</p></CardHeader>
            <CardContent>{comparisonMonths.length < 2 ? <EmptyState message="Selecione pelo menos dois meses no filtro para ativar a comparação." /> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground"><th className="sticky left-0 bg-card px-3 py-3">Modelo</th>{comparisonMonths.map((mes) => <th key={mes} className="px-3 py-3 text-right">{mes}</th>)}<th className="px-3 py-3 text-right">Diferença</th><th className="px-3 py-3 text-right">Variação</th></tr></thead><tbody>{data.comparacaoMeses.linhas.map((linha) => <tr key={linha.tipoPlaca} className="border-b border-border/60 hover:bg-muted/40"><td className="sticky left-0 bg-card px-3 py-3 font-medium text-foreground">{linha.tipoPlaca}</td>{comparisonMonths.map((mes) => <td key={`${linha.tipoPlaca}-${mes}`} className="px-3 py-3 text-right text-muted-foreground">{formatNumber(linha.valores[mes] ?? 0)}</td>)}<td className={`px-3 py-3 text-right ${linha.diferencaPrimeiroUltimo >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300"}`}>{formatNumber(linha.diferencaPrimeiroUltimo)}</td><td className="px-3 py-3 text-right text-muted-foreground">{formatPercent(linha.variacaoPercentual)}</td></tr>)}<tr className="bg-muted/40 font-semibold"><td className="sticky left-0 bg-muted/40 px-3 py-3 text-foreground">TOTAL</td>{comparisonTotal.map((item) => <td key={item.mes} className="px-3 py-3 text-right text-foreground">{formatNumber(item.total)}</td>)}<td className="px-3 py-3 text-right text-foreground">{formatNumber(lastTotal - firstTotal)}</td><td className="px-3 py-3 text-right text-muted-foreground">{formatPercent(totalVariation)}</td></tr></tbody></table></div>}</CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  );
}

export type { ProductionAnalysisTabsProps };
