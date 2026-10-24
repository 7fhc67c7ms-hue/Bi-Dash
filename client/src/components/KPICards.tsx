import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Package, Zap, Star } from "lucide-react";
import AnalysisPdfButton from "./AnalysisPdfButton";
import { downloadAnalysisPdf } from "@/lib/analysisPdf";

interface KPIs {
  totalProducao: number;
  numeroPedidos: number;
  ticketMedio: number;
  produtoEstrela: string;
}

interface KPICardsProps {
  kpis: KPIs;
  filterDescription?: string;
}

export default function KPICards({ kpis, filterDescription }: KPICardsProps) {
  const cards = [
    {
      title: "Produção Total",
      value: kpis.totalProducao.toLocaleString("pt-BR"),
      icon: TrendingUp,
      iconColor: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Nº de Pedidos",
      value: kpis.numeroPedidos.toString(),
      icon: Package,
      iconColor: "text-sky-700 dark:text-sky-300",
      bgColor: "bg-sky-500/10",
    },
    {
      title: "Ticket Médio",
      value: kpis.ticketMedio.toString(),
      icon: Zap,
      iconColor: "text-amber-700 dark:text-amber-300",
      bgColor: "bg-amber-500/10",
    },
    {
      title: "Produto Estrela",
      value: kpis.produtoEstrela,
      icon: Star,
      iconColor: "text-emerald-700 dark:text-emerald-300",
      bgColor: "bg-emerald-500/10",
      isText: true,
    },
  ];

  const exportPdf = () => downloadAnalysisPdf({
    title: "Indicadores principais de produção",
    filterDescription,
    fileName: "analise-kpis",
    sections: [{ title: "KPIs", columns: ["Indicador", "Valor"], rows: [["Produção total", kpis.totalProducao.toLocaleString("pt-BR")], ["Número de pedidos", kpis.numeroPedidos], ["Ticket médio", kpis.ticketMedio.toLocaleString("pt-BR")], ["Produto estrela", kpis.produtoEstrela]] }],
  });

  return (
    <section aria-label="Indicadores principais">
      <div className="mb-3 flex items-center justify-between"><h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Indicadores principais</h2><AnalysisPdfButton onClick={exportPdf} /></div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card
            key={index}
            className="bg-card"
          >
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{card.title}</p>
                  <p className="truncate text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                    {card.value}
                  </p>
                </div>
                <div className={`${card.bgColor} rounded-xl p-3`}>
                  <Icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
      </div>
    </section>
  );
}
