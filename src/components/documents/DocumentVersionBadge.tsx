// ═══════════════════════════════════════════════════════════════
// DocumentVersionBadge — Visual version/state indicator
// ═══════════════════════════════════════════════════════════════

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FileCheck, History, Archive } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocumentWorkflowItem } from "@/lib/document-workflow/types";

interface DocumentVersionBadgeProps {
  item: DocumentWorkflowItem;
  className?: string;
}

/**
 * Displays version state: active, archived, or source system.
 * Purely visual — no business logic duplication.
 */
export function DocumentVersionBadge({ item, className }: DocumentVersionBadgeProps) {
  const isArchived = item.businessStatus === "archive";
  const isActive = !isArchived && !!item.storagePath;
  const isV1 = item.sourceSystem === "v1";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              "text-[9px] h-4 px-1 gap-0.5 cursor-default",
              isArchived
                ? "bg-muted/50 text-muted-foreground border-muted"
                : isActive
                  ? "bg-blue-50/50 text-blue-600 border-blue-200"
                  : "bg-muted/30 text-muted-foreground border-muted",
              isV1 && "border-dashed",
              className
            )}
          >
            {isArchived ? (
              <>
                <Archive className="h-2 w-2" />
                Archivé
              </>
            ) : isActive ? (
              <>
                <FileCheck className="h-2 w-2" />
                Actif
              </>
            ) : (
              <>
                <History className="h-2 w-2" />
                —
              </>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-[10px] max-w-[200px]">
          <div className="space-y-0.5">
            <p className="font-medium">
              {isArchived ? "Version archivée" : isActive ? "Version active" : "Pas encore généré"}
            </p>
            {item.templateVersionId && (
              <p className="text-muted-foreground">Version template : {item.templateVersionId.slice(0, 8)}…</p>
            )}
            <p className="text-muted-foreground">Source : {item.sourceSystem.toUpperCase()}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
