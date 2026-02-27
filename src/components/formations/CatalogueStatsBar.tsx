import { Package, Euro, Clock, ToggleRight, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { type CatalogueFormation } from "@/hooks/useCatalogueFormations";

interface CatalogueStatsBarProps {
  formations: CatalogueFormation[];
}

export function CatalogueStatsBar({ formations }: CatalogueStatsBarProps) {
  const totalArticles = formations.length;
  const articlesActifs = formations.filter(f => f.actif).length;
  const totalCA = formations.reduce((sum, f) => sum + f.prix_ht, 0);
  const dureeMoyenne = totalArticles > 0 
    ? Math.round(formations.reduce((sum, f) => sum + f.duree_heures, 0) / totalArticles) 
    : 0;
  const tauxActif = totalArticles > 0 ? Math.round((articlesActifs / totalArticles) * 100) : 0;

  const stats = [
    {
      label: "Articles",
      value: totalArticles,
      detail: `${articlesActifs} actifs`,
      icon: Package,
      accent: "text-primary",
      ring: "ring-primary/10",
      iconBg: "bg-primary/8",
    },
    {
      label: "Prix moyen",
      value: totalArticles > 0 
        ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(totalCA / totalArticles)
        : "—",
      detail: `Total ${new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(totalCA)}`,
      icon: Euro,
      accent: "text-success",
      ring: "ring-success/10",
      iconBg: "bg-success/8",
    },
    {
      label: "Durée moyenne",
      value: `${dureeMoyenne}h`,
      detail: `${formations.filter(f => f.duree_heures === 0).length} sans durée`,
      icon: Clock,
      accent: "text-info",
      ring: "ring-info/10",
      iconBg: "bg-info/8",
    },
    {
      label: "Taux d'activité",
      value: `${tauxActif}%`,
      detail: `${totalArticles - articlesActifs} inactif(s)`,
      icon: TrendingUp,
      accent: "text-warning",
      ring: "ring-warning/10",
      iconBg: "bg-warning/8",
      progress: tauxActif,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={cn(
            "relative overflow-hidden rounded-xl border bg-card p-5",
            "transition-all duration-200 hover:shadow-sm hover:border-border/80"
          )}
        >
          {/* Subtle accent line at top */}
          <div className={cn("absolute top-0 left-0 right-0 h-0.5", stat.iconBg)} />
          
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </p>
              <p className="text-2xl font-bold tracking-tight leading-none">
                {stat.value}
              </p>
              <p className="text-[11px] text-muted-foreground/70 mt-1">
                {stat.detail}
              </p>
            </div>
            <div className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              stat.iconBg
            )}>
              <stat.icon className={cn("h-5 w-5", stat.accent)} />
            </div>
          </div>

          {/* Progress bar for taux d'activité */}
          {stat.progress !== undefined && (
            <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-warning transition-all duration-500"
                style={{ width: `${stat.progress}%` }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
