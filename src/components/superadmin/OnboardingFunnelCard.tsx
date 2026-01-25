import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { OnboardingFunnelStep } from "@/hooks/useSuperAdminStats";

interface OnboardingFunnelCardProps {
  funnel: OnboardingFunnelStep[];
  isLoading: boolean;
}

export function OnboardingFunnelCard({ funnel, isLoading }: OnboardingFunnelCardProps) {
  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculer le drop-off entre chaque étape
  const calculateDropOff = (index: number): number | null => {
    if (index === 0) return null;
    const prev = funnel[index - 1]?.percentage || 0;
    const current = funnel[index]?.percentage || 0;
    return prev - current;
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Entonnoir d'activation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {funnel.map((step, index) => {
            const dropOff = calculateDropOff(index);
            const isLowConversion = dropOff !== null && dropOff > 20;
            
            return (
              <div key={step.step} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {step.step}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {step.count}
                    </span>
                    <span className={cn(
                      "text-sm font-semibold",
                      step.percentage >= 70 ? "text-success" : 
                      step.percentage >= 40 ? "text-warning" : "text-destructive"
                    )}>
                      {step.percentage}%
                    </span>
                    {dropOff !== null && dropOff > 0 && (
                      <span className={cn(
                        "text-xs",
                        isLowConversion ? "text-destructive" : "text-muted-foreground"
                      )}>
                        (-{dropOff}%)
                      </span>
                    )}
                  </div>
                </div>
                <Progress 
                  value={step.percentage} 
                  className={cn(
                    "h-2",
                    isLowConversion && "[&>div]:bg-destructive"
                  )}
                />
              </div>
            );
          })}
        </div>

        {/* Insight */}
        {funnel.length > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border/50">
            <p className="text-xs text-muted-foreground">
              {funnel[funnel.length - 1]?.percentage < 50 
                ? "⚠️ Le taux de conversion jusqu'à la 1ère session est faible. Envisagez d'améliorer l'accompagnement post-onboarding."
                : "✓ Bon taux d'activation des centres. Continuez à monitorer les étapes intermédiaires."
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
