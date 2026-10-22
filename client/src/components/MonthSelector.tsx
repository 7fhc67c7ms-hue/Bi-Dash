import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const MESES = [
  "JANEIRO",
  "FEVEREIRO",
  "MARÇO",
  "ABRIL",
  "MAIO",
  "JUNHO",
  "JULHO",
  "AGOSTO",
  "SETEMBRO",
  "OUTUBRO",
  "NOVEMBRO",
  "DEZEMBRO",
];

interface MonthSelectorProps {
  selectedMonths: string[];
  onMonthsChange: (months: string[]) => void;
}

export default function MonthSelector({
  selectedMonths,
  onMonthsChange,
}: MonthSelectorProps) {
  const toggleMonth = (month: string) => {
    if (selectedMonths.includes(month)) {
      onMonthsChange(selectedMonths.filter((m) => m !== month));
    } else {
      onMonthsChange([...selectedMonths, month]);
    }
  };

  const clearSelection = () => {
    onMonthsChange([]);
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">Filtrar por Mês</CardTitle>
          {selectedMonths.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4 mr-1" />
              Limpar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap gap-2">
          {[
            ["1º trimestre", MESES.slice(0, 3)],
            ["2º trimestre", MESES.slice(3, 6)],
            ["3º trimestre", MESES.slice(6, 9)],
            ["4º trimestre", MESES.slice(9, 12)],
            ["1º semestre", MESES.slice(0, 6)],
            ["2º semestre", MESES.slice(6, 12)],
            ["Ano inteiro", MESES],
          ].map(([label, months]) => (
            <Button
              key={label as string}
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onMonthsChange(months as string[])}
              className="border-slate-600 text-xs text-slate-300 hover:bg-slate-700"
            >
              {label as string}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {MESES.map((month) => (
            <Button
              key={month}
              onClick={() => toggleMonth(month)}
              variant={selectedMonths.includes(month) ? "default" : "outline"}
              className={`text-sm ${
                selectedMonths.includes(month)
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "text-slate-300 border-slate-600 hover:bg-slate-700"
              }`}
            >
              {month.substring(0, 3)}
            </Button>
          ))}
        </div>
        {selectedMonths.length > 0 && (
          <div className="mt-4 text-sm text-slate-400">
            {selectedMonths.length} mês(es) selecionado(s)
          </div>
        )}
      </CardContent>
    </Card>
  );
}
