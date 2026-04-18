// ═══════════════════════════════════════════════════════════════
// ContactSheetNavigator — Thin top bar with prev/next + counter
// Shows position in the filtered list and keyboard hints.
// ═══════════════════════════════════════════════════════════════

import { ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ContactSheetNavigatorProps {
  currentIndex: number; // 1-based
  total: number;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export function ContactSheetNavigator({
  currentIndex,
  total,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
}: ContactSheetNavigatorProps) {
  if (total <= 1) return null;

  return (
    <div
      className="flex items-center justify-between gap-2 px-4 py-1.5 border-b bg-muted/40 text-xs"
      role="navigation"
      aria-label="Navigation entre apprenants"
    >
      <span className="text-muted-foreground tabular-nums">
        <span className="font-semibold text-foreground">{currentIndex}</span>
        <span className="mx-1">/</span>
        <span>{total}</span>
      </span>

      <TooltipProvider delayDuration={200}>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 gap-1"
                disabled={!hasPrevious}
                onClick={onPrevious}
                aria-label="Apprenant précédent"
              >
                <ChevronUp className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Préc.</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-[11px]">
              Précédent <Kbd className="ml-1">↑</Kbd> <Kbd>K</Kbd>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 gap-1"
                disabled={!hasNext}
                onClick={onNext}
                aria-label="Apprenant suivant"
              >
                <span className="hidden sm:inline">Suiv.</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-[11px]">
              Suivant <Kbd className="ml-1">↓</Kbd> <Kbd>J</Kbd>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
}
