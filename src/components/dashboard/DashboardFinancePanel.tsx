/**
 * DashboardFinancePanel — Finance / cash tension panel.
 * Shows top overdue invoices and encaissements summary.
 */

import { ArrowRight, FileText, Euro, CreditCard } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DashboardMetrics, TopFacture } from "@/hooks/useDashboardData";
import { formatEur } from "@/lib/format-currency";

interface Props {
  metrics: DashboardMetrics | undefined;
  topFactures: TopFacture[];
  isLoading: boolean;
  onNavigate: (section: string, params?: Record<string, string>) => void;
}

export function DashboardFinancePanel({ metrics, topFactures, isLoading, onNavigate }: Props) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5" role="region" aria-label="Finance et encaissements">
        <Skeleton className="h-5 w-48 mb-4" />
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full mb-2" />
        ))}
      </div>
    );
  }

  const m = metrics;
  const hasRetard = (m?.paiementsRetard ?? 0) > 0;

  return (
    <div className="rounded-xl border border-border bg-card p-5" role="region" aria-label="Finance et encaissements">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Euro className="h-4 w-4 text-muted-foreground" />
          Finance & Encaissements
        </h3>
        <button
          onClick={() => onNavigate("finances")}
          className="text-[11px] text-primary hover:underline font-medium"
          aria-label="Voir toutes les finances"
        >
          Tout voir →
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-[11px] text-muted-foreground mb-1">Encaissé (période)</p>
          <p className="text-lg font-bold text-foreground">{formatEur(m?.encaissements ?? 0)}</p>
        </div>
        <div className={cn(
          "p-3 rounded-lg",
          hasRetard ? "bg-destructive/5" : "bg-muted/50"
        )}>
          <p className="text-[11px] text-muted-foreground mb-1">En retard</p>
          <p className={cn("text-lg font-bold", hasRetard ? "text-destructive" : "text-foreground")}>
            {formatEur(m?.paiementsRetardMontant ?? 0)}
          </p>
          {hasRetard && (
            <p className="text-[10px] text-destructive">
              {m?.paiementsRetard} facture(s) · plus ancien : {m?.paiementsRetardAgeDays}j
            </p>
          )}
        </div>
      </div>

      {/* Top factures */}
      {topFactures.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-3.5 w-3.5 text-warning" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Top factures en attente
            </span>
          </div>
          <div className="space-y-1">
            {topFactures.map((f) => (
              <button
                key={f.id}
                onClick={() => onNavigate("finances", { tab: "factures" })}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors text-left group"
                aria-label={`Facture ${f.numero_facture}, montant ${formatEur(f.montant_total)}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {f.numero_facture}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {f.ageDays > 0 ? `${f.ageDays}j de retard` : "En attente"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-sm font-semibold text-foreground">
                    {formatEur(f.montant_total)}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {topFactures.length === 0 && !hasRetard && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Aucune facture en attente — situation financière saine ✓
        </p>
      )}
    </div>
  );
}
