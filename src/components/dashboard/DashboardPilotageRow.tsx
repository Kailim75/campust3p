import { Euro, FileText, CreditCard, Phone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { DashboardMetrics } from "@/hooks/useDashboardMetrics";
import { formatEur, formatDelta, formatCountDelta } from "@/lib/format-currency";

interface Props {
  metrics: DashboardMetrics | undefined;
  isLoading: boolean;
  onNavigate: (section: string, params?: Record<string, string>) => void;
}

const cards = [
  {
    key: "encaissements" as const,
    prevKey: "encaissementsPrev" as const,
    label: "Encaissements",
    icon: Euro,
    isCurrency: true,
    onClick: (nav: Props["onNavigate"]) => nav("finances", { tab: "paiements" }),
  },
  {
    key: "facturesEnAttente" as const,
    prevKey: "facturesEnAttentePrev" as const,
    label: "Factures en attente",
    icon: FileText,
    isCurrency: false,
    onClick: (nav: Props["onNavigate"]) => nav("finances", { tab: "factures", status: "emise" }),
  },
  {
    key: "paiementsRetard" as const,
    prevKey: "paiementsRetardPrev" as const,
    label: "Paiements en retard",
    icon: CreditCard,
    isCurrency: false,
    variant: "destructive" as const,
    onClick: (nav: Props["onNavigate"]) => nav("finances", { tab: "paiements", status: "en_retard" }),
  },
  {
    key: "prospectsRelance" as const,
    prevKey: "prospectsRelancePrev" as const,
    label: "Prospects à relancer",
    icon: Phone,
    isCurrency: false,
    onClick: (nav: Props["onNavigate"]) => nav("prospects", { filter: "relance_due" }),
  },
];

export function DashboardPilotageRow({ metrics, isLoading, onNavigate }: Props) {
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

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const value = metrics?.[card.key] ?? 0;
        const prev = metrics?.[card.prevKey] ?? 0;
        const delta = card.isCurrency
          ? formatDelta(value, prev)
          : formatCountDelta(value, prev);
        const isDestructive = "variant" in card && card.variant === "destructive" && value > 0;

        return (
          <button
            key={card.key}
            onClick={() => card.onClick(onNavigate)}
            className={cn(
              "rounded-xl border bg-card p-5 text-left hover:shadow-sm transition-all group",
              isDestructive ? "border-destructive/30" : "border-border hover:border-primary/30"
            )}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className={cn(
                "flex items-center justify-center h-8 w-8 rounded-lg",
                isDestructive ? "bg-destructive/10" : "bg-muted"
              )}>
                <Icon className={cn(
                  "h-4 w-4",
                  isDestructive ? "text-destructive" : "text-muted-foreground group-hover:text-primary transition-colors"
                )} />
              </div>
              <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
            </div>
            <div className="flex items-end justify-between">
              <p className={cn(
                "text-2xl font-bold tracking-tight",
                isDestructive ? "text-destructive" : "text-foreground"
              )}>
                {card.isCurrency ? formatEur(value) : value}
              </p>
              <span className={cn(
                "text-xs font-medium",
                delta.positive ? "text-success" : "text-destructive"
              )}>
                {delta.text}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
