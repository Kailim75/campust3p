// ═══════════════════════════════════════════════════════════════
// SessionDocumentMatrixCell — Single block cell in the matrix
// ═══════════════════════════════════════════════════════════════

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CheckCircle2, AlertTriangle, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocumentBlockSummary } from "@/lib/document-workflow/types";

interface SessionDocumentMatrixCellProps {
  block: DocumentBlockSummary | null;
  onClick?: () => void;
  className?: string;
}

export function SessionDocumentMatrixCell({
  block,
  onClick,
  className,
}: SessionDocumentMatrixCellProps) {
  if (!block) {
    return (
      <td className={cn("px-2 py-2 text-center", className)}>
        <span className="text-[10px] text-muted-foreground">—</span>
      </td>
    );
  }

  const isComplete = block.missing === 0 && block.blocked === 0 && block.errors === 0;
  const hasErrors = block.errors > 0;
  const hasBlocked = block.blocked > 0;
  const hasMissing = block.missing > 0;

  const statusColor = isComplete
    ? "bg-green-100 text-green-700 border-green-200 hover:bg-green-200"
    : hasErrors
      ? "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20"
      : hasBlocked
        ? "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200"
        : hasMissing
          ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
          : "bg-muted text-muted-foreground";

  const StatusIcon = isComplete
    ? CheckCircle2
    : hasErrors
      ? XCircle
      : hasBlocked
        ? AlertTriangle
        : Clock;

  return (
    <td className={cn("px-1.5 py-1.5", className)}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onClick}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer w-full justify-center",
                statusColor
              )}
            >
              <StatusIcon className="h-3 w-3 flex-shrink-0" />
              <span>{block.generated}/{block.totalExpected}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs max-w-[200px]">
            <p className="font-medium">{block.label}</p>
            <div className="mt-1 space-y-0.5 text-[11px]">
              <p>Générés : {block.generated}/{block.totalExpected}</p>
              {block.sent > 0 && <p>Envoyés : {block.sent}</p>}
              {block.signed > 0 && <p>Signés : {block.signed}</p>}
              {block.missing > 0 && <p className="text-amber-600">À générer : {block.missing}</p>}
              {block.blocked > 0 && <p className="text-orange-600">Bloqués : {block.blocked}</p>}
              {block.errors > 0 && <p className="text-destructive">Erreurs : {block.errors}</p>}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </td>
  );
}
