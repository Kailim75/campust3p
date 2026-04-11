/**
 * DashboardFinancePanel — Finance / cash tension panel.
 * Shows top overdue invoices and encaissements summary.
 */

import { ArrowRight, FileText, Euro } from "lucide-react";
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
  const hasPending = (m?.facturesEnAttente ?? 0) > 0;

  return (
    <div className="rounded-xl border border-border bg-card p-5" role="region" aria-label="Finance et encaissements">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Euro className="h-4 w-4 text-muted-foreground" />
            Finance & Encaissements
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {hasRetard
              ? `${m?.paiementsRetard ?? 0} retard${(m?.paiementsRetard ?? 0) > 1 ? "s" : ""} à traiter en priorité`
              : hasPending
                ? `${m?.facturesEnAttente ?? 0} facture${(m?.facturesEnAttente ?? 0) > 1 ? "s" : ""} à suivre`
                : "Aucune tension de trésorerie détectée"}
          </p>
        </div>
        <button
          onClick={() => onNavigate("finances")}
          className="text-[11px] text-primary hover:underline font-medium shrink-0"
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
          <p className="text-[10px] text-muted-foreground mt-1">
            Reste à encaisser : {formatEur(m?.resteAEncaisser ?? 0)}
          </p>
        </div>
        <div className={cn(
          "p-3 rounded-lg",
          hasRetard ? "bg-destructive/5" : "bg-muted/50"
        )}>
          <p className="text-[11px] text-muted-foreground mb-1">{hasRetard ? "Retards critiques" : "À surveiller"}</p>
          <p className={cn("text-lg font-bold", hasRetard ? "text-destructive" : "text-foreground")}>
            {hasRetard ? formatEur(m?.paiementsRetardMontant ?? 0) : `${m?.facturesEnAttente ?? 0}`}
          </p>
          {hasRetard ? (
            <p className="text-[10px] text-destructive">
              {m?.paiementsRetard} facture(s) · plus ancien : {m?.paiementsRetardAgeDays}j
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground">
              facture(s) en attente de règlement
            </p>
          )}
        </div>
      </div>

      {/* Top factures */}
      {topFactures.length > 0 && (
        <>
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="h-3.5 w-3.5 text-warning shrink-0" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
                Priorités de relance
              </span>
              <Badge variant="outline" className="h-5 px-1.5 text-[10px] shrink-0">
                {topFactures.length}
              </Badge>
            </div>
            <button
              onClick={() => onNavigate("finances", { tab: "factures" })}
              className="text-[11px] text-primary hover:underline shrink-0"
            >
              Voir
            </button>
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground truncate">
                      {f.numero_facture}
                    </p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "h-5 px-1.5 text-[10px] shrink-0",
                        f.ageDays > 0
                          ? "border-destructive/30 bg-destructive/5 text-destructive"
                          : "border-border text-muted-foreground"
                      )}
                    >
                      {f.ageDays > 0 ? `${f.ageDays}j retard` : "À suivre"}
                    </Badge>
                  </div>
                  {f.contactName && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {f.contactName}
                    </p>
                  )}
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
          Aucune facture prioritaire à relancer pour le moment.
        </p>
      )}
    </div>
  );
}
