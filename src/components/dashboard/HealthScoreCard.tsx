import { cn } from "@/lib/utils";
import { useDashboardHealthScore } from "@/hooks/useDashboardHealthScore";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, AlertTriangle, TrendingDown } from "lucide-react";

export function HealthScoreCard() {
  const { data, isLoading } = useDashboardHealthScore();

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="flex items-center gap-6">
          <Skeleton className="h-24 w-24 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  const score = data?.score ?? 0;
  const level = score >= 75 ? "good" : score >= 50 ? "warning" : "critical";

  const levelConfig = {
    good: {
      ring: "text-success",
      bg: "bg-success/10",
      border: "border-success/20",
      label: "Bonne santé",
      trackColor: "stroke-success/20",
      strokeColor: "stroke-success",
    },
    warning: {
      ring: "text-warning",
      bg: "bg-warning/10",
      border: "border-warning/20",
      label: "Attention requise",
      trackColor: "stroke-warning/20",
      strokeColor: "stroke-warning",
    },
    critical: {
      ring: "text-destructive",
      bg: "bg-destructive/10",
      border: "border-destructive/20",
      label: "Situation critique",
      trackColor: "stroke-destructive/20",
      strokeColor: "stroke-destructive",
    },
  };

  const config = levelConfig[level];

  return (
    <div className={cn("rounded-xl border bg-card p-6", config.border)}>
      <div className="flex items-center gap-2 mb-5">
        <div className={cn("p-1.5 rounded-lg", config.bg)}>
          <Activity className={cn("h-4 w-4", config.ring)} />
        </div>
        <h2 className="font-display font-semibold text-foreground">Santé du centre</h2>
        <span className={cn("ml-auto text-xs font-medium px-2 py-0.5 rounded-full", config.bg, config.ring)}>
          {config.label}
        </span>
      </div>

      <div className="flex items-center gap-8">
        {/* Score circle */}
        <div className="relative flex-shrink-0">
          <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
            <circle
              cx="60" cy="60" r="48"
              fill="none"
              strokeWidth="10"
              className={config.trackColor}
            />
            <circle
              cx="60" cy="60" r="48"
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 48}
              strokeDashoffset={2 * Math.PI * 48 - (score / 100) * 2 * Math.PI * 48}
              className={cn(config.strokeColor, "transition-all duration-1000")}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("text-3xl font-bold tabular-nums", config.ring)}>{score}</span>
            <span className="text-xs text-muted-foreground">/100</span>
          </div>
        </div>

        {/* Insights */}
        <div className="flex-1 space-y-2">
          {data?.insights.map((insight, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              {insight.includes("vert") ? (
                <Activity className="h-3.5 w-3.5 mt-0.5 text-success flex-shrink-0" />
              ) : insight.includes("Manque") ? (
                <TrendingDown className="h-3.5 w-3.5 mt-0.5 text-destructive flex-shrink-0" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-warning flex-shrink-0" />
              )}
              <span className="text-muted-foreground">{insight}</span>
            </div>
          ))}

          {/* Mini metrics */}
          <div className="flex gap-4 pt-2 mt-2 border-t border-border">
            <div className="text-center">
              <p className="text-lg font-bold tabular-nums text-foreground">{data?.tauxConversion ?? 0}%</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Conversion</p>
            </div>
            <div className="text-center">
              <p className={cn("text-lg font-bold tabular-nums", (data?.tauxRemplissage ?? 0) < 40 ? "text-destructive" : (data?.tauxRemplissage ?? 0) < 70 ? "text-warning" : "text-foreground")}>{data?.tauxRemplissage ?? 0}%</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Remplissage</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold tabular-nums text-foreground">{data?.caConfirmeVsObjectif ?? 0}%</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Recouvrement</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
