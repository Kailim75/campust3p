import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CalendarCheck, TrendingUp, Euro, AlertTriangle, ArrowUp, ArrowDown } from "lucide-react";
import { WeeklyKPIs } from "@/hooks/useWeeklyPlanningKPIs";
import { cn } from "@/lib/utils";

interface PlanningKPIBannerProps {
  kpis: WeeklyKPIs;
}

export function PlanningKPIBanner({ kpis }: PlanningKPIBannerProps) {
  const items = [
    {
      label: "Programmées",
      value: `${kpis.heuresProgrammees}h`,
      icon: Clock,
      color: "text-muted-foreground",
    },
    {
      label: "Réservées",
      value: `${kpis.heuresReservees}h`,
      icon: CalendarCheck,
      color: "text-primary",
    },
    {
      label: "Occupation",
      value: `${kpis.tauxOccupation}%`,
      icon: TrendingUp,
      color: kpis.tauxOccupation >= 80 ? "text-success" : kpis.tauxOccupation >= 60 ? "text-warning" : "text-destructive",
      sub: kpis.variationVsSemainePrecedente !== null ? (
        <span className={cn(
          "flex items-center gap-0.5 text-[10px] font-medium",
          kpis.variationVsSemainePrecedente >= 0 ? "text-success" : "text-destructive"
        )}>
          {kpis.variationVsSemainePrecedente >= 0 ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
          {kpis.variationVsSemainePrecedente >= 0 ? "+" : ""}{kpis.variationVsSemainePrecedente}% vs sem. préc.
        </span>
      ) : null,
    },
    {
      label: "CA généré",
      value: `${kpis.caGenere.toLocaleString("fr-FR")} €`,
      icon: Euro,
      color: "text-primary",
    },
    {
      label: "Récupérable",
      value: `${kpis.potentielRecuperable.toLocaleString("fr-FR")} €`,
      icon: AlertTriangle,
      color: kpis.potentielRecuperable > 0 ? "text-warning" : "text-muted-foreground",
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {items.map((item) => (
          <Card key={item.label} className="p-3 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <item.icon className={cn("h-3.5 w-3.5", item.color)} />
              {item.label}
            </div>
            <div className={cn("text-lg font-bold", item.color)}>{item.value}</div>
            {item.sub}
          </Card>
        ))}
      </div>

      {/* Score + risque row */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant={kpis.scoreColor === "success" ? "default" : kpis.scoreColor === "warning" ? "secondary" : "destructive"}
          className="text-sm px-3 py-1">
          Score : {kpis.scoreRentabilite}/100 — {kpis.scoreLabel}
        </Badge>

        {kpis.creneauxARisque.length > 0 && (
          <Badge variant="outline" className="border-warning text-warning text-xs px-2 py-1">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {kpis.creneauxARisque.length} créneau{kpis.creneauxARisque.length > 1 ? "x" : ""} vide{kpis.creneauxARisque.length > 1 ? "s" : ""} &lt;48h = {(kpis.creneauxARisque.length * 80).toLocaleString("fr-FR")} € récupérables
          </Badge>
        )}
      </div>
    </div>
  );
}
