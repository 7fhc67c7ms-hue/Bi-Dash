import { FileDown } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";

export default function AnalysisPdfButton({ onClick, label = "Gerar PDF" }: { onClick: () => void; label?: string }) {
  return <Button data-print-ui type="button" variant="outline" size="sm" onClick={onClick} className="shrink-0"><FileDown className="mr-2 h-4 w-4" />{label}</Button>;
}
