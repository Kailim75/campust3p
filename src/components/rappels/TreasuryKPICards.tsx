import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Timer,
  Target,
  TrendingUp,
  TrendingDown,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import type { TreasuryKPIs } from "@/hooks/useTreasuryKPIs";

const LEVEL_CONFIG = {
  healthy: { label: "Sain", className: "bg-emerald-500/10 text-emerald-600 border-emerald-200", dot: "bg-emerald-500" },
  warning: { label: "À surveiller", className: "bg-amber-500/10 text-amber-600 border-amber-200", dot: "bg-amber-500" },
  danger: { label: "En danger", className: "bg-destructive/10 text-destructive border-destructive/20", dot: "bg-destructive" },
};

function formatMontant(v: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
}

function EvolutionBadge({ current, previous, unit = "", inverse = false }: { current: number; previous: number; unit?: string; inverse?: boolean }) {
  if (previous === 0 && current === 0) return null;
  const diff = current - previous;
  const isPositive = inverse ? diff < 0 : diff > 0;
  const isNeutral = diff === 0;

  if (isNeutral) {
    return (
      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
        <Minus className="h-3 w-3" /> stable
      </span>
    );
  }

  return (
    <span className={cn("text-[10px] flex items-center gap-0.5", isPositive ? "text-emerald-600" : "text-destructive")}>
      {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {inverse ? (diff > 0 ? "+" : "") : (diff > 0 ? "+" : "")}
      {diff}{unit} vs mois dernier
    </span>
  );
}

interface TreasuryKPICardsProps extends TreasuryKPIs {}

export function TreasuryKPICards(props: TreasuryKPICardsProps) {
  const level = LEVEL_CONFIG[props.scoreTresorerieLevel];
  const now = new Date();
  const moisActuel = format(now, "MMMM", { locale: fr });
  const moisPrecedent = format(subMonths(now, 1), "MMMM", { locale: fr });

  const evolutionEncaissements = props.encaissementsMoisPrecedent > 0
    ? Math.round(((props.encaissementsMoisActuel - props.encaissementsMoisPrecedent) / props.encaissementsMoisPrecedent) * 100)
    : 0;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">Indicateurs Trésorerie</h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* 1. Temps moyen d'encaissement */}
        <Card className="p-3 space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Timer className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold text-foreground leading-none">
                {props.delaiEncaissementMoyen}j
              </p>
              <p className="text-[10px] text-muted-foreground">Encaissement moyen</p>
            </div>
          </div>
          <EvolutionBadge
            current={props.delaiEncaissementMoyen}
            previous={props.delaiEncaissementMoisPrecedent}
            unit="j"
            inverse
          />
        </Card>

        {/* 2. Taux de relances efficaces */}
        <Card className="p-3 space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Target className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold text-foreground leading-none">
                {props.tauxRelancesEfficaces}%
              </p>
              <p className="text-[10px] text-muted-foreground">Relances efficaces</p>
            </div>
          </div>
          <EvolutionBadge
            current={props.tauxRelancesEfficaces}
            previous={props.tauxRelancesEfficacesMoisPrecedent}
            unit="%"
          />
        </Card>

        {/* 3. Score Trésorerie */}
        <Card className={cn("p-3 space-y-1", props.scoreTresorerieLevel === "danger" && "border-destructive/30")}>
          <div className="flex items-center gap-2">
            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", level.className.split(" ").filter(c => c.startsWith("bg-")).join(" "))}>
              <Activity className={cn("h-4 w-4", level.className.split(" ").filter(c => c.startsWith("text-")).join(" "))} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <p className="text-lg font-bold text-foreground leading-none">
                  {props.scoreTresorerie}
                </p>
                <span className="text-[10px] text-muted-foreground">/ 100</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Score trésorerie</p>
            </div>
          </div>
          <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", level.className)}>
            <span className={cn("h-1.5 w-1.5 rounded-full mr-1", level.dot)} />
            {level.label}
          </Badge>
        </Card>

        {/* 4. Vue mensuelle comparative */}
        <Card className="p-3 space-y-1.5">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
              <BarChart3 className="h-4 w-4 text-info" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold text-foreground leading-none">
                {formatMontant(props.encaissementsMoisActuel)}
              </p>
              <p className="text-[10px] text-muted-foreground capitalize">Encaissé en {moisActuel}</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground capitalize">{moisPrecedent} : {formatMontant(props.encaissementsMoisPrecedent)}</span>
            {evolutionEncaissements !== 0 && (
              <span className={cn("flex items-center gap-0.5 font-medium", evolutionEncaissements > 0 ? "text-emerald-600" : "text-destructive")}>
                {evolutionEncaissements > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {evolutionEncaissements > 0 ? "+" : ""}{evolutionEncaissements}%
              </span>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
