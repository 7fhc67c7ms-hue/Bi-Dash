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
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Nº de Pedidos",
      value: kpis.numeroPedidos.toString(),
      icon: Package,
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Ticket Médio",
      value: kpis.ticketMedio.toString(),
      icon: Zap,
      color: "from-orange-500 to-orange-600",
      bgColor: "bg-orange-500/10",
    },
    {
      title: "Produto Estrela",
      value: kpis.produtoEstrela,
      icon: Star,
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-500/10",
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
      <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">Indicadores principais</h2><AnalysisPdfButton onClick={exportPdf} /></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card
            key={index}
            className="bg-slate-800/50 border-slate-700 shadow-lg hover:shadow-xl transition-shadow"
          >
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-slate-400 mb-2">{card.title}</p>
                  <p className="text-2xl md:text-3xl font-bold text-white truncate">
                    {card.value}
                  </p>
                </div>
                <div className={`${card.bgColor} p-3 rounded-lg`}>
                  <Icon className={`w-6 h-6 text-${card.color.split("-")[1]}-400`} />
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
