import { AlertTriangle, UserX, FolderOpen, UserPlus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { DashboardMetrics } from "@/hooks/useDashboardMetrics";
import { formatCountDelta } from "@/lib/format-currency";
import { Badge } from "@/components/ui/badge";

interface Props {
  metrics: DashboardMetrics | undefined;
  isLoading: boolean;
  onNavigate: (section: string, params?: Record<string, string>) => void;
}

export function DashboardRiskRow({ metrics, isLoading, onNavigate }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    );
  }

  const sessionsRisque = metrics?.sessionsRisque ?? 0;
  const apprenantsCritiques = metrics?.apprenantsCritiques ?? 0;
  const dossiersInitial = metrics?.dossiersInitialManquants ?? 0;
  const dossiersContinu = metrics?.dossiersContinuManquants ?? 0;
  const nouveaux = metrics?.nouveauxProspects ?? 0;

  const riskCards = [
    {
      label: "Sessions à risque",
      value: sessionsRisque,
      delta: formatCountDelta(sessionsRisque, metrics?.sessionsRisquePrev ?? 0),
      icon: AlertTriangle,
      variant: sessionsRisque > 0 ? "warning" : "muted",
      onClick: () => onNavigate("sessions", { risk: "true" }),
    },
    {
      label: "Apprenants critiques",
      value: apprenantsCritiques,
      delta: formatCountDelta(apprenantsCritiques, metrics?.apprenantsCritiquesPrev ?? 0),
      icon: UserX,
      variant: apprenantsCritiques > 0 ? "destructive" : "muted",
      onClick: () => onNavigate("contacts", { filter: "admin_blockers" }),
    },
    {
      label: "Dossiers administratifs",
      value: dossiersInitial + dossiersContinu,
      icon: FolderOpen,
      variant: (dossiersInitial + dossiersContinu) > 0 ? "warning" : "muted",
      onClick: () => onNavigate("contacts", { filter: "admin_blockers" }),
      badges: [
        dossiersInitial > 0 && { label: `Initial : ${dossiersInitial} CMA`, track: "initial" },
        dossiersContinu > 0 && { label: `Continue : ${dossiersContinu} Carte Pro`, track: "continuing" },
      ].filter(Boolean) as { label: string; track: string }[],
    },
    {
      label: "Nouveaux prospects",
      value: nouveaux,
      delta: formatCountDelta(nouveaux, metrics?.nouveauxProspectsPrev ?? 0),
      icon: UserPlus,
      variant: "primary",
      onClick: () => onNavigate("prospects", { filter: "new" }),
    },
  ];

  const variantColors: Record<string, string> = {
    warning: "text-warning",
    destructive: "text-destructive",
    muted: "text-muted-foreground/50",
    primary: "text-primary",
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {riskCards.map((card) => {
        const Icon = card.icon;
        const hasAlert = card.value > 0;
        return (
          <button
            key={card.label}
            onClick={card.onClick}
            className={cn(
              "rounded-xl border bg-card p-5 text-left hover:shadow-sm transition-all group",
              hasAlert ? "border-border hover:border-primary/30" : "border-border/50"
            )}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className={cn(
                "flex items-center justify-center h-8 w-8 rounded-lg",
                hasAlert ? "bg-muted" : "bg-muted/50"
              )}>
                <Icon className={cn("h-4 w-4", variantColors[card.variant])} />
              </div>
              <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
            </div>
            <div className="flex items-end justify-between">
              <p className={cn(
                "text-2xl font-bold tracking-tight",
                hasAlert ? "text-foreground" : "text-muted-foreground/40"
              )}>
                {card.value}
              </p>
              {card.delta && (
                <span className={cn(
                  "text-xs font-medium",
                  card.delta.positive ? "text-success" : "text-destructive"
                )}>
                  {card.delta.text}
                </span>
              )}
            </div>
            {card.badges && card.badges.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {card.badges.map((b) => (
                  <Badge key={b.track} variant="outline" className="text-[10px] px-1.5 py-0">
                    {b.label}
                  </Badge>
                ))}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
