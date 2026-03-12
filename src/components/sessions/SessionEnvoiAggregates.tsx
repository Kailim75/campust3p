// ═══════════════════════════════════════════════════════════════
// SessionEnvoiAggregates — Sober KPI bar for session envois
// Displays: total envois · échecs · couverture %
// Pure display — no DB calls, relies on pre-computed aggregates
// ═══════════════════════════════════════════════════════════════

import { Send, XCircle, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionEnvoiAggregates as Aggregates } from "@/hooks/useDocumentEnvoiHistory";

interface SessionEnvoiAggregatesProps {
  aggregates: Aggregates;
  className?: string;
}

export function SessionEnvoiAggregates({
  aggregates,
  className,
}: SessionEnvoiAggregatesProps) {
  if (aggregates.totalEnvois === 0 && aggregates.totalInscrits === 0) {
    return null;
  }

  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      {/* Total envois */}
      <div className="bg-card border rounded-lg p-2.5 text-center">
        <div className="flex items-center justify-center gap-1 mb-0.5">
          <Send className="h-3 w-3 text-muted-foreground" />
          <p className="text-[10px] font-medium text-muted-foreground">Envois</p>
        </div>
        <p className="text-sm font-bold text-foreground">
          {aggregates.totalEnvois}
        </p>
      </div>

      {/* Échecs */}
      <div className="bg-card border rounded-lg p-2.5 text-center">
        <div className="flex items-center justify-center gap-1 mb-0.5">
          <XCircle className="h-3 w-3 text-muted-foreground" />
          <p className="text-[10px] font-medium text-muted-foreground">Échecs</p>
        </div>
        <p className={cn(
          "text-sm font-bold",
          aggregates.totalEchecs > 0 ? "text-destructive" : "text-foreground"
        )}>
          {aggregates.totalEchecs}
        </p>
      </div>

      {/* Couverture */}
      <div className="bg-card border rounded-lg p-2.5 text-center">
        <div className="flex items-center justify-center gap-1 mb-0.5">
          <Users className="h-3 w-3 text-muted-foreground" />
          <p className="text-[10px] font-medium text-muted-foreground">Couverture</p>
        </div>
        <p className={cn(
          "text-sm font-bold",
          aggregates.couverturePct >= 100
            ? "text-success"
            : aggregates.couverturePct > 0
              ? "text-warning"
              : "text-foreground"
        )}>
          {aggregates.couverturePct}%
        </p>
      </div>
    </div>
  );
}
