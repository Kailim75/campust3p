import { Package, Euro, Clock, ToggleRight } from "lucide-react";
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

  const stats = [
    {
      label: "Articles",
      value: totalArticles,
      icon: Package,
      sublabel: `${articlesActifs} actifs`,
      color: "text-primary",
      bgColor: "bg-primary/8",
    },
    {
      label: "Prix moyen",
      value: totalArticles > 0 
        ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(totalCA / totalArticles)
        : "0 €",
      icon: Euro,
      sublabel: `Total: ${new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(totalCA)}`,
      color: "text-success",
      bgColor: "bg-success/8",
    },
    {
      label: "Durée moy.",
      value: `${dureeMoyenne}h`,
      icon: Clock,
      sublabel: `${formations.filter(f => f.duree_heures === 0).length} sans durée`,
      color: "text-info",
      bgColor: "bg-info/8",
    },
    {
      label: "Taux actif",
      value: totalArticles > 0 ? `${Math.round((articlesActifs / totalArticles) * 100)}%` : "0%",
      icon: ToggleRight,
      sublabel: `${totalArticles - articlesActifs} inactif(s)`,
      color: "text-warning",
      bgColor: "bg-warning/8",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors"
        >
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${stat.bgColor}`}>
            <stat.icon className={`h-5 w-5 ${stat.color}`} />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold leading-tight">{stat.value}</p>
            <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
            <p className="text-[10px] text-muted-foreground/70 truncate">{stat.sublabel}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
