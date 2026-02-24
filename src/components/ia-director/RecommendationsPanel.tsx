import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Lightbulb, Target, Activity, FileText, CreditCard, ShieldCheck, TrendingUp, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Recommendation } from "./recommendationEngine";

const typeConfig: Record<string, { icon: typeof Target; label: string }> = {
  prospect: { icon: Target, label: "Prospect" },
  commercial: { icon: TrendingUp, label: "Commercial" },
  sante: { icon: Activity, label: "Santé CRM" },
  administratif: { icon: FileText, label: "Administratif" },
  financier: { icon: CreditCard, label: "Financier" },
  risque: { icon: ShieldCheck, label: "Risque CA" },
};

const prioriteConfig = {
  critique: { label: "Critique", className: "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400" },
  haute: { label: "Haute", className: "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400" },
  moyenne: { label: "Moyenne", className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20 dark:text-yellow-400" },
  basse: { label: "Basse", className: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400" },
};

interface Props {
  recommendations: Recommendation[];
}

export default function RecommendationsPanel({ recommendations }: Props) {
  const totalImpact = recommendations.reduce((s, r) => s + r.impact_estime_euros, 0);
  const critiques = recommendations.filter((r) => r.priorite === "critique").length;

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Lightbulb className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Aucune recommandation</p>
          <p className="text-sm">Lancez l'analyse pour générer des recommandations</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Lightbulb className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{recommendations.length}</p>
              <p className="text-xs text-muted-foreground">Recommandations</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{critiques}</p>
              <p className="text-xs text-muted-foreground">Critiques</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {totalImpact.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€
              </p>
              <p className="text-xs text-muted-foreground">Impact total estimé</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendation cards */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Recommandations — Triées par Impact
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[500px]">
            <div className="divide-y divide-border">
              {recommendations.map((rec, i) => {
                const tCfg = typeConfig[rec.type] || typeConfig.prospect;
                const pCfg = prioriteConfig[rec.priorite];
                const Icon = tCfg.icon;
                return (
                  <div key={rec.id} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start gap-3">
                      <span className="text-lg font-bold text-muted-foreground w-6 shrink-0 pt-0.5">
                        #{i + 1}
                      </span>
                      <div className="p-1.5 rounded-md bg-muted shrink-0 mt-0.5">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-foreground text-sm">
                            {rec.action_recommandee}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {rec.justification}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={cn("text-[10px]", pCfg.className)}>
                            {pCfg.label}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {tCfg.label}
                          </Badge>
                          {rec.impact_estime_euros > 0 && (
                            <span className="text-xs font-semibold text-foreground">
                              {rec.impact_estime_euros.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            Confiance : {rec.score_confiance}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
