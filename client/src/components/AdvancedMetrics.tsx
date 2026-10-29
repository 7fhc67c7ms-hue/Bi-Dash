import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, CheckCircle2, Layers3, Target, TrendingUp } from "lucide-react";
import AnalysisPdfButton from "./AnalysisPdfButton";
import { downloadAnalysisPdf } from "@/lib/analysisPdf";

export default function AdvancedMetrics({ metrics, filterDescription }: { metrics: { totalClientes: number; totalProdutos: number; quantidadeClientesObras: number; participacaoObras: number; participacaoTop5Clientes: number; mesPico: string; crescimentoUltimoMes: number | null; mediaPorPedido: number; qualidadeImportacao: { validas: number; rejeitadas: number; duplicados: number } }; filterDescription?: string }) {
  const totalQuality = metrics.qualidadeImportacao.validas + metrics.qualidadeImportacao.rejeitadas;
  const qualityRate = totalQuality ? Math.round((metrics.qualidadeImportacao.validas / totalQuality) * 1000) / 10 : 0;
  const cards = [
    { label: "Clientes ativos", value: metrics.totalClientes.toLocaleString("pt-BR"), note: `${metrics.quantidadeClientesObras} em obras`, icon: Target, color: "text-sky-300", bg: "bg-sky-500/10" },
    { label: "Mix de produtos", value: metrics.totalProdutos.toLocaleString("pt-BR"), note: "modelos no período", icon: Layers3, color: "text-violet-300", bg: "bg-violet-500/10" },
    { label: "Concentração Top 5", value: `${metrics.participacaoTop5Clientes.toLocaleString("pt-BR")}%`, note: "da produção", icon: BarChart3, color: "text-amber-300", bg: "bg-amber-500/10" },
    { label: "Média por pedido", value: metrics.mediaPorPedido.toLocaleString("pt-BR"), note: "unidades por pedido", icon: TrendingUp, color: "text-emerald-300", bg: "bg-emerald-500/10" },
    { label: "Qualidade da importação", value: `${qualityRate.toLocaleString("pt-BR")}%`, note: `${metrics.qualidadeImportacao.rejeitadas} rejeitadas · ${metrics.qualidadeImportacao.duplicados} duplicados`, icon: CheckCircle2, color: "text-teal-300", bg: "bg-teal-500/10" },
  ];
  const exportPdf = () => downloadAnalysisPdf({ title: "Métricas avançadas de produção", filterDescription, fileName: "analise-metricas-avancadas", sections: [{ title: "Métricas", columns: ["Indicador", "Resultado", "Observação"], rows: cards.map((card) => [card.label, card.value, card.note]) }] });
  return <section aria-label="Métricas avançadas"><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">Métricas avançadas</h2><AnalysisPdfButton onClick={exportPdf} /></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{cards.map((card) => { const Icon = card.icon; return <Card key={card.label} className="border-border/70 bg-card/80 shadow-lg"><CardContent className="p-5"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{card.label}</p><p className="mt-3 truncate text-2xl font-semibold text-foreground">{card.value}</p><p className="mt-1 text-xs text-muted-foreground">{card.note}</p></div><div className={`rounded-lg p-2.5 ${card.bg}`}><Icon className={`h-5 w-5 ${card.color}`} /></div></div></CardContent></Card>; })}</div></section>;
}
