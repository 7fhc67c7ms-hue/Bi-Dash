import { useCallback, useEffect, useMemo, useState } from "react";
import { Moon, Printer, ScanLine, Sun, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";

type SelectionRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const PRINT_SELECTED = "data-print-selected";
const PRINT_SHEET_ID = "print-selection-sheet";

function getRectFromPoints(
  startX: number,
  startY: number,
  endX: number,
  endY: number
): SelectionRect {
  return {
    left: Math.min(startX, endX),
    top: Math.min(startY, endY),
    width: Math.abs(endX - startX),
    height: Math.abs(endY - startY),
  };
}

function getIntersectionArea(a: DOMRect, b: SelectionRect) {
  const width = Math.max(
    0,
    Math.min(a.right, b.left + b.width) - Math.max(a.left, b.left)
  );
  const height = Math.max(
    0,
    Math.min(a.bottom, b.top + b.height) - Math.max(a.top, b.top)
  );
  return width * height;
}

function clearSelectedBlocks() {
  document
    .querySelectorAll<HTMLElement>(
      `[${PRINT_SELECTED}], [data-print-selection-ancestor]`
    )
    .forEach(element => {
      element.removeAttribute(PRINT_SELECTED);
      element.removeAttribute("data-print-selection-ancestor");
    });
}

function createSelectionPrintSheet() {
  document.getElementById(PRINT_SHEET_ID)?.remove();
  const selected = Array.from(
    document.querySelectorAll<HTMLElement>(`[${PRINT_SELECTED}="true"]`)
  );
  if (selected.length === 0) return false;

  const sheet = document.createElement("main");
  sheet.id = PRINT_SHEET_ID;
  sheet.setAttribute("data-print-root", "");
  sheet.setAttribute("aria-label", "Conteúdo selecionado para impressão");

  selected.forEach(element => {
    const item = document.createElement("section");
    item.className = "print-selection-item";
    const clone = element.cloneNode(true) as HTMLElement;
    clone.removeAttribute(PRINT_SELECTED);
    clone.removeAttribute("data-print-selection-ancestor");
    clone
      .querySelectorAll("[data-print-ui]")
      .forEach(control => control.remove());
    clone
      .querySelectorAll<HTMLElement>(
        `[${PRINT_SELECTED}], [data-print-selection-ancestor]`
      )
      .forEach(nested => {
        nested.removeAttribute(PRINT_SELECTED);
        nested.removeAttribute("data-print-selection-ancestor");
      });

    const sourceCanvases = Array.from(element.querySelectorAll("canvas"));
    const clonedCanvases = Array.from(clone.querySelectorAll("canvas"));
    sourceCanvases.forEach((canvas, index) => {
      const copy = clonedCanvases[index];
      if (!copy) return;
      try {
        const image = document.createElement("img");
        image.src = canvas.toDataURL("image/png");
        image.alt = "Gráfico";
        image.style.maxWidth = "100%";
        copy.replaceWith(image);
      } catch {
        // Preserve the selected content if a cross-origin canvas cannot be copied.
      }
    });
    item.append(clone);
    sheet.append(item);
  });

  document.body.append(sheet);
  return true;
}

function selectBlocks(rect: SelectionRect) {
  clearSelectedBlocks();
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>("[data-print-block]")
  )
    .filter(element => !element.closest("[data-print-ui]"))
    .filter(element => {
      const bounds = element.getBoundingClientRect();
      if (bounds.width < 4 || bounds.height < 4) return false;
      const intersection = getIntersectionArea(bounds, rect);
      const centerX = bounds.left + bounds.width / 2;
      const centerY = bounds.top + bounds.height / 2;
      return (
        centerX >= rect.left &&
        centerX <= rect.left + rect.width &&
        centerY >= rect.top &&
        centerY <= rect.top + rect.height &&
        intersection / (bounds.width * bounds.height) >= 0.5
      );
    });

  // When a block contains more specific blocks, print the specific ones instead of
  // duplicating the complete parent section in the printout.
  const leafCandidates = candidates.filter(
    candidate =>
      !candidates.some(
        other => other !== candidate && candidate.contains(other)
      )
  );
  const selected = leafCandidates.length
    ? leafCandidates
    : candidates.slice(0, 1);
  selected.forEach(element => {
    element.setAttribute(PRINT_SELECTED, "true");
    let ancestor =
      element.parentElement?.closest<HTMLElement>("[data-print-block]");
    while (ancestor) {
      ancestor.setAttribute("data-print-selection-ancestor", "true");
      ancestor =
        ancestor.parentElement?.closest<HTMLElement>("[data-print-block]");
    }
  });
  return selected.length;
}

export default function PrintSelectionController() {
  const { theme, toggleTheme } = useTheme();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(
    null
  );
  const [selectedCount, setSelectedCount] = useState(0);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null
  );

  const requestPrint = useCallback(() => {
    if (selectedCount > 0 && !createSelectionPrintSheet()) return;
    document.body.dataset.printScope = selectedCount > 0 ? "selection" : "page";
    window.setTimeout(() => window.print(), 0);
  }, [selectedCount]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "p") {
        event.preventDefault();
        requestPrint();
      }
      if (event.key === "Escape" && selectionMode) {
        setSelectionMode(false);
        setDragStart(null);
        setSelectionRect(null);
      }
    };
    const handleAfterPrint = () => {
      delete document.body.dataset.printScope;
      document.getElementById(PRINT_SHEET_ID)?.remove();
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("afterprint", handleAfterPrint);
      document.getElementById(PRINT_SHEET_ID)?.remove();
    };
  }, [requestPrint, selectionMode]);

  const selectionLabel = useMemo(() => {
    if (selectionMode) return "Marque os blocos que deseja imprimir";
    if (selectedCount > 0) return `${selectedCount} bloco(s) selecionado(s)`;
    return "Ctrl+P imprime a página atual";
  }, [selectedCount, selectionMode]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragStart({ x: event.clientX, y: event.clientY });
    setSelectionRect(
      getRectFromPoints(
        event.clientX,
        event.clientY,
        event.clientX,
        event.clientY
      )
    );
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart) return;
    setSelectionRect(
      getRectFromPoints(dragStart.x, dragStart.y, event.clientX, event.clientY)
    );
  };

  const finishSelection = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart) return;
    const rect = getRectFromPoints(
      dragStart.x,
      dragStart.y,
      event.clientX,
      event.clientY
    );
    setSelectionRect(rect);
    setSelectedCount(
      rect.width < 12 || rect.height < 12 ? 0 : selectBlocks(rect)
    );
    setDragStart(null);
    setSelectionMode(false);
  };

  const clearSelection = () => {
    clearSelectedBlocks();
    setSelectedCount(0);
    setSelectionRect(null);
  };

  return (
    <>
      <div
        data-print-ui
        className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-2 border-b bg-background/95 px-3 py-2 shadow-sm backdrop-blur print:hidden"
      >
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {selectionLabel}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {selectedCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearSelection}
            >
              <X className="mr-1 h-4 w-4" />
              Limpar seleção
            </Button>
          )}
          <Button
            type="button"
            variant={selectionMode ? "destructive" : "outline"}
            size="sm"
            onClick={() => {
              setSelectionMode(current => !current);
              setSelectionRect(null);
            }}
          >
            <ScanLine className="mr-2 h-4 w-4" />
            {selectionMode ? "Cancelar seleção" : "Selecionar área"}
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={requestPrint}
          >
            <Printer className="mr-2 h-4 w-4" />
            Imprimir{" "}
            <kbd className="rounded border border-primary-foreground/30 px-1 text-[10px] font-normal">
              Ctrl+P
            </kbd>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => toggleTheme?.()}
            aria-label={
              theme === "light" ? "Ativar modo escuro" : "Ativar modo claro"
            }
          >
            {theme === "light" ? (
              <Moon className="mr-2 h-4 w-4" />
            ) : (
              <Sun className="mr-2 h-4 w-4" />
            )}
            {theme === "light" ? "Modo escuro" : "Modo claro"}
          </Button>
        </div>
      </div>
      {selectionMode && (
        <div
          data-print-ui
          className="fixed inset-0 z-30 cursor-crosshair bg-primary/5"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishSelection}
          onPointerCancel={finishSelection}
          role="presentation"
        >
          {selectionRect && (
            <div
              className="pointer-events-none fixed border-2 border-dashed border-primary bg-primary/15"
              style={{
                left: selectionRect.left,
                top: selectionRect.top,
                width: selectionRect.width,
                height: selectionRect.height,
              }}
            />
          )}
          <div className="pointer-events-none fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background px-4 py-3 text-sm font-medium text-foreground shadow-lg">
            Arraste para marcar os blocos que deseja imprimir
          </div>
        </div>
      )}
    </>
  );
}
