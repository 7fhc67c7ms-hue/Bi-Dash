import { useMemo, useState } from "react";
import { Bot, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AIChatBox, type Message } from "./AIChatBox";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { trpc } from "@/lib/trpc";
import type { ProductionAnalysisReportData } from "@/lib/analysisPdf";

type AssistantData = ProductionAnalysisReportData & {
  totalRegistros: number;
  clientes: string[];
  tiposPlaca: string[];
};

function buildContext(data: AssistantData, filterDescription: string) {
  const topClientes = data.analiseClientes.slice(0, 10).map(item => ({
    cliente: item.cliente,
    total: item.total,
    participacao: item.participacao,
    crescimentoPercentual: item.crescimentoPercentual,
  }));
  const topTipos = data.analiseTipos.slice(0, 10).map(item => ({
    tipoPlaca: item.tipoPlaca,
    categoria: item.categoria,
    total: item.total,
    participacao: item.participacao,
  }));
  return JSON.stringify({
    filtros: filterDescription,
    totalRegistros: data.totalRegistros,
    kpis: data.kpis,
    metricasExecutivas: data.metricasExecutivas,
    qualidadeImportacao: data.metricasAvancadas.qualidadeImportacao,
    topClientes,
    topTipos,
    concentracao: data.concentracao,
    mixCategorias: data.mixCategorias,
    comparacaoPeriodos: data.comparacaoPeriodos,
    relatorioDeterministico: data.relatorioDeterministico,
    estoque: "O estoque é um módulo separado e não foi incluído neste contexto. Não invente saldo de estoque.",
  }, null, 2);
}

export default function ProductionAssistant({
  data,
  filterDescription,
}: {
  data: AssistantData;
  filterDescription: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const context = useMemo(() => buildContext(data, filterDescription), [data, filterDescription]);
  const chatMutation = trpc.assistant.chat.useMutation({
    onSuccess: response => {
      setMessages(current => [...current, { role: "assistant", content: response.content }]);
    },
    onError: error => toast.error(error.message || "Não foi possível consultar o assistente."),
  });

  const sendMessage = (content: string) => {
    const nextMessages = [...messages, { role: "user" as const, content }];
    setMessages(nextMessages);
    chatMutation.mutate({
      messages: nextMessages
        .filter(message => message.role === "user" || message.role === "assistant")
        .map(message => ({ role: message.role as "user" | "assistant", content: message.content })),
      context,
    });
  };

  return (
    <Card id="assistente" data-print-block className="scroll-mt-6 border-primary/20 bg-card shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Bot className="h-5 w-5 text-primary" />
          Assistente do BI
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Faça perguntas sobre o recorte filtrado. O assistente não inventa dados financeiros ou datas que não existam na base.
        </p>
      </CardHeader>
      <CardContent>
        <AIChatBox
          messages={messages}
          onSendMessage={sendMessage}
          isLoading={chatMutation.isPending}
          height="min(560px, 70vh)"
          emptyStateMessage="Pergunte ao BI sobre a produção atual"
          suggestedPrompts={[
            "Quais são os três maiores clientes neste recorte?",
            "O que mudou entre os períodos A e B?",
            "Qual tipo de placa merece mais atenção?",
            "Quais dados financeiros ainda não estão disponíveis?",
          ]}
        />
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Contexto enviado: filtros atuais, KPIs, clientes, tipos, mix e comparação.
        </div>
      </CardContent>
    </Card>
  );
}
