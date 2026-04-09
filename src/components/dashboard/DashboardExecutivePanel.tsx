/**
 * DashboardExecutivePanel — RM-7 executive KPIs row.
 * Conversion rate, CA prévisionnel, payment status breakdown.
 */

import { TrendingUp, Target, CreditCard, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { DashboardMetrics } from "@/hooks/useDashboardData";
import { formatEur } from "@/lib/format-currency";
import { Progress } from "@/components/ui/progress";

interface Props {
  metrics: DashboardMetrics | undefined;
  isLoading: boolean;
  onNavigate: (section: string, params?: Record<string, string>) => void;
}

export function DashboardExecutivePanel({ metrics, isLoading, onNavigate }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    );
  }

  const m = metrics;
  const totalInscriptions = (m?.paiementsPaye ?? 0) + (m?.paiementsPartiel ?? 0) + (m?.paiementsNonPaye ?? 0);
  const payePercent = totalInscriptions > 0 ? Math.round(((m?.paiementsPaye ?? 0) / totalInscriptions) * 100) : 0;
  const partielPercent = totalInscriptions > 0 ? Math.round(((m?.paiementsPartiel ?? 0) / totalInscriptions) * 100) : 0;

  const convDelta = (m?.tauxConversion ?? 0) - (m?.tauxConversionPrev ?? 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Conversion Rate */}
      <button
        onClick={() => onNavigate("prospects")}
        className="rounded-xl border border-border bg-card p-5 text-left hover:shadow-sm hover:border-primary/30 transition-all group focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
        aria-label={`Taux de conversion : ${m?.tauxConversion ?? 0}%`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Taux de conversion</span>
          </div>
          {convDelta !== 0 && (
            <span className={cn(
              "flex items-center gap-0.5 text-xs font-medium",
              convDelta > 0 ? "text-success" : "text-destructive"
            )}>
              {convDelta > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(convDelta)}pts
            </span>
          )}
        </div>
        <p className="text-3xl font-bold text-foreground">{m?.tauxConversion ?? 0}<span className="text-lg text-muted-foreground">%</span></p>
        <p className="text-xs text-muted-foreground mt-1">
          {m?.totalConvertis ?? 0} convertis sur {m?.totalProspects ?? 0} prospects
        </p>
      </button>

      {/* CA Prévisionnel */}
      <button
        onClick={() => onNavigate("finances")}
        className="rounded-xl border border-border bg-card p-5 text-left hover:shadow-sm hover:border-primary/30 transition-all group focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
        aria-label={`CA prévisionnel : ${formatEur(m?.caPrevisionnel ?? 0)}`}
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-accent/50">
            <Target className="h-4 w-4 text-accent-foreground" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">CA prévisionnel</span>
        </div>
        <p className="text-3xl font-bold text-foreground">{formatEur(m?.caPrevisionnel ?? 0)}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Basé sur {totalInscriptions} inscription{totalInscriptions > 1 ? "s" : ""} actives
        </p>
      </button>

      {/* Payment Status */}
      <button
        onClick={() => onNavigate("finances", { tab: "paiements" })}
        className="rounded-xl border border-border bg-card p-5 text-left hover:shadow-sm hover:border-primary/30 transition-all group focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
        aria-label={`Répartition paiements : ${payePercent}% payés`}
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-success/10">
            <CreditCard className="h-4 w-4 text-success" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">Statut paiements</span>
        </div>

        {/* Stacked bar */}
        <div className="flex h-3 rounded-full overflow-hidden bg-muted mb-2">
          {payePercent > 0 && (
            <div
              className="bg-success transition-all"
              style={{ width: `${payePercent}%` }}
            />
          )}
          {partielPercent > 0 && (
            <div
              className="bg-warning transition-all"
              style={{ width: `${partielPercent}%` }}
            />
          )}
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-success" />
            <span className="text-muted-foreground">Payé</span>
            <span className="font-semibold">{m?.paiementsPaye ?? 0}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-warning" />
            <span className="text-muted-foreground">Partiel</span>
            <span className="font-semibold">{m?.paiementsPartiel ?? 0}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
            <span className="text-muted-foreground">Non payé</span>
            <span className="font-semibold">{m?.paiementsNonPaye ?? 0}</span>
          </span>
        </div>
      </button>
    </div>
  );
}
