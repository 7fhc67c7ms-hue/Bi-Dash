import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

const number = (value: number) => value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const percent = (value: number) => `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

export default function ClientProductionAnalysis({ clientes }: { clientes: string[] }) {
  const [cliente, setCliente] = useState(clientes[0] ?? "");
  useEffect(() => {
    if (!cliente && clientes[0]) setCliente(clientes[0]);
    if (cliente && !clientes.includes(cliente)) setCliente(clientes[0] ?? "");
  }, [clientes, cliente]);
  const query = trpc.production.getClientProductionAnalysis.useQuery({ cliente }, { enabled: Boolean(cliente) });
  const data = query.data;
  return (
    <section data-print-block className="space-y-5" aria-label="Análise detalhada por cliente">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Módulo separado</p>
        <h2 className="mt-1 text-2xl font-semibold">Produção por cliente</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Selecione um cliente para consultar toda a descrição de produção ao longo dos meses disponíveis. Esta análise é calculada diretamente sobre a tabela principal de produção.</p>
      </div>
      <Card><CardContent className="p-4"><label data-print-ui className="block max-w-xl text-xs font-medium text-muted-foreground">Cliente<select value={cliente} onChange={event => setCliente(event.target.value)} className="mt-1 h-11 w-full rounded-md border bg-background px-3 text-sm"><option value="">Selecione um cliente</option>{clientes.map(item => <option key={item}>{item}</option>)}</select></label></CardContent></Card>
      {query.isLoading && <p className="py-10 text-center text-sm text-muted-foreground">Carregando análise...</p>}
      {data && <>
        <div className="grid gap-3 sm:grid-cols-3"><Card><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">Produção total</p><p className="mt-2 text-2xl font-semibold">{number(data.total)}</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">Romaneios</p><p className="mt-2 text-2xl font-semibold">{data.totalRomaneios}</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">Tipos de placa</p><p className="mt-2 text-2xl font-semibold">{data.tipos.length}</p></CardContent></Card></div>
        <Card><CardHeader><CardTitle>Evolução mensal</CardTitle></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm"><thead className="bg-muted/60"><tr>{["Ano", "Mês", "Produção", "Romaneios"].map(label => <th key={label} className="px-3 py-3 text-left text-xs uppercase text-muted-foreground">{label}</th>)}</tr></thead><tbody>{data.meses.map(item => <tr key={`${item.ano}-${item.mes}`} className="border-t"><td className="px-3 py-3">{item.ano}</td><td className="px-3 py-3">{item.mes}</td><td className="px-3 py-3 font-semibold">{number(item.quantidade)}</td><td className="px-3 py-3">{item.romaneios}</td></tr>)}</tbody></table></div></CardContent></Card>
        <div className="grid gap-4 xl:grid-cols-2"><Card><CardHeader><CardTitle>Mix por tipo de placa</CardTitle></CardHeader><CardContent><div className="space-y-3">{data.tipos.map(item => <div key={item.tipoPlaca}><div className="flex justify-between gap-3 text-sm"><span className="truncate">{item.tipoPlaca}</span><span className="font-medium">{number(item.quantidade)} · {percent(item.participacao)}</span></div><div className="mt-1 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(100, item.participacao)}%` }} /></div></div>)}</div></CardContent></Card><Card><CardHeader><CardTitle>Detalhamento dos romaneios</CardTitle></CardHeader><CardContent><div className="max-h-[420px] overflow-auto"><table className="w-full min-w-[560px] text-sm"><thead className="sticky top-0 bg-muted/90"><tr>{["Romaneio", "Ano", "Mês", "Tipo", "Quantidade"].map(label => <th key={label} className="px-3 py-3 text-left text-xs uppercase text-muted-foreground">{label}</th>)}</tr></thead><tbody>{data.romaneios.map((item, index) => <tr key={`${item.romaneio}-${item.ano}-${item.mes}-${item.tipoPlaca}-${index}`} className="border-t"><td className="px-3 py-3">{item.romaneio}</td><td className="px-3 py-3">{item.ano}</td><td className="px-3 py-3">{item.mes}</td><td className="px-3 py-3">{item.tipoPlaca}</td><td className="px-3 py-3 font-semibold">{number(item.quantidade)}</td></tr>)}</tbody></table></div></CardContent></Card></div>
      </>}
      {!query.isLoading && !data && cliente && <p className="py-10 text-center text-sm text-muted-foreground">Não foi possível carregar os dados deste cliente.</p>}
    </section>
  );
}
