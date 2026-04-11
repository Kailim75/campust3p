import { AlertTriangle, CreditCard, Calendar, Phone, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useDashboardPeriodV2 } from "@/hooks/useDashboardPeriodV2";

interface DashboardAlertsRowProps {
  onNavigate: (section: string) => void;
  onNavigateWithContact: (section: string, contactId?: string) => void;
}

const alertCards = [
  { key: "sessionsRisque", label: "Sessions à risque", icon: AlertTriangle, section: "sessions", variant: "warning" as const },
  { key: "paiementsRetard", label: "Paiements en retard", icon: CreditCard, section: "finances", variant: "destructive" as const },
  { key: "facturesEnAttente", label: "Factures en attente", icon: Calendar, section: "finances", variant: "muted" as const },
  { key: "prospectsRelance", label: "Prospects à relancer", icon: Phone, section: "prospects", variant: "primary" as const },
] as const;

const variantStyles = {
  warning: "text-warning",
  destructive: "text-destructive",
  muted: "text-muted-foreground",
  primary: "text-primary",
};

export function DashboardAlertsRow({ onNavigate }: DashboardAlertsRowProps) {
  const { period } = useDashboardPeriodV2();
  const { data, isLoading } = useDashboardData(period);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-6">
            <Skeleton className="h-4 w-24 mb-4" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    );
  }

  const metrics = data?.metrics;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
      {alertCards.map((card) => {
        const Icon = card.icon;
        const value = metrics?.[card.key] ?? 0;
        const hasAlert = value > 0;

        return (
          <button
            key={card.key}
            onClick={() => onNavigate(card.section)}
            className={cn(
              "rounded-xl border bg-card p-6 text-left transition-all group",
              hasAlert ? "border-border hover:border-primary/30 hover:shadow-sm" : "border-border/50"
            )}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "flex items-center justify-center h-8 w-8 rounded-lg",
                  hasAlert ? "bg-muted" : "bg-muted/50"
                )}>
                  <Icon className={cn("h-4 w-4", hasAlert ? variantStyles[card.variant] : "text-muted-foreground/50")} />
                </div>
                <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
              </div>
              {hasAlert && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
            </div>
            <p className={cn(
              "text-3xl font-bold tracking-tight",
              hasAlert ? "text-foreground" : "text-muted-foreground/40"
            )}>
              {value}
            </p>
          </button>
        );
      })}
    </div>
  );
}
