import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, CheckCircle, AlertCircle, Loader2, FileText } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface PDFUploaderProps {
  onSuccess: () => void;
}

const MAX_FILE_SIZE = 15 * 1024 * 1024;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Não foi possível ler o ficheiro."));
    reader.readAsDataURL(file);
  });
}

export default function PDFUploader({ onSuccess }: PDFUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = trpc.production.uploadPDF.useMutation();

  const acceptFile = (selectedFile: File | undefined) => {
    if (!selectedFile) return;
    if (selectedFile.type !== "application/pdf" && !selectedFile.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Selecione um ficheiro PDF válido.");
      return;
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      toast.error("O PDF deve ter no máximo 15 MB.");
      return;
    }
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Selecione um PDF antes de continuar.");
      return;
    }
    try {
      const fileBase64 = await fileToBase64(file);
      const result = await uploadMutation.mutateAsync({ fileBase64, fileName: file.name, ano: year });
      toast.success(result.duplicate
        ? "Este PDF já foi importado; nenhum registro duplicado foi criado."
        : `${result.registrosInseridos} registros importados${result.linhasRejeitadas ? ` · ${result.linhasRejeitadas} linhas rejeitadas` : ""}${result.duplicadosEvitados ? ` · ${result.duplicadosEvitados} duplicados evitados` : ""}.`);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao processar o PDF.");
    }
  };

  const clearFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Card className="bg-card/90 border-border/70 shadow-xl shadow-black/10">
      <CardHeader>
        <CardTitle className="text-foreground">Importar produção</CardTitle>
        <p className="text-sm text-muted-foreground">A IA lê o romaneio e sugere os registros. Revise os dados depois da importação.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") fileInputRef.current?.click(); }}
          onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
          onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
          onDragLeave={(event) => { event.preventDefault(); setIsDragging(false); }}
          onDrop={(event) => { event.preventDefault(); setIsDragging(false); acceptFile(event.dataTransfer.files?.[0]); }}
          className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${isDragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/70 hover:bg-muted/30"}`}
        >
          <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" onChange={(event) => acceptFile(event.target.files?.[0])} className="sr-only" />
          {file ? <FileText className="mx-auto mb-3 h-9 w-9 text-primary" /> : <Upload className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />}
          <p className="font-medium text-foreground">{file ? file.name : "Arraste o PDF aqui ou clique para selecionar"}</p>
          <p className="mt-1 text-xs text-muted-foreground">PDF até 15 MB · os ficheiros são processados com segurança</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <label className="space-y-1 text-sm text-muted-foreground">
            Ano dos registros
            <Input type="number" min={2000} max={2100} value={year} onChange={(event) => setYear(Number(event.target.value))} className="w-36 bg-background" />
          </label>
          <div className="flex gap-2">
            <Button variant="outline" onClick={clearFile} disabled={!file || uploadMutation.isPending}>Limpar</Button>
            <Button onClick={handleUpload} disabled={!file || uploadMutation.isPending} className="bg-primary text-primary-foreground">
              {uploadMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />A processar…</> : <><Upload className="mr-2 h-4 w-4" />Importar PDF</>}
            </Button>
          </div>
        </div>

        {uploadMutation.isPending && <div className="flex items-center gap-2 text-sm text-primary"><Loader2 className="h-4 w-4 animate-spin" />A IA está a extrair e validar os registros.</div>}
        {uploadMutation.isSuccess && <div className="flex items-center gap-2 text-sm text-emerald-400"><CheckCircle className="h-4 w-4" />Importação concluída.</div>}
        {uploadMutation.isError && <div className="flex items-start gap-2 text-sm text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span><strong>A importação falhou.</strong> {uploadMutation.error?.message || "Verifique o PDF e tente novamente."}</span></div>}
      </CardContent>
    </Card>
  );
}
