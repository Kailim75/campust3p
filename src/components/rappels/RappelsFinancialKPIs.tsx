import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, AlertTriangle, Clock, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface RappelsFinancialKPIsProps {
  montantTotalEnAttente: number;
  montantCritique: number;
  retardMoyen: number;
  disciplineScore: number;
  disciplineLevel: "healthy" | "warning" | "danger";
}

const LEVEL_CONFIG = {
  healthy: { label: "Sain", className: "bg-emerald-500/10 text-emerald-600 border-emerald-200", dot: "bg-emerald-500" },
  warning: { label: "À surveiller", className: "bg-amber-500/10 text-amber-600 border-amber-200", dot: "bg-amber-500" },
  danger: { label: "En danger", className: "bg-destructive/10 text-destructive border-destructive/20", dot: "bg-destructive" },
};

function formatMontant(v: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
}

export function RappelsFinancialKPIs({
  montantTotalEnAttente,
  montantCritique,
  retardMoyen,
  disciplineScore,
  disciplineLevel,
}: RappelsFinancialKPIsProps) {
  const level = LEVEL_CONFIG[disciplineLevel];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* Montant en attente */}
      <Card className="p-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
          <DollarSign className="h-4 w-4 text-amber-600" />
        </div>
        <div className="min-w-0">
          <p className="text-base font-bold text-foreground leading-none truncate">
            {formatMontant(montantTotalEnAttente)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">En attente</p>
        </div>
      </Card>

      {/* Montant critique */}
      <Card className={cn("p-3 flex items-center gap-3", montantCritique > 0 && "border-destructive/30")}>
        <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </div>
        <div className="min-w-0">
          <p className="text-base font-bold text-foreground leading-none truncate">
            {formatMontant(montantCritique)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Critique (&gt;15j)
          </p>
        </div>
      </Card>

      {/* Retard moyen */}
      <Card className="p-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Clock className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-base font-bold text-foreground leading-none">
            {retardMoyen}j
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Retard moyen</p>
        </div>
      </Card>

      {/* Score discipline */}
      <Card className={cn("p-3 flex items-center gap-3", disciplineLevel === "danger" && "border-destructive/30")}>
        <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", level.className.split(" ").filter(c => c.startsWith("bg-")).join(" "))}>
          <Activity className={cn("h-4 w-4", level.className.split(" ").filter(c => c.startsWith("text-")).join(" "))} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-base font-bold text-foreground leading-none">
              {disciplineScore}
            </p>
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
