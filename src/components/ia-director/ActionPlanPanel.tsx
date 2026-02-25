import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Clock, DollarSign, User, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActionPlan, ActionPlanItem } from "@/hooks/useActionPlan";

const categorieConfig: Record<string, { label: string; color: string }> = {
  commercial: { label: "Commercial", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  administratif: { label: "Admin", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  financier: { label: "Financier", color: "bg-green-500/10 text-green-600 border-green-500/20" },
  qualite: { label: "Qualité", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  strategie: { label: "Stratégie", color: "bg-primary/10 text-primary border-primary/20" },
};

const responsableConfig: Record<string, { label: string; icon: string }> = {
  admin: { label: "Admin", icon: "🏢" },
  commercial: { label: "Commercial", icon: "📞" },
  formateur: { label: "Formateur", icon: "🎓" },
  direction: { label: "Direction", icon: "👔" },
};

interface Props {
  plan: ActionPlan | null;
  isGenerating: boolean;
  onGenerate: () => void;
}

export default function ActionPlanPanel({ plan, isGenerating, onGenerate }: Props) {
  if (!plan && !isGenerating) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <Sparkles className="h-10 w-10 text-muted-foreground/40" />
          <div className="text-center">
            <p className="font-medium text-foreground">Plan d'action IA</p>
            <p className="text-sm text-muted-foreground mt-1">
              Générez un plan d'action quotidien priorisé basé sur l'audit de votre centre
            </p>
          </div>
          <Button onClick={onGenerate} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Générer le plan du jour
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isGenerating) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">L'IA analyse votre centre et génère le plan d'action...</p>
        </CardContent>
      </Card>
    );
  }

  if (!plan) return null;

  const totalImpact = plan.actions.reduce((s, a) => s + (a.impact_estime_euros || 0), 0);
  const totalDuree = plan.actions.reduce((s, a) => s + (a.duree_estimee_minutes || 0), 0);

  return (
    <div className="space-y-4">
      {/* Header with urgency score */}
      <Card className={cn("border-primary/20", plan.score_urgence_global >= 70 && "border-destructive/30")}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Plan d'action — {new Date(plan.plan_date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={plan.score_urgence_global >= 70 ? "destructive" : plan.score_urgence_global >= 40 ? "default" : "outline"}>
                Urgence : {plan.score_urgence_global}/100
              </Badge>
              <Button variant="ghost" size="sm" onClick={onGenerate} className="gap-1 text-xs">
                <Sparkles className="h-3 w-3" />
                Régénérer
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{plan.resume_executif}</p>
          <div className="flex items-center gap-4 mt-3 pt-3 border-t text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {plan.actions.length} actions
            </span>
            {totalImpact > 0 && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <DollarSign className="h-3.5 w-3.5" />
                {totalImpact.toLocaleString("fr-FR")}€ d'impact
              </span>
            )}
            {totalDuree > 0 && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                ~{totalDuree} min
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action items */}
      <div className="space-y-2">
        {plan.actions
          .sort((a, b) => a.priorite - b.priorite)
          .map((action, i) => (
            <ActionPlanItemCard key={i} action={action} />
          ))}
      </div>
    </div>
  );
}

function ActionPlanItemCard({ action }: { action: ActionPlanItem }) {
  const cat = categorieConfig[action.categorie] || categorieConfig.strategie;
  const resp = responsableConfig[action.responsable] || responsableConfig.admin;

  return (
    <Card className="hover:shadow-sm transition-all">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <span className="text-lg font-bold text-primary w-7 text-center shrink-0">
            #{action.priorite}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-foreground">{action.titre}</p>
              <Badge variant="outline" className={cn("text-[10px]", cat.color)}>
                {cat.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{action.description}</p>
            <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {resp.icon} {resp.label}
              </span>
              {action.duree_estimee_minutes && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  ~{action.duree_estimee_minutes} min
                </span>
              )}
              {action.impact_estime_euros && action.impact_estime_euros > 0 && (
                <span className="flex items-center gap-1 font-semibold text-foreground">
                  <DollarSign className="h-3 w-3" />
                  {action.impact_estime_euros.toLocaleString("fr-FR")}€
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
