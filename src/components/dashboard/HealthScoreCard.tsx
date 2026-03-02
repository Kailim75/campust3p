import { cn } from "@/lib/utils";
import { useDashboardHealthScore } from "@/hooks/useDashboardHealthScore";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, AlertTriangle, TrendingDown, CheckCircle2, Zap } from "lucide-react";

export function HealthScoreCard() {
  const { data, isLoading } = useDashboardHealthScore();

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="flex items-center gap-6">
          <Skeleton className="h-28 w-28 rounded-full" />
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
      emoji: "🟢",
    },
    warning: {
      ring: "text-warning",
      bg: "bg-warning/10",
      border: "border-warning/20",
      label: "Attention requise",
      trackColor: "stroke-warning/20",
      strokeColor: "stroke-warning",
      emoji: "🟡",
    },
    critical: {
      ring: "text-destructive",
      bg: "bg-destructive/10",
      border: "border-destructive/20",
      label: "Situation critique",
      trackColor: "stroke-destructive/20",
      strokeColor: "stroke-destructive",
      emoji: "🔴",
    },
  };

  const config = levelConfig[level];

  const insightIcon = (insight: string) => {
    if (insight.includes("vert") || insight.includes("ordre"))
      return <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-success flex-shrink-0" />;
    if (insight.includes("Manque"))
      return <TrendingDown className="h-3.5 w-3.5 mt-0.5 text-destructive flex-shrink-0" />;
    if (insight.includes("urgent") || insight.includes("impayée"))
      return <Zap className="h-3.5 w-3.5 mt-0.5 text-destructive flex-shrink-0" />;
    return <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-warning flex-shrink-0" />;
  };

  return (
    <div className={cn("rounded-xl border bg-card p-6", config.border)}>
      <div className="flex items-center gap-2 mb-5">
        <div className={cn("p-1.5 rounded-lg", config.bg)}>
          <Activity className={cn("h-4 w-4", config.ring)} />
        </div>
        <h2 className="font-display font-semibold text-foreground">Score Santé du Centre</h2>
        <span className={cn("ml-auto text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5", config.bg, config.ring)}>
          {config.emoji} {config.label}
        </span>
      </div>

      <div className="flex items-center gap-8">
        {/* Score circle */}
        <div className="relative flex-shrink-0">
          <svg width="130" height="130" viewBox="0 0 130 130" className="-rotate-90">
            <circle
              cx="65" cy="65" r="52"
              fill="none"
              strokeWidth="10"
              className={config.trackColor}
            />
            <circle
              cx="65" cy="65" r="52"
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 52}
              strokeDashoffset={2 * Math.PI * 52 - (score / 100) * 2 * Math.PI * 52}
              className={cn(config.strokeColor, "transition-all duration-1000")}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("text-4xl font-bold tabular-nums", config.ring)}>{score}</span>
            <span className="text-xs text-muted-foreground font-medium">/100</span>
          </div>
        </div>

        {/* Insights + Metrics */}
        <div className="flex-1 space-y-3">
          {/* Dynamic insights */}
          <div className="space-y-1.5">
            {data?.insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                {insightIcon(insight)}
                <span className="text-muted-foreground leading-tight">{insight}</span>
              </div>
            ))}
          </div>

          {/* Mini metrics bar */}
          <div className="flex gap-4 pt-3 mt-1 border-t border-border">
            <div className="text-center flex-1">
              <p className={cn("text-lg font-bold tabular-nums", (data?.tauxRemplissage ?? 0) < 40 ? "text-destructive" : (data?.tauxRemplissage ?? 0) < 70 ? "text-warning" : "text-foreground")}>
                {data?.tauxRemplissage ?? 0}%
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Remplissage</p>
            </div>
            <div className="text-center flex-1">
              <p className="text-lg font-bold tabular-nums text-foreground">{data?.tauxConversion ?? 0}%</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Conversion</p>
            </div>
            <div className="text-center flex-1">
              <p className="text-lg font-bold tabular-nums text-foreground">{data?.caConfirmeVsObjectif ?? 0}%</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">CA vs obj.</p>
            </div>
            <div className="text-center flex-1">
              <p className={cn("text-lg font-bold tabular-nums", (data?.nbUrgences ?? 0) > 0 ? "text-destructive" : "text-foreground")}>
                {data?.nbUrgences ?? 0}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Urgences</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
