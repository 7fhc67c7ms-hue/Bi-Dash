import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import type {
  ClientAnalysis,
  ClientTypeMatrix,
  ConcentrationAnalysis,
  ExecutiveMetrics,
  MixCategory,
  PeriodComparison,
  ReportOptions,
  SeasonalityAnalysis,
  TypeAnalysis,
} from "@shared/analytics";

export interface PdfSection {
  title: string;
  columns: string[];
  rows: Array<Array<string | number>>;
}

export interface ProductionAnalysisReportData {
  kpis: {
    totalProducao: number;
    numeroPedidos: number;
    ticketMedio: number;
    produtoEstrela: string;
  };
  metricasAvancadas: {
    totalClientes: number;
    totalProdutos: number;
    quantidadeClientesObras: number;
    participacaoObras: number;
    participacaoTop5Clientes: number;
    mesPico: string;
    crescimentoUltimoMes: number | null;
    mediaPorPedido: number;
    qualidadeImportacao: {
      validas: number;
      rejeitadas: number;
      duplicados: number;
    };
  };
  metricasExecutivas: ExecutiveMetrics;
  analiseClientes: ClientAnalysis[];
  analiseTipos: TypeAnalysis[];
  concentracao: ConcentrationAnalysis;
  mixCategorias: MixCategory[];
  evolucaoAcumulada: Array<{
    periodo: string;
    mes: string;
    ano: number;
    quantidade: number;
    acumulado: number;
  }>;
  sazonalidade: SeasonalityAnalysis;
  matrizClienteTipo: ClientTypeMatrix;
  comparacaoPeriodos: PeriodComparison;
  relatorioDeterministico: string;
  tabelaProducao: Array<{
    cliente: string;
    itens: Array<{ tipoPlaca: string; quantidade: number }>;
    total: number;
  }>;
  rankingComuns: Array<{ posicao: number; nome: string; quantidade: number }>;
  rankingObras: Array<{ posicao: number; nome: string; quantidade: number }>;
  topProdutos: Array<{ nome: string; quantidade: number }>;
  resumoMensal: Array<{
    mes: string;
    total: number;
    numeroPedidos: number;
    modelosAtivos: number;
    modeloEstrela: string;
    participacaoModeloEstrela: number;
    variacaoPercentual: number | null;
  }>;
  modelosPorMes: Array<{
    mes: string;
    tipoPlaca: string;
    quantidade: number;
    participacaoMes: number;
  }>;
  matrizModeloMes: {
    meses: string[];
    linhas: Array<{
      tipoPlaca: string;
      valores: Record<string, number>;
      total: number;
    }>;
  };
  analiseMixModelos: Array<{
    tipoPlaca: string;
    total: number;
    participacao: number;
    mesesAtivos: number;
    mediaMensal: number;
    mesPico: string;
    quantidadeMesPico: number;
  }>;
  comparacaoMeses: {
    meses: string[];
    linhas: Array<{
      tipoPlaca: string;
      valores: Record<string, number>;
      total: number;
      diferencaPrimeiroUltimo: number;
      variacaoPercentual: number | null;
    }>;
    totais: Array<{
      mes: string;
      total: number;
      variacaoPercentual: number | null;
    }>;
  };
}

function safeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

const finiteNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;
const safeText = (value: unknown, fallback = "—") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};
const formatNumber = (value: unknown) => finiteNumber(value).toLocaleString("pt-BR");
const formatPercent = (value: unknown) =>
  value === null || value === undefined ? "—" : `${finiteNumber(value).toLocaleString("pt-BR")}%`;

function savePdfDocument(doc: jsPDF, fileName: string) {
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Exporta a própria análise renderizada, preservando a aparência da aba ativa. */
export async function downloadRenderedAnalysisPdf({
  element,
  fileName = "relatorio-producao-visual",
}: {
  element: HTMLElement;
  fileName?: string;
}) {
  await document.fonts?.ready;
  const canvas = await html2canvas(element, {
    backgroundColor: getComputedStyle(element).backgroundColor || "#ffffff",
    scale: Math.min(2, window.devicePixelRatio || 1),
    useCORS: true,
    logging: false,
    width: element.scrollWidth,
    height: element.scrollHeight,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
    scrollX: 0,
    scrollY: -window.scrollY,
  });
  const pageWidth = 297;
  const pageHeight = 210;
  const pageHeightPx = Math.max(1, Math.floor((canvas.width * pageHeight) / pageWidth));
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  let page = 0;
  for (let sourceY = 0; sourceY < canvas.height; sourceY += pageHeightPx) {
    if (page > 0) doc.addPage();
    const sliceHeight = Math.min(pageHeightPx, canvas.height - sourceY);
    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = sliceHeight;
    slice.getContext("2d")?.drawImage(canvas, 0, sourceY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
    const renderedHeight = (sliceHeight * pageWidth) / canvas.width;
    doc.addImage(slice.toDataURL("image/png"), "PNG", 0, 0, pageWidth, renderedHeight, undefined, "FAST");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("BI Produção · Fotoporcelana", 8, pageHeight - 5);
    doc.text(`Página ${page + 1}`, pageWidth - 8, pageHeight - 5, { align: "right" });
    page += 1;
  }
  doc.save(`${safeFileName(fileName)}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

/** Exportação tabular genérica preservada para os botões legados. */
export function downloadAnalysisPdf({
  title,
  subtitle,
  filterDescription,
  fileName,
  sections,
}: {
  title: string;
  subtitle?: string;
  filterDescription?: string;
  fileName: string;
  sections: PdfSection[];
}) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  let y = 36;
  const header = () => {
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, width, 27, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text(title, 14, 12);
    doc.setFontSize(9);
    doc.text(subtitle || `Gerado em ${new Date().toLocaleString("pt-BR")}`, 14, 19);
    if (filterDescription) {
      const lines = doc.splitTextToSize(`Filtros: ${filterDescription}`, width - 28);
      doc.setFontSize(7);
      doc.text(lines[0], 14, 24);
    }
    doc.setTextColor(30, 41, 59);
  };
  header();
  sections.forEach(section => {
    if (y > height - 45) {
      doc.addPage();
      header();
      y = 36;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(section.title, 14, y);
    doc.setFont("helvetica", "normal");
    autoTable(doc, {
      startY: y + 4,
      head: [section.columns],
      body: section.rows.length ? section.rows : [["Sem dados"]],
      theme: "grid",
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      alternateRowStyles: { fillColor: [241, 245, 249] },
      styles: { fontSize: 7.5, cellPadding: 2.2, textColor: [30, 41, 59] },
      margin: { left: 14, right: 14 },
    });
    y =
      ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 25) +
      12;
  });
  savePdfDocument(doc, `${safeFileName(fileName)}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

const defaultOptions: ReportOptions = {
  incluirGraficos: true,
  incluirTabelas: true,
  incluirTexto: true,
  incluirDetalhesClientes: true,
  incluirComparacao: true,
};

/**
 * Relatório profissional multipágina. Os gráficos são vetoriais e construídos
 * a partir das mesmas séries filtradas exibidas no dashboard.
 */
export function downloadProductionAnalysisPdf({
  title = "RELATÓRIO DE PRODUÇÃO",
  subtitle,
  filterDescription,
  fileName = "relatorio-producao-completo",
  data,
  options = defaultOptions,
}: {
  title?: string;
  subtitle?: string;
  filterDescription?: string;
  fileName?: string;
  data: ProductionAnalysisReportData;
  options?: ReportOptions;
}) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const generatedAt = new Date().toLocaleString("pt-BR");
  let sectionNumber = 0;

  const footer = () => {
    const page = doc.getNumberOfPages();
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("BI Produção · Fotoporcelana", 14, height - 7);
    doc.text(`Página ${page}`, width - 14, height - 7, { align: "right" });
  };

  const addPage = (sectionTitle: string, sectionSubtitle?: string) => {
    if (sectionNumber > 0) doc.addPage();
    sectionNumber += 1;
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, width, 24, "F");
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 24, 5, height - 24, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(sectionTitle, 14, 11);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(sectionSubtitle ?? `Gerado em ${generatedAt}`, 14, 18);
    doc.setTextColor(30, 41, 59);
    footer();
  };

  const drawTable = (
    y: number,
    columns: string[],
    rows: Array<Array<string | number>>,
    optionsOverride?: { fontSize?: number }
  ) => {
    autoTable(doc, {
      startY: y,
      head: [columns],
      body: rows.length ? rows : [["Sem dados"]],
      theme: "grid",
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      alternateRowStyles: { fillColor: [241, 245, 249] },
      styles: {
        fontSize: optionsOverride?.fontSize ?? 7.5,
        cellPadding: 2.2,
        textColor: [30, 41, 59],
        overflow: "linebreak",
      },
      margin: { left: 14, right: 14, bottom: 14 },
    });
  };

  const drawMetric = (x: number, y: number, label: string, value: string, boxWidth = 49) => {
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, boxWidth, 25, 2, 2, "FD");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(label.toUpperCase(), x + 4, y + 7);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(doc.splitTextToSize(value, boxWidth - 8)[0], x + 4, y + 17);
    doc.setFont("helvetica", "normal");
  };

  const drawBars = (
    y: number,
    points: Array<{ label: string; value: number }>,
    chartHeight = 72
  ) => {
    const left = 18;
    const chartWidth = width - 36;
    const max = Math.max(1, ...points.map(point => point.value));
    const slot = chartWidth / Math.max(points.length, 1);
    points.forEach((point, index) => {
      const barWidth = Math.min(18, slot * 0.62);
      const barHeight = (point.value / max) * (chartHeight - 18);
      const x = left + index * slot + (slot - barWidth) / 2;
      doc.setFillColor(index % 2 ? 20 : 37, index % 2 ? 184 : 99, index % 2 ? 166 : 235);
      doc.roundedRect(x, y + chartHeight - barHeight - 12, barWidth, barHeight, 1, 1, "F");
      doc.setFontSize(6.5);
      doc.setTextColor(51, 65, 85);
      doc.text(formatNumber(point.value), x + barWidth / 2, y + chartHeight - barHeight - 14, { align: "center" });
      doc.text(point.label.slice(0, 13), x + barWidth / 2, y + chartHeight - 4, { align: "center" });
    });
  };

  // Página 1 — capa.
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, width, height, "F");
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, 8, height, "F");
  doc.setTextColor(147, 197, 253);
  doc.setFontSize(10);
  doc.text("BUSINESS INTELLIGENCE · PRODUÇÃO", 24, 48);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(31);
  doc.text(title, 24, 69);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(203, 213, 225);
  doc.text(subtitle ?? "Análise executiva e operacional", 24, 82);
  doc.setFontSize(9);
  const filters = doc.splitTextToSize(`Período e filtros: ${filterDescription ?? "Todos os dados disponíveis"}`, width - 48);
  doc.text(filters, 24, 106);
  doc.text(`Data de geração: ${generatedAt}`, 24, 126);
  doc.setTextColor(148, 163, 184);
  doc.text("Documento calculado exclusivamente a partir dos registros filtrados.", 24, height - 24);
  sectionNumber = 1;
  footer();

  // Página 2 — resumo executivo.
  addPage("Resumo executivo", "Indicadores centrais do recorte selecionado");
  const m = data.metricasExecutivas;
  drawMetric(14, 34, "Produção total", formatNumber(m.totalProducao));
  drawMetric(67, 34, "Clientes", formatNumber(m.totalClientes));
  drawMetric(120, 34, "Média", formatNumber(m.mediaPorCliente));
  drawMetric(173, 34, "Mediana", formatNumber(m.medianaPorCliente));
  drawMetric(226, 34, "Tipos", formatNumber(m.tiposProduzidos));
  drawMetric(14, 64, "Maior cliente", m.maiorCliente?.nome ?? "N/A", 75);
  drawMetric(93, 64, "Produto estrela", m.produtoEstrela, 75);
  drawMetric(172, 64, "Top 5", formatPercent(m.participacaoTop5), 49);
  drawMetric(225, 64, "Variação", formatPercent(m.variacaoPercentual), 49);
  if (options.incluirTabelas) {
    drawTable(98, ["Indicador", "Resultado", "Nota"], [
      ["Média mensal", formatNumber(m.mediaMensal), `${m.mesesComProducao} mês(es) ativos`],
      ["Média por tipo", formatNumber(m.mediaPorTipo), "Total ÷ tipos"],
      ["Mínimo / máximo", `${formatNumber(m.minimoPorCliente)} / ${formatNumber(m.maximoPorCliente)}`, "Totais por cliente"],
      ["Desvio padrão", formatNumber(m.desvioPadraoPorCliente), "Populacional"],
      ["Média diária / semanal", "Não disponível", "Schema sem DATA diária; nenhum valor foi estimado"],
      ["Qualidade de importação", `${data.metricasAvancadas.qualidadeImportacao.validas} válidas`, `${data.metricasAvancadas.qualidadeImportacao.rejeitadas} rejeitadas · ${data.metricasAvancadas.qualidadeImportacao.duplicados} duplicadas`],
    ]);
  }

  // Página 3 — evolução.
  addPage("Evolução da produção", "Produção mensal e acumulado anual");
  if (options.incluirGraficos) {
    drawBars(
      34,
      data.evolucaoAcumulada.map(point => ({
        label: `${point.mes.slice(0, 3)}/${String(point.ano).slice(-2)}`,
        value: point.quantidade,
      })),
      78
    );
  }
  if (options.incluirTabelas) {
    drawTable(
      122,
      ["Período", "Produção", "Acumulado no ano"],
      data.evolucaoAcumulada.map(point => [
        point.periodo,
        formatNumber(point.quantidade),
        formatNumber(point.acumulado),
      ])
    );
  }

  // Página 4 — clientes.
  addPage("Análise por cliente", "Ranking, mix, participação e extremos mensais");
  if (options.incluirTabelas) {
    drawTable(
      34,
      ["#", "Cliente", "Total", "Média/mês", "Tipos", "Participação", "Maior mês", "Menor mês"],
      data.analiseClientes.map(item => [
        item.rankingHistorico,
        item.cliente,
        formatNumber(item.total),
        formatNumber(item.mediaMensal),
        item.tipos,
        formatPercent(item.participacao),
        item.maiorMes ? `${item.maiorMes.nome}: ${formatNumber(item.maiorMes.quantidade)}` : "—",
        item.menorMes ? `${item.menorMes.nome}: ${formatNumber(item.menorMes.quantidade)}` : "—",
      ]),
      { fontSize: 6.8 }
    );
  }

  // Página 5 — tipos e mix.
  addPage("Análise por tipo", "Categorias RET/OVAL/QUAD e detalhamento de modelos");
  if (options.incluirTabelas) {
    drawTable(
      34,
      ["#", "Tipo", "Categoria", "Total", "Clientes", "Média/cliente", "Participação", "Maior cliente"],
      data.analiseTipos.map(item => [
        item.ranking,
        item.tipoPlaca,
        item.categoria,
        formatNumber(item.total),
        item.clientes,
        formatNumber(item.mediaPorCliente),
        formatPercent(item.participacao),
        item.maiorCliente ? `${item.maiorCliente.nome}: ${formatNumber(item.maiorCliente.quantidade)}` : "—",
      ]),
      { fontSize: 6.8 }
    );
  }

  // Página 6 — comparação A/B.
  if (options.incluirComparacao) {
    addPage("Comparação entre períodos", "Indicadores, clientes, tipos, concentração e mix");
    const c = data.comparacaoPeriodos;
    if (options.incluirGraficos) {
      drawBars(34, [
        { label: "Período A", value: c.periodoA.total },
        { label: "Período B", value: c.periodoB.total },
      ], 55);
    }
    if (options.incluirTabelas) {
      drawTable(96, ["Indicador", "Período A", "Período B", "Diferença"], [
        ["Produção", formatNumber(c.periodoA.total), formatNumber(c.periodoB.total), formatNumber(c.diferencaAbsoluta)],
        ["Média mensal", formatNumber(c.periodoA.mediaMensal), formatNumber(c.periodoB.mediaMensal), formatNumber(c.periodoB.mediaMensal - c.periodoA.mediaMensal)],
        ["Média/cliente", formatNumber(c.periodoA.mediaPorCliente), formatNumber(c.periodoB.mediaPorCliente), formatNumber(c.periodoB.mediaPorCliente - c.periodoA.mediaPorCliente)],
        ["Clientes", c.periodoA.clientes, c.periodoB.clientes, `${c.clientesNovos.length} novos · ${c.clientesPerdidos.length} perdidos`],
        ["Tipos", c.periodoA.tipos, c.periodoB.tipos, `${c.tiposAumentaram.length} ↑ · ${c.tiposDiminuiram.length} ↓`],
        ["Maior cliente", c.periodoA.maiorCliente?.nome ?? "—", c.periodoB.maiorCliente?.nome ?? "—", "—"],
        ["Tipo principal", c.periodoA.tipoMaisProduzido, c.periodoB.tipoMaisProduzido, "—"],
        ["Concentração Top 5", formatPercent(c.periodoA.concentracaoTop5), formatPercent(c.periodoB.concentracaoTop5), `${c.concentracaoDiferencaPontosPercentuais} p.p.`],
      ]);
    }
  }

  // Página 7 — detalhes por cliente.
  if (options.incluirDetalhesClientes) {
    addPage("Detalhes por cliente e modelo", "Reconciliação completa das quantidades filtradas");
    if (options.incluirTabelas) {
      drawTable(
        34,
        ["Cliente", "Modelo", "Quantidade"],
        data.tabelaProducao.flatMap(row => [
          ...row.itens.map(item => [row.cliente, item.tipoPlaca, formatNumber(item.quantidade)]),
          [`Subtotal · ${row.cliente}`, "", formatNumber(row.total)],
        ]),
        { fontSize: 6.7 }
      );
    }
  }

  // Página 8 — conclusões estatísticas e texto.
  addPage("Conclusões estatísticas", "Leitura determinística e limitações da base");
  if (options.incluirTexto) {
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    const report = doc.splitTextToSize(data.relatorioDeterministico, width - 34);
    doc.text(report, 17, 40);
    const reportBottom = 40 + report.length * 5;
    doc.setFillColor(254, 252, 232);
    doc.setDrawColor(253, 224, 71);
    doc.roundedRect(17, Math.min(reportBottom + 8, 130), width - 34, 28, 2, 2, "FD");
    doc.setFontSize(8.5);
    doc.text(
      doc.splitTextToSize(
        "Limitação metodológica: o schema atual registra ano e mês, mas não data diária. Portanto, médias diária/semanal, dias com produção, dias sem produção e filtros diários/semanais são exibidos como indisponíveis e não foram estimados.",
        width - 46
      ),
      23,
      Math.min(reportBottom + 18, 140)
    );
  }
  if (options.incluirTabelas) {
    drawTable(132, ["Estatística", "Valor"], [
      ["Média por cliente", formatNumber(m.mediaPorCliente)],
      ["Mediana por cliente", formatNumber(m.medianaPorCliente)],
      ["Mínimo", formatNumber(m.minimoPorCliente)],
      ["Máximo", formatNumber(m.maximoPorCliente)],
      ["Desvio padrão populacional", formatNumber(m.desvioPadraoPorCliente)],
      ["Concentração Top 5", formatPercent(data.concentracao.top5Participacao)],
    ]);
  }

  savePdfDocument(doc, `${safeFileName(fileName)}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
