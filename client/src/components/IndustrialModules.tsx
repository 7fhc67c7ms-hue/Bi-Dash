import { useState } from "react";
import { RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ModuleKey = "CADASTROS" | "COMPRAS" | "QUALIDADE" | "MANUTENCAO" | "FINANCEIRO" | "VENDAS" | "PRODUCAO" | "CUSTOS" | "AUDITORIA";

const tabs: Array<{ key: ModuleKey; label: string }> = [
  { key: "CADASTROS", label: "Cadastros" },
  { key: "COMPRAS", label: "Compras" },
  { key: "QUALIDADE", label: "Qualidade" },
  { key: "MANUTENCAO", label: "Manutenção" },
  { key: "FINANCEIRO", label: "Financeiro" },
  { key: "VENDAS", label: "Vendas" },
  { key: "PRODUCAO", label: "Ordens de produção" },
  { key: "CUSTOS", label: "Custos" },
  { key: "AUDITORIA", label: "Auditoria" },
];

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR");
}

export default function IndustrialModules() {
  const [active, setActive] = useState<ModuleKey>("CADASTROS");
  const utils = trpc.useUtils();
  const overview = trpc.industrial.overview.useQuery();
  const products = trpc.industrial.products.useQuery(undefined, { enabled: active !== "VENDAS" });
  const customers = trpc.industrial.customers.useQuery(undefined, { enabled: active === "CADASTROS" || active === "VENDAS" });
  const suppliers = trpc.industrial.suppliers.useQuery(undefined, { enabled: active === "CADASTROS" || active === "COMPRAS" });
  const equipment = trpc.industrial.equipment.useQuery(undefined, { enabled: active === "CADASTROS" || active === "MANUTENCAO" });
  const purchaseOrders = trpc.industrial.purchaseOrders.useQuery(undefined, { enabled: active === "COMPRAS" });
  const inspections = trpc.industrial.qualityInspections.useQuery(undefined, { enabled: active === "QUALIDADE" });
  const maintenance = trpc.industrial.maintenanceRecords.useQuery(undefined, { enabled: active === "MANUTENCAO" });
  const finance = trpc.industrial.financeEntries.useQuery(undefined, { enabled: active === "FINANCEIRO" });
  const sales = trpc.industrial.salesOrders.useQuery(undefined, { enabled: active === "VENDAS" });
  const productionOrders = trpc.industrial.productionOrders.useQuery(undefined, { enabled: active === "PRODUCAO" });
  const costEntries = trpc.industrial.costEntries.useQuery(undefined, { enabled: active === "CUSTOS" });
  const auditEvents = trpc.industrial.auditEvents.useQuery(undefined, { enabled: active === "AUDITORIA" });

  const invalidate = () => {
    void utils.industrial.products.invalidate();
    void utils.industrial.customers.invalidate();
    void utils.industrial.suppliers.invalidate();
    void utils.industrial.equipment.invalidate();
    void utils.industrial.purchaseOrders.invalidate();
    void utils.industrial.qualityInspections.invalidate();
    void utils.industrial.maintenanceRecords.invalidate();
    void utils.industrial.financeEntries.invalidate();
    void utils.industrial.salesOrders.invalidate();
    void utils.industrial.productionOrders.invalidate();
    void utils.industrial.costEntries.invalidate();
    void utils.industrial.auditEvents.invalidate();
  };

  const refresh = () => {
    invalidate();
    toast.success("Dados atualizados");
  };

  return (
    <section data-print-block className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Expansão operacional</p>
          <h2 className="text-2xl font-semibold text-foreground">Gestão industrial integrada</h2>
          <p className="text-sm text-muted-foreground">Registros reais, vinculados ao utilizador e persistidos no banco.</p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh}><RefreshCw className="mr-2 h-4 w-4" />Atualizar</Button>
      </div>
      <div className="flex flex-wrap gap-2 rounded-xl border border-border/60 bg-card p-2">
        {tabs.map(tab => <Button key={tab.key} size="sm" variant={active === tab.key ? "default" : "ghost"} onClick={() => setActive(tab.key)}>{tab.label}</Button>)}
      </div>
      {overview.data && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Compras pendentes" value={overview.data.pendingPurchases} />
        <Metric label="Ordens em aberto" value={overview.data.productionOpen} />
        <Metric label="Qualidade pendente" value={overview.data.qualityPending} />
        <Metric label="Manutenções abertas" value={overview.data.maintenanceOpen} />
        <Metric label="Contas vencidas" value={overview.data.overdue} />
      </div>}
      {active === "CADASTROS" && <MasterData products={products.data ?? []} customers={customers.data ?? []} suppliers={suppliers.data ?? []} equipment={equipment.data ?? []} onSaved={invalidate} />}
      {active === "COMPRAS" && <Purchases products={products.data ?? []} suppliers={suppliers.data ?? []} orders={purchaseOrders.data ?? []} onSaved={invalidate} />}
      {active === "QUALIDADE" && <Quality products={products.data ?? []} inspections={inspections.data ?? []} onSaved={invalidate} />}
      {active === "MANUTENCAO" && <Maintenance equipment={equipment.data ?? []} records={maintenance.data ?? []} onSaved={invalidate} />}
      {active === "FINANCEIRO" && <Finance entries={finance.data ?? []} onSaved={invalidate} />}
      {active === "VENDAS" && <Sales customers={customers.data ?? []} orders={sales.data ?? []} onSaved={invalidate} />}
      {active === "PRODUCAO" && <Production products={products.data ?? []} orders={productionOrders.data ?? []} onSaved={invalidate} />}
      {active === "CUSTOS" && <Costs products={products.data ?? []} orders={productionOrders.data ?? []} entries={costEntries.data ?? []} onSaved={invalidate} />}
      {active === "AUDITORIA" && <Audit events={auditEvents.data ?? []} />}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <Card className="border-primary/15 bg-primary/5"><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold text-foreground">{value}</p></CardContent></Card>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-1 text-sm"><span className="text-muted-foreground">{label}</span>{children}</label>;
}
function Grid({ children }: { children: React.ReactNode }) { return <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">{children}</div>; }
function SaveButton({ pending }: { pending: boolean }) { return <Button type="submit" disabled={pending}><Save className="mr-2 h-4 w-4" />Guardar</Button>; }
function Empty({ children }: { children: string }) { return <p className="py-4 text-sm text-muted-foreground">{children}</p>; }

function MasterData({ products, customers, suppliers, equipment, onSaved }: { products: any[]; customers: any[]; suppliers: any[]; equipment: any[]; onSaved: () => void }) {
  const [kind, setKind] = useState("acabado");
  const [productName, setProductName] = useState("");
  const [productCode, setProductCode] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [equipmentName, setEquipmentName] = useState("");
  const createProduct = trpc.industrial.createProduct.useMutation({ onSuccess: () => { setProductName(""); setProductCode(""); onSaved(); toast.success("Produto cadastrado"); } });
  const createCustomer = trpc.industrial.createCustomer.useMutation({ onSuccess: () => { setCustomerName(""); onSaved(); toast.success("Cliente cadastrado"); } });
  const createSupplier = trpc.industrial.createSupplier.useMutation({ onSuccess: () => { setSupplierName(""); onSaved(); toast.success("Fornecedor cadastrado"); } });
  const createEquipment = trpc.industrial.createEquipment.useMutation({ onSuccess: () => { setEquipmentName(""); onSaved(); toast.success("Equipamento cadastrado"); } });
  return <div className="space-y-4">
    <Card><CardHeader><CardTitle className="text-base">Novo cadastro mestre</CardTitle></CardHeader><CardContent className="space-y-4">
      <form onSubmit={e => { e.preventDefault(); createProduct.mutate({ code: productCode, name: productName, kind: kind as any }); }} className="space-y-3"><p className="font-medium">Produto / insumo</p><Grid><Field label="Código"><Input required value={productCode} onChange={e => setProductCode(e.target.value)} /></Field><Field label="Nome"><Input required value={productName} onChange={e => setProductName(e.target.value)} /></Field><Field label="Tipo"><select className="h-9 rounded-md border bg-background px-3 text-sm" value={kind} onChange={e => setKind(e.target.value)}><option value="acabado">Acabado</option><option value="intermediario">Intermediário</option><option value="insumo">Insumo</option><option value="embalagem">Embalagem</option></select></Field><div className="flex items-end"><SaveButton pending={createProduct.isPending} /></div></Grid></form>
      <form onSubmit={e => { e.preventDefault(); createCustomer.mutate({ name: customerName }); }} className="space-y-3"><p className="font-medium">Cliente</p><Grid><Field label="Nome"><Input required value={customerName} onChange={e => setCustomerName(e.target.value)} /></Field><div className="flex items-end"><SaveButton pending={createCustomer.isPending} /></div></Grid></form>
      <form onSubmit={e => { e.preventDefault(); createSupplier.mutate({ name: supplierName }); }} className="space-y-3"><p className="font-medium">Fornecedor</p><Grid><Field label="Nome"><Input required value={supplierName} onChange={e => setSupplierName(e.target.value)} /></Field><div className="flex items-end"><SaveButton pending={createSupplier.isPending} /></div></Grid></form>
      <form onSubmit={e => { e.preventDefault(); createEquipment.mutate({ name: equipmentName }); }} className="space-y-3"><p className="font-medium">Máquina / equipamento</p><Grid><Field label="Nome"><Input required value={equipmentName} onChange={e => setEquipmentName(e.target.value)} /></Field><div className="flex items-end"><SaveButton pending={createEquipment.isPending} /></div></Grid></form>
    </CardContent></Card>
    <div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle className="text-base">Produtos ({products.length})</CardTitle></CardHeader><CardContent>{products.length ? products.map(item => <div key={item.id} className="flex justify-between border-b py-2 text-sm"><span>{item.code} · {item.name}</span><span className="text-muted-foreground">{item.kind}</span></div>) : <Empty>Nenhum produto cadastrado.</Empty>}</CardContent></Card><Card><CardHeader><CardTitle className="text-base">Parceiros e equipamentos</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p>Clientes: {customers.length}</p><p>Fornecedores: {suppliers.length}</p><p>Equipamentos: {equipment.length}</p></CardContent></Card></div>
  </div>;
}

function Purchases({ products, suppliers, orders, onSaved }: { products: any[]; suppliers: any[]; orders: any[]; onSaved: () => void }) {
  const [number, setNumber] = useState(""); const [supplierId, setSupplierId] = useState(""); const [productId, setProductId] = useState(""); const [quantity, setQuantity] = useState("1"); const [unitPrice, setUnitPrice] = useState("0");
  const mutation = trpc.industrial.createPurchaseOrder.useMutation({ onSuccess: () => { setNumber(""); onSaved(); toast.success("Pedido de compra criado"); } });
  return <Card><CardHeader><CardTitle className="text-base">Pedido de compra</CardTitle></CardHeader><CardContent className="space-y-4"><form onSubmit={e => { e.preventDefault(); mutation.mutate({ number, supplierId: supplierId ? Number(supplierId) : null, items: [{ productId: Number(productId), quantity, unitPrice }] }); }}><Grid><Field label="Número"><Input required value={number} onChange={e => setNumber(e.target.value)} /></Field><Field label="Fornecedor"><select required className="h-9 rounded-md border bg-background px-3 text-sm" value={supplierId} onChange={e => setSupplierId(e.target.value)}><option value="">Selecione</option>{suppliers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Produto"><select required className="h-9 rounded-md border bg-background px-3 text-sm" value={productId} onChange={e => setProductId(e.target.value)}><option value="">Selecione</option>{products.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Quantidade"><Input type="number" min="0.001" step="0.001" value={quantity} onChange={e => setQuantity(e.target.value)} /></Field><Field label="Preço unitário"><Input type="number" min="0" step="0.01" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} /></Field><div className="flex items-end"><SaveButton pending={mutation.isPending} /></div></Grid></form><div className="divide-y">{orders.length ? orders.map(order => <div key={order.id} className="flex justify-between py-2 text-sm"><span>Pedido {order.number}</span><span>{order.status} · R$ {order.totalAmount}</span></div>) : <Empty>Nenhum pedido de compra registrado.</Empty>}</div></CardContent></Card>;
}

function Quality({ products, inspections, onSaved }: { products: any[]; inspections: any[]; onSaved: () => void }) {
  const [productId, setProductId] = useState(""); const [lot, setLot] = useState(""); const [inspectionType, setInspectionType] = useState("recebimento"); const [result, setResult] = useState("");
  const mutation = trpc.industrial.createQualityInspection.useMutation({ onSuccess: () => { setLot(""); setResult(""); onSaved(); toast.success("Inspeção registrada"); } });
  return <Card><CardHeader><CardTitle className="text-base">Inspeções e não conformidades</CardTitle></CardHeader><CardContent className="space-y-4"><form onSubmit={e => { e.preventDefault(); mutation.mutate({ productId: productId ? Number(productId) : null, lot, inspectionType: inspectionType as any, result }); }}><Grid><Field label="Produto"><select className="h-9 rounded-md border bg-background px-3 text-sm" value={productId} onChange={e => setProductId(e.target.value)}><option value="">Sem vínculo</option>{products.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Lote"><Input value={lot} onChange={e => setLot(e.target.value)} /></Field><Field label="Tipo"><select className="h-9 rounded-md border bg-background px-3 text-sm" value={inspectionType} onChange={e => setInspectionType(e.target.value)}><option value="recebimento">Recebimento</option><option value="processo">Processo</option><option value="acabado">Acabado</option><option value="devolucao">Devolução</option></select></Field><Field label="Resultado"><Input value={result} onChange={e => setResult(e.target.value)} /></Field><div className="flex items-end"><SaveButton pending={mutation.isPending} /></div></Grid></form>{inspections.length ? inspections.map(item => <div key={item.id} className="flex justify-between border-b py-2 text-sm"><span>{item.inspectionType} · lote {item.lot || "—"}</span><span>{item.status} · {formatDate(item.inspectedAt)}</span></div>) : <Empty>Nenhuma inspeção registrada.</Empty>}</CardContent></Card>;
}

function Maintenance({ equipment, records, onSaved }: { equipment: any[]; records: any[]; onSaved: () => void }) {
  const [equipmentId, setEquipmentId] = useState(""); const [type, setType] = useState("preventiva"); const [description, setDescription] = useState("");
  const mutation = trpc.industrial.createMaintenanceRecord.useMutation({ onSuccess: () => { setDescription(""); onSaved(); toast.success("Ordem de manutenção criada"); } });
  return <Card><CardHeader><CardTitle className="text-base">Manutenção de equipamentos</CardTitle></CardHeader><CardContent className="space-y-4"><form onSubmit={e => { e.preventDefault(); mutation.mutate({ equipmentId: Number(equipmentId), type: type as any, description }); }}><Grid><Field label="Equipamento"><select required className="h-9 rounded-md border bg-background px-3 text-sm" value={equipmentId} onChange={e => setEquipmentId(e.target.value)}><option value="">Selecione</option>{equipment.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Tipo"><select className="h-9 rounded-md border bg-background px-3 text-sm" value={type} onChange={e => setType(e.target.value)}><option value="preventiva">Preventiva</option><option value="corretiva">Corretiva</option><option value="preditiva">Preditiva</option></select></Field><Field label="Descrição"><Input required value={description} onChange={e => setDescription(e.target.value)} /></Field><div className="flex items-end"><SaveButton pending={mutation.isPending} /></div></Grid></form>{records.length ? records.map(item => <div key={item.id} className="flex justify-between border-b py-2 text-sm"><span>{item.type} · {item.description}</span><span>{item.status} · prioridade {item.priority}</span></div>) : <Empty>Nenhuma manutenção registrada.</Empty>}</CardContent></Card>;
}

function Finance({ entries, onSaved }: { entries: any[]; onSaved: () => void }) {
  const [type, setType] = useState("pagar"); const [description, setDescription] = useState(""); const [amount, setAmount] = useState("0"); const [dueAt, setDueAt] = useState("");
  const mutation = trpc.industrial.createFinanceEntry.useMutation({ onSuccess: () => { setDescription(""); onSaved(); toast.success("Lançamento financeiro criado"); } });
  return <Card><CardHeader><CardTitle className="text-base">Contas a pagar e receber</CardTitle></CardHeader><CardContent className="space-y-4"><form onSubmit={e => { e.preventDefault(); mutation.mutate({ type: type as any, description, amount, dueAt: new Date(dueAt).toISOString() }); }}><Grid><Field label="Tipo"><select className="h-9 rounded-md border bg-background px-3 text-sm" value={type} onChange={e => setType(e.target.value)}><option value="pagar">A pagar</option><option value="receber">A receber</option></select></Field><Field label="Descrição"><Input required value={description} onChange={e => setDescription(e.target.value)} /></Field><Field label="Valor"><Input required type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></Field><Field label="Vencimento"><Input required type="date" value={dueAt} onChange={e => setDueAt(e.target.value)} /></Field><div className="flex items-end"><SaveButton pending={mutation.isPending} /></div></Grid></form>{entries.length ? entries.map(item => <div key={item.id} className="flex justify-between border-b py-2 text-sm"><span>{item.type} · {item.description}</span><span>R$ {item.amount} · {formatDate(item.dueAt)}</span></div>) : <Empty>Nenhum lançamento financeiro registrado.</Empty>}</CardContent></Card>;
}

function Sales({ customers, orders, onSaved }: { customers: any[]; orders: any[]; onSaved: () => void }) {
  const [number, setNumber] = useState(""); const [customerId, setCustomerId] = useState(""); const [totalAmount, setTotalAmount] = useState("0"); const [promisedAt, setPromisedAt] = useState("");
  const mutation = trpc.industrial.createSalesOrder.useMutation({ onSuccess: () => { setNumber(""); onSaved(); toast.success("Pedido de venda criado"); } });
  return <Card><CardHeader><CardTitle className="text-base">Pedidos de clientes e expedição</CardTitle></CardHeader><CardContent className="space-y-4"><form onSubmit={e => { e.preventDefault(); mutation.mutate({ number, customerId: customerId ? Number(customerId) : null, totalAmount, promisedAt: promisedAt ? new Date(promisedAt).toISOString() : null }); }}><Grid><Field label="Número"><Input required value={number} onChange={e => setNumber(e.target.value)} /></Field><Field label="Cliente"><select className="h-9 rounded-md border bg-background px-3 text-sm" value={customerId} onChange={e => setCustomerId(e.target.value)}><option value="">Sem vínculo</option>{customers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Valor"><Input type="number" min="0" step="0.01" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} /></Field><Field label="Entrega prevista"><Input type="date" value={promisedAt} onChange={e => setPromisedAt(e.target.value)} /></Field><div className="flex items-end"><SaveButton pending={mutation.isPending} /></div></Grid></form>{orders.length ? orders.map(item => <div key={item.id} className="flex justify-between border-b py-2 text-sm"><span>Pedido {item.number}</span><span>{item.status} · R$ {item.totalAmount}</span></div>) : <Empty>Nenhum pedido de venda registrado.</Empty>}</CardContent></Card>;
}

function Production({ products, orders, onSaved }: { products: any[]; orders: any[]; onSaved: () => void }) {
  const [number, setNumber] = useState(""); const [productId, setProductId] = useState(""); const [plannedQuantity, setPlannedQuantity] = useState("1"); const [completeId, setCompleteId] = useState(""); const [producedQuantity, setProducedQuantity] = useState("1");
  const create = trpc.industrial.createProductionOrder.useMutation({ onSuccess: () => { setNumber(""); onSaved(); toast.success("Ordem de produção criada"); } });
  const complete = trpc.industrial.completeProductionOrder.useMutation({ onSuccess: () => { setCompleteId(""); onSaved(); toast.success("Ordem concluída e estoque atualizado"); }, onError: error => toast.error(error.message) });
  return <Card><CardHeader><CardTitle className="text-base">Ordens de produção</CardTitle></CardHeader><CardContent className="space-y-4"><form onSubmit={e => { e.preventDefault(); create.mutate({ number, productId: Number(productId), plannedQuantity }); }}><Grid><Field label="Número"><Input required value={number} onChange={e => setNumber(e.target.value)} /></Field><Field label="Produto"><select required className="h-9 rounded-md border bg-background px-3 text-sm" value={productId} onChange={e => setProductId(e.target.value)}><option value="">Selecione</option>{products.filter(item => item.kind === "acabado").map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Quantidade planejada"><Input type="number" min="0.001" step="0.001" value={plannedQuantity} onChange={e => setPlannedQuantity(e.target.value)} /></Field><div className="flex items-end"><SaveButton pending={create.isPending} /></div></Grid></form><div className="rounded-lg border border-primary/20 bg-primary/5 p-3"><p className="mb-2 text-sm font-medium">Concluir ordem com consumo da ficha técnica</p><div className="flex flex-wrap gap-2"><Input className="max-w-40" placeholder="ID da ordem" value={completeId} onChange={e => setCompleteId(e.target.value)} /><Input className="max-w-40" type="number" min="0.001" step="0.001" value={producedQuantity} onChange={e => setProducedQuantity(e.target.value)} /><Button disabled={complete.isPending || !completeId} onClick={() => complete.mutate({ orderId: Number(completeId), producedQuantity })}>Concluir e movimentar estoque</Button></div></div>{orders.length ? orders.map(item => <div key={item.id} className="flex justify-between border-b py-2 text-sm"><span>#{item.id} · {item.number}</span><span>{item.status} · planejado {item.plannedQuantity}</span></div>) : <Empty>Nenhuma ordem de produção registrada.</Empty>}</CardContent></Card>;
}

function Costs({ products, orders, entries, onSaved }: { products: any[]; orders: any[]; entries: any[]; onSaved: () => void }) {
  const [description, setDescription] = useState(""); const [amount, setAmount] = useState("0"); const [category, setCategory] = useState("material"); const [productId, setProductId] = useState(""); const [productionOrderId, setProductionOrderId] = useState("");
  const create = trpc.industrial.createCostEntry.useMutation({ onSuccess: () => { setDescription(""); onSaved(); toast.success("Custo registrado"); } });
  const total = entries.reduce((sum, item) => sum + Number(item.amount), 0);
  return <Card><CardHeader><CardTitle className="text-base">Custos industriais · total registrado R$ {total.toFixed(2)}</CardTitle></CardHeader><CardContent className="space-y-4"><form onSubmit={e => { e.preventDefault(); create.mutate({ category: category as any, description, amount, productId: productId ? Number(productId) : null, productionOrderId: productionOrderId ? Number(productionOrderId) : null }); }}><Grid><Field label="Categoria"><select className="h-9 rounded-md border bg-background px-3 text-sm" value={category} onChange={e => setCategory(e.target.value)}><option value="material">Material</option><option value="mao_obra">Mão de obra</option><option value="energia">Energia</option><option value="manutencao">Manutenção</option><option value="indireto">Indireto</option><option value="perda">Perda</option><option value="outro">Outro</option></select></Field><Field label="Descrição"><Input required value={description} onChange={e => setDescription(e.target.value)} /></Field><Field label="Valor"><Input required type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></Field><Field label="Produto"><select className="h-9 rounded-md border bg-background px-3 text-sm" value={productId} onChange={e => setProductId(e.target.value)}><option value="">Sem vínculo</option>{products.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><div className="flex items-end"><SaveButton pending={create.isPending} /></div></Grid></form>{entries.length ? entries.map(item => <div key={item.id} className="flex justify-between border-b py-2 text-sm"><span>{item.category} · {item.description}</span><span>R$ {item.amount}</span></div>) : <Empty>Nenhum custo registrado.</Empty>}</CardContent></Card>;
}

function Audit({ events }: { events: any[] }) {
  return <Card><CardHeader><CardTitle className="text-base">Histórico de operações críticas</CardTitle></CardHeader><CardContent>{events.length ? events.map(item => <div key={item.id} className="border-b py-2 text-sm"><div className="flex justify-between"><span>{item.action} · {item.entityType} #{item.entityId ?? "—"}</span><span className="text-muted-foreground">{formatDate(item.createdAt)}</span></div><p className="mt-1 text-xs text-muted-foreground">{item.details || "Sem detalhes"}</p></div>) : <Empty>Nenhuma operação crítica registrada.</Empty>}</CardContent></Card>;
}
