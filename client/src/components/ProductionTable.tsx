import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import React, { Fragment, useState } from "react";
import AnalysisPdfButton from "./AnalysisPdfButton";
import { downloadAnalysisPdf } from "@/lib/analysisPdf";

interface TabelaProducao {
  cliente: string;
  itens: Array<{ tipoPlaca: string; quantidade: number }>;
  total: number;
}

export default function ProductionTable({ data, filterDescription }: { data: TabelaProducao[]; filterDescription?: string }) {
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});
  const totalGeral = data.reduce((sum, item) => sum + item.total, 0);
  const isExpanded = (cliente: string) => expandedClients[cliente] ?? true;
  const toggleClient = (cliente: string) => setExpandedClients((current) => ({ ...current, [cliente]: !isExpanded(cliente) }));

  const exportPdf = () => downloadAnalysisPdf({
    title: "Tabela de produção por cliente",
    subtitle: `Gerado em ${new Date().toLocaleString("pt-BR")} · ${data.length} clientes · estado visual independente preservado`,
    filterDescription,
    fileName: "tabela-producao",
    sections: [{
      title: "Produção consolidada",
      columns: ["Cliente", "Tipo de placa", "Quantidade"],
      rows: data.flatMap((row) => [
        ...row.itens.map((item) => [row.cliente, item.tipoPlaca, item.quantidade.toLocaleString("pt-BR")]),
        [`Subtotal - ${row.cliente}`, "", row.total.toLocaleString("pt-BR")],
      ]).concat([["TOTAL GERAL", "", totalGeral.toLocaleString("pt-BR")]]),
    }],
  });

  return (
    <Card className="bg-slate-800/50 border-slate-700 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div><CardTitle className="text-white">Tabela de Produção</CardTitle><p className="mt-1 text-xs text-slate-400">Clique no cliente para recolher ou expandir os modelos.</p></div>
        <AnalysisPdfButton onClick={exportPdf} />
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow className="border-slate-700 hover:bg-slate-700/50"><TableHead className="text-slate-300">Cliente</TableHead><TableHead className="text-slate-300">Tipo de Placa</TableHead><TableHead className="text-right text-slate-300">Quantidade</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.map((row, clienteIndex) => {
                const expanded = isExpanded(row.cliente);
                return (
                  <Fragment key={`${row.cliente}-${clienteIndex}`}>{/* Fragment keeps tbody semântico: somente tr como filhos diretos. */}
                    <TableRow key={`${row.cliente}-summary`} className={`border-slate-600 font-semibold ${clienteIndex % 2 === 0 ? "bg-slate-800/40" : "bg-slate-800/20"}`}>
                      <TableCell colSpan={2} className="p-0"><button type="button" onClick={() => toggleClient(row.cliente)} aria-expanded={expanded} className="flex min-h-12 w-full items-center gap-2 px-4 text-left text-slate-100 transition-colors hover:bg-slate-700/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><span aria-hidden="true" className="w-4 text-primary">{expanded ? "▼" : "▶"}</span><span>{row.cliente}</span><span className="sr-only">{expanded ? "recolher" : "expandir"} detalhes</span></button></TableCell>
                      <TableCell className="text-right text-lg text-blue-300">{row.total.toLocaleString("pt-BR")}</TableCell>
                    </TableRow>
                    {expanded && <>
                      <TableRow className="border-slate-700 bg-slate-900/30"><TableHead className="pl-12 text-xs text-slate-400">Modelo</TableHead><TableHead className="text-xs text-slate-400">Tipo de Placa</TableHead><TableHead className="text-right text-xs text-slate-400">Quantidade</TableHead></TableRow>
                      {row.itens.map((item) => <TableRow key={`${row.cliente}-${item.tipoPlaca}`} className="border-slate-700 bg-slate-800/10 hover:bg-slate-700/40"><TableCell className="pl-12 text-slate-400">{row.cliente}</TableCell><TableCell className="text-slate-300">{item.tipoPlaca}</TableCell><TableCell className="text-right font-medium text-slate-200">{item.quantidade.toLocaleString("pt-BR")}</TableCell></TableRow>)}
                      <TableRow className="border-slate-600 bg-slate-700/50 font-semibold"><TableCell colSpan={2} className="pl-12 text-slate-100">Subtotal - {row.cliente}</TableCell><TableCell className="text-right text-slate-100">{row.total.toLocaleString("pt-BR")}</TableCell></TableRow>
                    </>}
                  </Fragment>
                );
              })}
              <TableRow className="border-slate-600 bg-blue-600/20 font-bold"><TableCell colSpan={2} className="text-slate-100">TOTAL GERAL</TableCell><TableCell className="text-right text-lg text-blue-300">{totalGeral.toLocaleString("pt-BR")}</TableCell></TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
