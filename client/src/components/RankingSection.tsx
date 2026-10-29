import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Trophy, UsersRound, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import AnalysisPdfButton from "./AnalysisPdfButton";
import { downloadAnalysisPdf } from "@/lib/analysisPdf";

interface ClienteRanking {
  posicao: number;
  nome: string;
  quantidade: number;
}

interface RankingSectionProps {
  title: string;
  data: ClienteRanking[];
  filterDescription?: string;
}

export default function RankingSection({ title, data, filterDescription }: RankingSectionProps) {
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("Anjos da Guarda");
  const [groups, setGroups] = useState<Array<{ name: string; clients: string[] }>>([]);

  const groupedData = useMemo(() => {
    const consumed = new Set(groups.flatMap((group) => group.clients));
    const result = data.filter((item) => !consumed.has(item.nome)).map((item) => ({ nome: item.nome, quantidade: item.quantidade }));
    groups.forEach((group) => {
      const amount = data.filter((item) => group.clients.includes(item.nome)).reduce((sum, item) => sum + item.quantidade, 0);
      result.push({ nome: `${group.name} (${group.clients.length} clientes)`, quantidade: amount });
    });
    return result.sort((a, b) => b.quantidade - a.quantidade).map((item, index) => ({ ...item, posicao: index + 1 }));
  }, [data, groups]);

  const toggleClient = (client: string) => setSelectedClients((current) => current.includes(client) ? current.filter((item) => item !== client) : [...current, client]);
  const createGroup = () => {
    const name = groupName.trim() || "Grupo de clientes";
    if (selectedClients.length < 2) return;
    setGroups((current) => [...current.filter((group) => !group.clients.some((client) => selectedClients.includes(client))), { name, clients: selectedClients }]);
    setSelectedClients([]);
  };
  const resetGroups = () => { setGroups([]); setSelectedClients([]); };
  const exportPdf = () => downloadAnalysisPdf({ title, subtitle: `Gerado em ${new Date().toLocaleString("pt-BR")} · agrupamentos manuais aplicados nesta análise`, filterDescription, fileName: `ranking-${title}`, sections: [{ title: "Ranking", columns: ["Posição", "Cliente", "Quantidade"], rows: groupedData.map((item) => [item.posicao, item.nome, item.quantidade.toLocaleString("pt-BR")]) }] });

  const getMedalIcon = (posicao: number) => posicao === 1 ? "🥇" : posicao === 2 ? "🥈" : posicao === 3 ? "🥉" : null;
  const getColorClass = (posicao: number) => posicao === 1 ? "bg-yellow-500/10 border-l-2 border-yellow-500" : posicao === 2 ? "bg-gray-400/10 border-l-2 border-gray-400" : posicao === 3 ? "bg-orange-500/10 border-l-2 border-orange-500" : "bg-slate-700/30 border-l-2 border-slate-600";

  return (
    <Card className="bg-slate-800/50 border-slate-700 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between gap-3"><CardTitle className="text-white flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-500" />{title}</CardTitle><AnalysisPdfButton onClick={exportPdf} /></div>
        <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3 space-y-3">
          <div className="flex items-center gap-2 text-xs text-slate-300"><UsersRound className="h-4 w-4 text-primary" /> Agrupar clientes manualmente no ranking</div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <Input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Nome do grupo" className="h-9 bg-slate-950/60" />
            <Button size="sm" onClick={createGroup} disabled={selectedClients.length < 2}>Juntar selecionados ({selectedClients.length})</Button>
            <Button size="sm" variant="outline" onClick={resetGroups} disabled={groups.length === 0}><RotateCcw className="mr-1 h-3.5 w-3.5" />Desfazer</Button>
          </div>
          <div className="grid max-h-28 gap-2 overflow-y-auto sm:grid-cols-2">
            {data.map((client) => <label key={client.nome} className="flex cursor-pointer items-center gap-2 text-xs text-slate-300"><Checkbox checked={selectedClients.includes(client.nome)} onCheckedChange={() => toggleClient(client.nome)} /><span className="truncate">{client.nome}</span></label>)}
          </div>
          <p className="text-[11px] text-slate-500">Selecione dois ou mais clientes. O ranking original continua intacto até você criar um agrupamento.</p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {groupedData.length === 0 ? <p className="text-slate-400 text-center py-4">Nenhum dado disponível</p> : groupedData.map((item) => <div key={item.nome} className={`p-4 rounded-lg transition-colors ${getColorClass(item.posicao)}`}><div className="flex items-center justify-between"><div className="flex items-center gap-3 flex-1 min-w-0"><div className="w-8 h-8 flex items-center justify-center font-bold text-slate-300">{getMedalIcon(item.posicao) || `#${item.posicao}`}</div><p className="text-slate-200 font-medium truncate">{item.nome}</p></div><div className="text-right"><p className="text-slate-100 font-bold">{item.quantidade.toLocaleString("pt-BR")}</p><p className="text-xs text-slate-400">unidades</p></div></div></div>)}
        </div>
      </CardContent>
    </Card>
  );
}
