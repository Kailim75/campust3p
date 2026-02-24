import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Timer,
  Target,
  BarChart3,
  AlertTriangle,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, subMonths } from "date-fns";
import { fr } from "date-fns/locale";

interface RappelsPerformanceBlockProps {
  delaiEncaissementMoyen: number;
  delaiEncaissementMoisPrecedent: number;
  tauxRelancesEfficaces: number;
  tauxRelancesEfficacesMoisPrecedent: number;
  encaissementsMoisActuel: number;
  encaissementsMoisPrecedent: number;
  montantCritique: number;
}

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
      {diff > 0 ? "+" : ""}{diff}{unit} vs mois dernier
    </span>
  );
}

export function RappelsPerformanceBlock(props: RappelsPerformanceBlockProps) {
  const [open, setOpen] = useState(false);
  const now = new Date();
  const moisActuel = format(now, "MMMM", { locale: fr });
  const moisPrecedent = format(subMonths(now, 1), "MMMM", { locale: fr });

  const evolutionEncaissements = props.encaissementsMoisPrecedent > 0
    ? Math.round(((props.encaissementsMoisActuel - props.encaissementsMoisPrecedent) / props.encaissementsMoisPrecedent) * 100)
    : 0;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1.5 w-full justify-center hover:text-foreground">
          <BarChart3 className="h-3.5 w-3.5" />
          Voir performance financière
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* 1. Encaissement moyen */}
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

          {/* 2. Relances efficaces */}
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

          {/* 3. Encaissements mois en cours */}
          <Card className="p-3 space-y-1.5">
            <div className="flex items-center gap-2">
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

          {/* 4. Montant critique */}
          <Card className={cn("p-3 flex items-center gap-3", props.montantCritique > 0 && "border-destructive/30")}>
            <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold text-foreground leading-none truncate">
                {formatMontant(props.montantCritique)}
              </p>
              <p className="text-[10px] text-muted-foreground">Critique (&gt;15j)</p>
            </div>
          </Card>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
