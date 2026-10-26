import { useState } from "react";
import { Boxes, CheckCircle2, Database, MapPin, Ruler, Tags } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const fieldClass = "mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground";
const itemTypeLabel: Record<string, string> = {
  produto_acabado: "Produto acabado",
  intermediario: "Intermediário",
  em_processo: "Em processo",
  materia_prima: "Matéria-prima",
  insumo: "Insumo",
  componente: "Componente",
  embalagem: "Embalagem",
};
const locationTypeLabel: Record<string, string> = {
  deposito: "Depósito",
  setor: "Setor",
  localizacao: "Localização",
};

function SectionHeading({ icon: Icon, title, description }: { icon: typeof Boxes; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-4 w-4" /></span>
      <div><h3 className="font-semibold">{title}</h3><p className="text-xs text-muted-foreground">{description}</p></div>
    </div>
  );
}

export default function MasterDataManagement() {
  const overviewQuery = trpc.masterData.overview.useQuery();
  const utils = trpc.useUtils();
  const [unitCode, setUnitCode] = useState("");
  const [unitName, setUnitName] = useState("");
  const [unitDecimals, setUnitDecimals] = useState("0");
  const [categoryName, setCategoryName] = useState("");
  const [itemCode, setItemCode] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemType, setItemType] = useState("produto_acabado");
  const [itemUnitId, setItemUnitId] = useState("");
  const [itemCategoryId, setItemCategoryId] = useState("");
  const [legacyType, setLegacyType] = useState("");
  const [locationName, setLocationName] = useState("");
  const [locationType, setLocationType] = useState("deposito");

  const refresh = () => void utils.masterData.overview.invalidate();
  const createUnit = trpc.masterData.createUnit.useMutation({
    onSuccess: () => { setUnitCode(""); setUnitName(""); setUnitDecimals("0"); refresh(); toast.success("Unidade cadastrada."); },
    onError: error => toast.error(error.message),
  });
  const createCategory = trpc.masterData.createCategory.useMutation({
    onSuccess: () => { setCategoryName(""); refresh(); toast.success("Categoria cadastrada."); },
    onError: error => toast.error(error.message),
  });
  const createItem = trpc.masterData.createItem.useMutation({
    onSuccess: () => { setItemCode(""); setItemName(""); setLegacyType(""); refresh(); toast.success("Item cadastrado."); },
    onError: error => toast.error(error.message),
  });
  const createLocation = trpc.masterData.createLocation.useMutation({
    onSuccess: () => { setLocationName(""); refresh(); toast.success("Localização cadastrada."); },
    onError: error => toast.error(error.message),
  });
  const setUnitActive = trpc.masterData.setUnitActive.useMutation({ onSuccess: refresh, onError: error => toast.error(error.message) });
  const setCategoryActive = trpc.masterData.setCategoryActive.useMutation({ onSuccess: refresh, onError: error => toast.error(error.message) });
  const setItemActive = trpc.masterData.setItemActive.useMutation({ onSuccess: refresh, onError: error => toast.error(error.message) });
  const setLocationActive = trpc.masterData.setLocationActive.useMutation({ onSuccess: refresh, onError: error => toast.error(error.message) });

  const data = overviewQuery.data;
  const submitUnit = (event: React.FormEvent) => {
    event.preventDefault();
    createUnit.mutate({ codigo: unitCode, nome: unitName, casasDecimais: Number(unitDecimals) });
  };
  const submitCategory = (event: React.FormEvent) => {
    event.preventDefault();
    createCategory.mutate({ nome: categoryName });
  };
  const submitItem = (event: React.FormEvent) => {
    event.preventDefault();
    if (!itemUnitId) { toast.error("Cadastre ou selecione uma unidade de medida."); return; }
    createItem.mutate({
      codigo: itemCode,
      nome: itemName,
      tipo: itemType as "produto_acabado" | "intermediario" | "em_processo" | "materia_prima" | "insumo" | "componente" | "embalagem",
      unidadeId: Number(itemUnitId),
      categoriaId: itemCategoryId ? Number(itemCategoryId) : null,
      tipoPlacaLegado: legacyType || null,
    });
  };
  const submitLocation = (event: React.FormEvent) => {
    event.preventDefault();
    createLocation.mutate({ nome: locationName, tipo: locationType as "deposito" | "setor" | "localizacao" });
  };

  return (
    <section id="cadastros" className="scroll-mt-6 space-y-5" aria-label="Cadastros mestres">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Bloco 3 · base cadastral</p>
        <h2 className="mt-1 text-2xl font-semibold">Cadastros mestres</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Estruturas com identificadores próprios para preparar estoque, fichas técnicas e produção. Os registros históricos de placa continuam preservados.</p>
      </div>
      {overviewQuery.isLoading ? <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Carregando cadastros…</p> : overviewQuery.isError ? <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">Não foi possível carregar os cadastros mestres.</p> : (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            <Card><CardHeader><SectionHeading icon={Ruler} title="Unidades de medida" description="Código consistente e casas decimais permitidas." /></CardHeader><CardContent className="space-y-4">
              <form onSubmit={submitUnit} className="grid gap-3 sm:grid-cols-[0.8fr_1.5fr_0.7fr_auto] sm:items-end">
                <label className="text-xs text-muted-foreground">Código<input className={fieldClass} required value={unitCode} onChange={event => setUnitCode(event.target.value)} placeholder="UN" /></label>
                <label className="text-xs text-muted-foreground">Nome<input className={fieldClass} required value={unitName} onChange={event => setUnitName(event.target.value)} placeholder="Unidade" /></label>
                <label className="text-xs text-muted-foreground">Decimais<input className={fieldClass} type="number" min="0" max="6" value={unitDecimals} onChange={event => setUnitDecimals(event.target.value)} /></label>
                <Button type="submit" disabled={createUnit.isPending}>Adicionar</Button>
              </form>
              <div className="space-y-2">{data?.units.map(unit => <div key={unit.id} className="flex items-center justify-between rounded-lg border p-3 text-sm"><span><b>{unit.codigo}</b> · {unit.nome} <span className="text-xs text-muted-foreground">({unit.casasDecimais} casas)</span></span><Button size="sm" variant="ghost" onClick={() => setUnitActive.mutate({ id: unit.id, ativo: !unit.ativo })}>{unit.ativo ? "Ativa" : "Reativar"}</Button></div>)}</div>
            </CardContent></Card>

            <Card><CardHeader><SectionHeading icon={Tags} title="Categorias e famílias" description="Organização dos itens sem duplicar nomes livres." /></CardHeader><CardContent className="space-y-4">
              <form onSubmit={submitCategory} className="flex flex-col gap-3 sm:flex-row sm:items-end"><label className="flex-1 text-xs text-muted-foreground">Nome da categoria<input className={fieldClass} required value={categoryName} onChange={event => setCategoryName(event.target.value)} placeholder="Placas memoriais" /></label><Button type="submit" disabled={createCategory.isPending}>Adicionar</Button></form>
              <div className="space-y-2">{data?.categories.map(category => <div key={category.id} className="flex items-center justify-between rounded-lg border p-3 text-sm"><span>{category.nome}</span><Button size="sm" variant="ghost" onClick={() => setCategoryActive.mutate({ id: category.id, ativo: !category.ativo })}>{category.ativo ? "Ativa" : "Reativar"}</Button></div>)}</div>
            </CardContent></Card>

            <Card className="xl:col-span-2"><CardHeader><SectionHeading icon={Boxes} title="Produtos, materiais e insumos" description="Itens com unidade, categoria, tipo industrial e vínculo opcional ao nome legado de placa." /></CardHeader><CardContent className="space-y-4">
              <form onSubmit={submitItem} className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                <label className="text-xs text-muted-foreground">Código<input className={fieldClass} required value={itemCode} onChange={event => setItemCode(event.target.value)} placeholder="PLACA-001" /></label>
                <label className="text-xs text-muted-foreground">Nome<input className={fieldClass} required value={itemName} onChange={event => setItemName(event.target.value)} placeholder="Placa memorial 20×30" /></label>
                <label className="text-xs text-muted-foreground">Tipo<select className={fieldClass} value={itemType} onChange={event => setItemType(event.target.value)}>{Object.entries(itemTypeLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label className="text-xs text-muted-foreground">Unidade<select className={fieldClass} required value={itemUnitId} onChange={event => setItemUnitId(event.target.value)}><option value="">Selecione</option>{data?.units.filter(unit => unit.ativo).map(unit => <option key={unit.id} value={unit.id}>{unit.codigo} · {unit.nome}</option>)}</select></label>
                <label className="text-xs text-muted-foreground">Categoria<select className={fieldClass} value={itemCategoryId} onChange={event => setItemCategoryId(event.target.value)}><option value="">Sem categoria</option>{data?.categories.filter(category => category.ativo).map(category => <option key={category.id} value={category.id}>{category.nome}</option>)}</select></label>
                <label className="text-xs text-muted-foreground">Tipo legado<input className={fieldClass} value={legacyType} onChange={event => setLegacyType(event.target.value)} placeholder="RET 20x30" /></label>
                <Button type="submit" disabled={createItem.isPending} className="md:col-span-2 xl:col-span-6 xl:w-fit">Cadastrar item</Button>
              </form>
              <div className="overflow-x-auto rounded-lg border"><table className="w-full min-w-[820px] text-sm"><thead className="bg-muted/60"><tr>{["Código", "Nome", "Tipo", "Unidade", "Categoria", "Situação", "Ação"].map(label => <th key={label} className="px-3 py-3 text-left text-xs uppercase tracking-wide text-muted-foreground">{label}</th>)}</tr></thead><tbody>{data?.items.map(item => { const unit = data.units.find(value => value.id === item.unidadeId); const category = data.categories.find(value => value.id === item.categoriaId); return <tr key={item.id} className="border-t"><td className="px-3 py-3 font-medium">{item.codigo}</td><td className="px-3 py-3">{item.nome}</td><td className="px-3 py-3">{itemTypeLabel[item.tipo]}</td><td className="px-3 py-3">{unit?.codigo ?? "—"}</td><td className="px-3 py-3">{category?.nome ?? "—"}</td><td className="px-3 py-3">{item.ativo ? <span className="text-emerald-600">Ativo</span> : <span className="text-muted-foreground">Inativo</span>}</td><td className="px-3 py-3"><Button size="sm" variant="ghost" onClick={() => setItemActive.mutate({ id: item.id, ativo: !item.ativo })}>{item.ativo ? "Inativar" : "Reativar"}</Button></td></tr>; })}</tbody></table></div>
            </CardContent></Card>

            <Card className="xl:col-span-2"><CardHeader><SectionHeading icon={MapPin} title="Depósitos, setores e localizações" description="Estrutura física preparada para separar saldos nos próximos blocos." /></CardHeader><CardContent className="space-y-4">
              <form onSubmit={submitLocation} className="grid gap-3 sm:grid-cols-[1fr_220px_auto] sm:items-end"><label className="text-xs text-muted-foreground">Nome<input className={fieldClass} required value={locationName} onChange={event => setLocationName(event.target.value)} placeholder="Depósito principal" /></label><label className="text-xs text-muted-foreground">Tipo<select className={fieldClass} value={locationType} onChange={event => setLocationType(event.target.value)}>{Object.entries(locationTypeLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><Button type="submit" disabled={createLocation.isPending}>Adicionar</Button></form>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{data?.locations.map(location => <div key={location.id} className="flex items-center justify-between rounded-lg border p-3 text-sm"><span><b>{locationTypeLabel[location.tipo]}</b><br />{location.nome}</span><Button size="sm" variant="ghost" onClick={() => setLocationActive.mutate({ id: location.id, ativo: !location.ativo })}>{location.ativo ? "Ativa" : "Reativar"}</Button></div>)}</div>
            </CardContent></Card>
          </div>
          <p className="flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Cadastros novos usam IDs e ficam isolados por usuário; produção, estoque e insumos legados não são alterados automaticamente.</p>
        </>
      )}
    </section>
  );
}
