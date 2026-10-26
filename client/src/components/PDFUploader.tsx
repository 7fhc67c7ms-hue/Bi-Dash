import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, CheckCircle, AlertCircle, Loader2, FileText, X, ListChecks } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface PDFUploaderProps { onSuccess: () => void; }
type QueueStatus = "aguardando" | "processando" | "concluido" | "duplicado" | "erro";
type QueueFile = { id: string; file: File; status: QueueStatus; message?: string; registros?: number };
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const MAX_QUEUE_SIZE = 20;

function fileToBase64(file: File): Promise<string> { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1] ?? ""); reader.onerror = () => reject(new Error("Não foi possível ler o ficheiro.")); reader.readAsDataURL(file); }); }
function fileId(file: File) { return `${file.name}-${file.size}-${file.lastModified}`; }
const statusText: Record<QueueStatus, string> = { aguardando: "Aguardando", processando: "Processando", concluido: "Concluído", duplicado: "Duplicado evitado", erro: "Erro" };

export default function PDFUploader({ onSuccess }: PDFUploaderProps) {
  const [queue, setQueue] = useState<QueueFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = trpc.production.uploadPDF.useMutation();

  const addFiles = (selected: FileList | File[] | undefined) => {
    if (!selected) return;
    const incoming = Array.from(selected);
    const available = MAX_QUEUE_SIZE - queue.length;
    const accepted: QueueFile[] = [];
    for (const file of incoming.slice(0, available)) {
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) { toast.error(`${file.name}: selecione um PDF válido.`); continue; }
      if (file.size > MAX_FILE_SIZE) { toast.error(`${file.name}: o PDF deve ter no máximo 15 MB.`); continue; }
      if (queue.some(item => item.id === fileId(file)) || accepted.some(item => item.id === fileId(file))) continue;
      accepted.push({ id: fileId(file), file, status: "aguardando" });
    }
    if (incoming.length > available) toast.warning(`A fila aceita no máximo ${MAX_QUEUE_SIZE} PDFs.`);
    setQueue(current => [...current, ...accepted]);
  };

  const processQueue = async () => {
    if (isProcessing) return;
    const pending = queue.filter(item => item.status === "aguardando" || item.status === "erro");
    if (!pending.length) { toast.info("Não há PDFs aguardando processamento."); return; }
    setIsProcessing(true);
    let completed = 0;
    for (const item of pending) {
      setQueue(current => current.map(entry => entry.id === item.id ? { ...entry, status: "processando", message: undefined } : entry));
      try {
        const fileBase64 = await fileToBase64(item.file);
        const result = await uploadMutation.mutateAsync({ fileBase64, fileName: item.file.name, ano: year });
        const status: QueueStatus = result.duplicate ? "duplicado" : "concluido";
        setQueue(current => current.map(entry => entry.id === item.id ? { ...entry, status, registros: result.registrosInseridos, message: result.duplicate ? "Nenhum registro duplicado foi criado." : `${result.registrosInseridos} registros importados.` } : entry));
        completed += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erro ao processar o PDF.";
        setQueue(current => current.map(entry => entry.id === item.id ? { ...entry, status: "erro", message } : entry));
      }
    }
    setIsProcessing(false);
    if (completed > 0) onSuccess();
    toast.success(`Fila processada: ${completed} de ${pending.length} arquivo(s) concluído(s).`);
  };

  const clearQueue = () => { if (!isProcessing) { setQueue([]); if (fileInputRef.current) fileInputRef.current.value = ""; } };
  const removeItem = (id: string) => { if (!isProcessing) setQueue(current => current.filter(item => item.id !== id)); };
  const pendingCount = queue.filter(item => item.status === "aguardando" || item.status === "erro").length;
  const doneCount = queue.filter(item => item.status === "concluido" || item.status === "duplicado").length;

  return <Card className="border-border/70 bg-card/90 shadow-xl shadow-black/10">
    <CardHeader><CardTitle className="flex items-center gap-2 text-foreground"><ListChecks className="h-5 w-5 text-primary" />Importar produção em fila</CardTitle><p className="text-sm text-muted-foreground">Selecione até {MAX_QUEUE_SIZE} PDFs. Eles serão enviados um por vez; cada arquivo recebe seu próprio resultado.</p></CardHeader>
    <CardContent className="space-y-4">
      <div role="button" tabIndex={0} onClick={() => fileInputRef.current?.click()} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") fileInputRef.current?.click(); }} onDragEnter={event => { event.preventDefault(); setIsDragging(true); }} onDragOver={event => { event.preventDefault(); setIsDragging(true); }} onDragLeave={event => { event.preventDefault(); setIsDragging(false); }} onDrop={event => { event.preventDefault(); setIsDragging(false); addFiles(event.dataTransfer.files); }} className={`cursor-pointer rounded-xl border-2 border-dashed p-7 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${isDragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/70 hover:bg-muted/30"}`}>
        <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" multiple onChange={event => { addFiles(event.target.files ?? undefined); event.currentTarget.value = ""; }} className="sr-only" />
        <Upload className="mx-auto mb-3 h-9 w-9 text-muted-foreground" /><p className="font-medium text-foreground">Arraste vários PDFs ou clique para selecionar</p><p className="mt-1 text-xs text-muted-foreground">Até 20 PDFs · máximo de 15 MB por arquivo · processamento sequencial</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><label className="space-y-1 text-sm text-muted-foreground">Ano dos registros<Input type="number" min={2000} max={2100} value={year} onChange={event => setYear(Number(event.target.value))} className="w-36 bg-background" /></label><div className="flex gap-2"><Button variant="outline" onClick={clearQueue} disabled={!queue.length || isProcessing}>Limpar fila</Button><Button onClick={processQueue} disabled={!pendingCount || isProcessing} className="bg-primary text-primary-foreground">{isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processando fila…</> : <><Upload className="mr-2 h-4 w-4" />Processar {pendingCount ? `${pendingCount} PDF(s)` : "fila"}</>}</Button></div></div>
      {queue.length > 0 && <div className="space-y-2"><div className="flex justify-between text-xs text-muted-foreground"><span>{queue.length}/{MAX_QUEUE_SIZE} na fila</span><span>{doneCount} finalizado(s) · {pendingCount} pendente(s)</span></div>{queue.map((item, index) => <div key={item.id} className="flex items-center gap-3 rounded-lg border bg-background/60 p-3"><FileText className="h-4 w-4 shrink-0 text-primary" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{index + 1}. {item.file.name}</p><p className={`text-xs ${item.status === "erro" ? "text-destructive" : item.status === "concluido" || item.status === "duplicado" ? "text-emerald-600 dark:text-emerald-400" : item.status === "processando" ? "text-primary" : "text-muted-foreground"}`}>{item.status === "processando" && <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />}{statusText[item.status]}{item.message ? ` · ${item.message}` : ""}</p></div>{item.status === "concluido" || item.status === "duplicado" ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : item.status === "erro" ? <AlertCircle className="h-4 w-4 text-destructive" /> : !isProcessing ? <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} aria-label={`Remover ${item.file.name}`}><X className="h-4 w-4" /></Button> : null}</div>)}</div>}
    </CardContent>
  </Card>;
}
