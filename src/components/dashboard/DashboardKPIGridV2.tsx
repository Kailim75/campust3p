/**
 * DashboardKPIGridV2 — 8 strategic KPI cards for the cockpit.
 * 
 * Row 1 (Financial): CA Encaissé | CA Facturé | Reste à encaisser | Panier moyen
 * Row 2 (Operational): Inscriptions | Taux remplissage | Sessions à risque | Dossiers incomplets
 */

import { Euro, FileText, Receipt, ShoppingCart, Users, Gauge, AlertTriangle, FolderOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DashboardMetrics } from "@/hooks/useDashboardData";
import { formatEur, formatDelta, formatCountDelta } from "@/lib/format-currency";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { forwardRef } from "react";
import { useDashboardPeriodV2 } from "@/hooks/useDashboardPeriodV2";
import { isAfter, endOfMonth, startOfMonth } from "date-fns";

interface Props {
  metrics: DashboardMetrics | undefined;
  isLoading: boolean;
  onNavigate: (section: string, params?: Record<string, string>) => void;
}

const TooltipSpan = forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  (props, ref) => <span ref={ref} {...props} />
);
TooltipSpan.displayName = "TooltipSpan";

type CardVariant = "default" | "destructive" | "warning" | "success";

interface KPICard {
  key: string;
  label: string;
  icon: typeof Euro;
  displayValue: string;
  delta: { text: string; positive: boolean; tooltip?: string } | null;
  variant: CardVariant;
  ariaLabel: string;
  onClick: () => void;
  extra: React.ReactNode;
  value: number;
}

export function DashboardKPIGridV2({ metrics, isLoading, onNavigate }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <Skeleton className="h-4 w-20 mb-3" />
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>
    );
  }

  const { period } = useDashboardPeriodV2();
  
  // Detect partial period: current month where end is in the future
  const isPartialPeriod = period.range === "month" && isAfter(endOfMonth(new Date()), new Date()) && 
    period.from.getTime() === startOfMonth(new Date()).getTime();

  const m = metrics;
  const dossiersTotal = (m?.dossiersInitialManquants ?? 0) + (m?.dossiersContinuManquants ?? 0);

  const cards: KPICard[] = [
    // Row 1 — Financial
    {
      key: "caEncaisse",
      label: "CA encaissé",
      icon: Euro,
      displayValue: formatEur(m?.encaissements ?? 0),
      delta: formatDelta(m?.encaissements ?? 0, m?.encaissementsPrev ?? 0, { isPartialPeriod }),
      variant: "success",
      value: m?.encaissements ?? 0,
      ariaLabel: `CA encaissé : ${formatEur(m?.encaissements ?? 0)}`,
      onClick: () => onNavigate("finances", { tab: "paiements" }),
      extra: null,
    },
    {
      key: "caFacture",
      label: "CA facturé",
      icon: FileText,
      displayValue: formatEur(m?.caFacture ?? 0),
      delta: formatDelta(m?.caFacture ?? 0, m?.caFacturePrev ?? 0, { isPartialPeriod }),
      variant: "default",
      value: m?.caFacture ?? 0,
      ariaLabel: `CA facturé : ${formatEur(m?.caFacture ?? 0)}`,
      onClick: () => onNavigate("finances", { tab: "factures" }),
      extra: null,
    },
    {
      key: "resteAEncaisser",
      label: "Reste à encaisser",
      icon: Receipt,
      displayValue: formatEur(m?.resteAEncaisser ?? 0),
      delta: null,
      variant: (m?.resteAEncaisser ?? 0) > 0 ? "warning" : "default",
      value: m?.resteAEncaisser ?? 0,
      ariaLabel: `Reste à encaisser : ${formatEur(m?.resteAEncaisser ?? 0)}. Factures émises ou partiellement payées, hors brouillons.`,
      onClick: () => onNavigate("finances", { tab: "factures", status: "emise" }),
      extra: (
        <>
          {(m?.paiementsRetard ?? 0) > 0 && (
            <p className="text-[11px] text-destructive mt-0.5">
              dont {formatEur(m?.paiementsRetardMontant ?? 0)} en retard
            </p>
          )}
        </>
      ),
    },
    {
      key: "panierMoyen",
      label: "Panier moyen",
      icon: ShoppingCart,
      displayValue: (m?.panierMoyen ?? 0) > 0 ? formatEur(m?.panierMoyen ?? 0) : "—",
      delta: (m?.panierMoyen ?? 0) > 0 && (m?.panierMoyenPrev ?? 0) > 0 
        ? formatDelta(m?.panierMoyen ?? 0, m?.panierMoyenPrev ?? 0, { isPartialPeriod }) 
        : null,
      variant: "default",
      value: m?.panierMoyen ?? 0,
      ariaLabel: `Panier moyen : ${(m?.panierMoyen ?? 0) > 0 ? formatEur(m?.panierMoyen ?? 0) : "Non disponible"}`,
      onClick: () => onNavigate("finances"),
      extra: null,
    },
    // Row 2 — Operational
    {
      key: "inscriptions",
      label: "Inscriptions",
      icon: Users,
      displayValue: String(m?.inscriptionsCount ?? 0),
      delta: formatCountDelta(m?.inscriptionsCount ?? 0, m?.inscriptionsCountPrev ?? 0, { isPartialPeriod }),
      variant: "default",
      value: m?.inscriptionsCount ?? 0,
      ariaLabel: `Inscriptions : ${m?.inscriptionsCount ?? 0}`,
      onClick: () => onNavigate("sessions"),
      extra: null,
    },
    {
      key: "tauxRemplissage",
      label: "Taux remplissage",
      icon: Gauge,
      displayValue: `${m?.tauxRemplissageGlobal ?? 0} %`,
      delta: null,
      variant: (m?.tauxRemplissageGlobal ?? 0) < 50 ? "warning" : (m?.tauxRemplissageGlobal ?? 0) >= 80 ? "success" : "default",
      value: m?.tauxRemplissageGlobal ?? 0,
      ariaLabel: `Taux de remplissage global : ${m?.tauxRemplissageGlobal ?? 0}%`,
      onClick: () => onNavigate("sessions"),
      extra: null,
    },
    {
      key: "sessionsRisque",
      label: "Sessions à risque",
      icon: AlertTriangle,
      displayValue: String(m?.sessionsRisque ?? 0),
      delta: null,
      variant: (m?.sessionsRisque ?? 0) > 0 ? "destructive" : "default",
      value: m?.sessionsRisque ?? 0,
      ariaLabel: `Sessions à risque : ${m?.sessionsRisque ?? 0}`,
      onClick: () => onNavigate("sessions", { risk: "true" }),
      extra: null,
    },
    {
      key: "dossiersIncomplets",
      label: "Dossiers incomplets",
      icon: FolderOpen,
      displayValue: String(dossiersTotal),
      delta: null,
      variant: dossiersTotal > 0 ? "warning" : "default",
      value: dossiersTotal,
      ariaLabel: `Dossiers incomplets : ${dossiersTotal}`,
      onClick: () => onNavigate("contacts", { filter: "admin_blockers" }),
      extra: dossiersTotal > 0 ? (
        <div className="flex flex-wrap gap-1 mt-1">
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

  const variantStyles: Record<CardVariant, { border: string; icon: string; iconColor: string; valueColor: string }> = {
    default: {
      border: "border-border hover:border-primary/30",
      icon: "bg-muted",
      iconColor: "text-muted-foreground group-hover:text-primary transition-colors",
      valueColor: "text-foreground",
    },
    success: {
      border: "border-success/30",
      icon: "bg-success/10",
      iconColor: "text-success",
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
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
        role="region"
        aria-label="Indicateurs clés de pilotage"
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
              <div className="flex items-center gap-2 mb-2">
                <div className={cn("flex items-center justify-center h-7 w-7 rounded-lg", styles.icon)}>
                  <Icon className={cn("h-3.5 w-3.5", styles.iconColor)} />
                </div>
                <span className="text-[11px] font-medium text-muted-foreground leading-tight">
                  {card.label}
                </span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className={cn(
                    "text-xl font-bold tracking-tight",
                    hasValue ? styles.valueColor : "text-muted-foreground/40"
                  )}>
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
                    <span className={cn(
                      "text-xs font-medium",
                      card.delta.positive ? "text-success" : "text-destructive"
                    )}>
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
