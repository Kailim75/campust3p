import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Bell, Clock, DollarSign, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface RappelsActionKPIsProps {
  overdueCount: number;
  todayCount: number;
  tomorrowCount: number;
  montantARelancer: number;
  hasFinancialRappels: boolean;
  unifiedScore: number;
  unifiedScoreLevel: "healthy" | "warning" | "danger";
}

const LEVEL_CONFIG = {
  healthy: { label: "Sain", className: "bg-emerald-500/10 text-emerald-600 border-emerald-200", dot: "bg-emerald-500" },
  warning: { label: "À surveiller", className: "bg-amber-500/10 text-amber-600 border-amber-200", dot: "bg-amber-500" },
  danger: { label: "En danger", className: "bg-destructive/10 text-destructive border-destructive/20", dot: "bg-destructive" },
};

function formatMontant(v: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
}

export function RappelsActionKPIs({
  overdueCount,
  todayCount,
  tomorrowCount,
  montantARelancer,
  hasFinancialRappels,
  unifiedScore,
  unifiedScoreLevel,
}: RappelsActionKPIsProps) {
  const level = LEVEL_CONFIG[unifiedScoreLevel];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {/* 1. En retard */}
      <Card className={cn("p-3 flex items-center gap-3", overdueCount > 0 && "border-destructive/30")}>
        <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </div>
        <div>
          <p className="text-xl font-bold text-foreground leading-none">{overdueCount}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">En retard</p>
        </div>
      </Card>

      {/* 2. Aujourd'hui */}
      <Card className="p-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
          <Bell className="h-4 w-4 text-warning" />
        </div>
        <div>
          <p className="text-xl font-bold text-foreground leading-none">{todayCount}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Aujourd'hui</p>
        </div>
      </Card>

      {/* 3. Demain */}
      <Card className="p-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
          <Clock className="h-4 w-4 text-info" />
        </div>
        <div>
          <p className="text-xl font-bold text-foreground leading-none">{tomorrowCount}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Demain</p>
        </div>
      </Card>

      {/* 4. Montant à relancer */}
      <Card className={cn("p-3 flex items-center gap-3", hasFinancialRappels && montantARelancer > 0 && "border-amber-300/50")}>
        <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
          <DollarSign className="h-4 w-4 text-amber-600" />
        </div>
        <div className="min-w-0">
          {hasFinancialRappels ? (
            <>
              <p className="text-base font-bold text-foreground leading-none truncate">
                {formatMontant(montantARelancer)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">À relancer</p>
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground leading-tight">
                Aucune relance financière active
              </p>
            </>
          )}
        </div>
      </Card>

      {/* 5. Score unifié */}
      <Card className={cn("p-3 flex items-center gap-3", unifiedScoreLevel === "danger" && "border-destructive/30")}>
        <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
          level.className.split(" ").filter(c => c.startsWith("bg-")).join(" ")
        )}>
          <Activity className={cn("h-4 w-4",
            level.className.split(" ").filter(c => c.startsWith("text-")).join(" ")
          )} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <p className="text-xl font-bold text-foreground leading-none">{unifiedScore}</p>
            <span className="text-[10px] text-muted-foreground">/ 100</span>
          </div>
          <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 mt-0.5", level.className)}>
            <span className={cn("h-1.5 w-1.5 rounded-full mr-1", level.dot)} />
            {level.label}
          </Badge>
        </div>
      </Card>
    </div>
  );
}
