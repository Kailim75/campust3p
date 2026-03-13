/**
 * DashboardKPIGrid — Merged Pilotage + Risk KPIs in one hierarchical row.
 * 6 cards max. All cards have aria-label for accessibility.
 * 
 * Cards:
 * 1. Encaissements (€)
 * 2. Factures en attente (count) — BUGFIX: excludes brouillons & zero amounts
 * 3. Paiements en retard (count, destructive)
 * 4. Prospects à relancer (count)
 * 5. Sessions à risque (count)
 * 6. Dossiers incomplets (count, with badges Initial/Continue)
 */

import { Euro, FileText, CreditCard, Phone, AlertTriangle, FolderOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DashboardMetrics } from "@/hooks/useDashboardData";
import { formatEur, formatDelta, formatCountDelta } from "@/lib/format-currency";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { forwardRef } from "react";

interface Props {
  metrics: DashboardMetrics | undefined;
  isLoading: boolean;
  onNavigate: (section: string, params?: Record<string, string>) => void;
}

const TooltipSpan = forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  (props, ref) => <span ref={ref} {...props} />
);
TooltipSpan.displayName = "TooltipSpan";

export function DashboardKPIGrid({ metrics, isLoading, onNavigate }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    );
  }

  const m = metrics;
  const dossiersTotal = (m?.dossiersInitialManquants ?? 0) + (m?.dossiersContinuManquants ?? 0);

  const cards = [
    {
      key: "encaissements",
      label: "Encaissements",
      icon: Euro,
      value: m?.encaissements ?? 0,
      displayValue: formatEur(m?.encaissements ?? 0),
      delta: formatDelta(m?.encaissements ?? 0, m?.encaissementsPrev ?? 0),
      variant: "default" as const,
      ariaLabel: `Encaissements : ${formatEur(m?.encaissements ?? 0)}`,
      onClick: () => onNavigate("finances", { tab: "paiements" }),
      extra: null,
    },
    {
      key: "facturesEnAttente",
      label: "Factures en attente",
      icon: FileText,
      value: m?.facturesEnAttente ?? 0,
      displayValue: String(m?.facturesEnAttente ?? 0),
      delta: null, // snapshot — no reliable delta
      variant: "default" as const,
      ariaLabel: `Factures en attente : ${m?.facturesEnAttente ?? 0}, montant total ${formatEur(m?.facturesEnAttenteMontant ?? 0)}`,
      onClick: () => onNavigate("finances", { tab: "factures", status: "emise" }),
      extra: (m?.facturesEnAttente ?? 0) > 0 ? (
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {formatEur(m?.facturesEnAttenteMontant ?? 0)}
          {(m?.facturesEnAttenteAgeDays ?? 0) > 0 && (
            <span className="ml-1.5">· ancien : {m?.facturesEnAttenteAgeDays}j</span>
          )}
        </p>
      ) : null,
    },
    {
      key: "paiementsRetard",
      label: "Paiements en retard",
      icon: CreditCard,
      value: m?.paiementsRetard ?? 0,
      displayValue: String(m?.paiementsRetard ?? 0),
      delta: null,
      variant: (m?.paiementsRetard ?? 0) > 0 ? ("destructive" as const) : ("default" as const),
      ariaLabel: `Paiements en retard : ${m?.paiementsRetard ?? 0}, montant ${formatEur(m?.paiementsRetardMontant ?? 0)}`,
      onClick: () => onNavigate("finances", { tab: "paiements", status: "en_retard" }),
      extra: (m?.paiementsRetard ?? 0) > 0 ? (
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {formatEur(m?.paiementsRetardMontant ?? 0)}
          {(m?.paiementsRetardAgeDays ?? 0) > 0 && (
            <span className="ml-1.5">· plus ancien : {m?.paiementsRetardAgeDays}j</span>
          )}
        </p>
      ) : null,
    },
    {
      key: "prospectsRelance",
      label: "Prospects à relancer",
      icon: Phone,
      value: m?.prospectsRelance ?? 0,
      displayValue: String(m?.prospectsRelance ?? 0),
      delta: null,
      variant: "default" as const,
      ariaLabel: `Prospects à relancer : ${m?.prospectsRelance ?? 0}`,
      onClick: () => onNavigate("prospects", { filter: "relance_due" }),
      extra: null,
    },
    {
      key: "sessionsRisque",
      label: "Sessions à risque",
      icon: AlertTriangle,
      value: m?.sessionsRisque ?? 0,
      displayValue: String(m?.sessionsRisque ?? 0),
      delta: null,
      variant: (m?.sessionsRisque ?? 0) > 0 ? ("warning" as const) : ("default" as const),
      ariaLabel: `Sessions à risque : ${m?.sessionsRisque ?? 0}`,
      onClick: () => onNavigate("sessions", { risk: "true" }),
      extra: null,
    },
    {
      key: "dossiersIncomplets",
      label: "Dossiers incomplets",
      icon: FolderOpen,
      value: dossiersTotal,
      displayValue: String(dossiersTotal),
      delta: null,
      variant: dossiersTotal > 0 ? ("warning" as const) : ("default" as const),
      ariaLabel: `Dossiers incomplets : ${dossiersTotal}`,
      onClick: () => onNavigate("contacts", { filter: "admin_blockers" }),
      extra: dossiersTotal > 0 ? (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {(m?.dossiersInitialManquants ?? 0) > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              CMA : {m?.dossiersInitialManquants}
            </Badge>
          )}
          {(m?.dossiersContinuManquants ?? 0) > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              Carte Pro : {m?.dossiersContinuManquants}
            </Badge>
          )}
        </div>
      ) : null,
    },
  ];

  const variantStyles = {
    default: {
      border: "border-border hover:border-primary/30",
      icon: "bg-muted",
      iconColor: "text-muted-foreground group-hover:text-primary transition-colors",
      valueColor: "text-foreground",
    },
    destructive: {
      border: "border-destructive/30",
      icon: "bg-destructive/10",
      iconColor: "text-destructive",
      valueColor: "text-destructive",
    },
    warning: {
      border: "border-warning/30",
      icon: "bg-warning/10",
      iconColor: "text-warning",
      valueColor: "text-foreground",
    },
  };

  return (
    <TooltipProvider>
      <div
        className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4"
        role="region"
        aria-label="Indicateurs de direction"
      >
        {cards.map((card) => {
          const Icon = card.icon;
          const styles = variantStyles[card.variant];
          const hasValue = card.value > 0;

          return (
            <button
              key={card.key}
              onClick={card.onClick}
              aria-label={card.ariaLabel}
              className={cn(
                "rounded-xl border bg-card p-4 text-left hover:shadow-sm transition-all group focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none",
                styles.border
              )}
            >
              <div className="flex items-center gap-2 mb-2.5">
                <div
                  className={cn(
                    "flex items-center justify-center h-7 w-7 rounded-lg",
                    styles.icon
                  )}
                >
                  <Icon className={cn("h-3.5 w-3.5", styles.iconColor)} />
                </div>
                <span className="text-[11px] font-medium text-muted-foreground leading-tight">
                  {card.label}
                </span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p
                    className={cn(
                      "text-xl font-bold tracking-tight",
                      hasValue ? styles.valueColor : "text-muted-foreground/40"
                    )}
                  >
                    {card.displayValue}
                  </p>
                  {card.extra}
                </div>
                {card.delta && (
                  card.delta.tooltip ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TooltipSpan className="text-xs font-medium text-muted-foreground/50 cursor-help">
                          {card.delta.text}
                        </TooltipSpan>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        {card.delta.tooltip}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <span
                      className={cn(
                        "text-xs font-medium",
                        card.delta.positive ? "text-success" : "text-destructive"
                      )}
                    >
                      {card.delta.text}
                    </span>
                  )
                )}
              </div>
            </button>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
