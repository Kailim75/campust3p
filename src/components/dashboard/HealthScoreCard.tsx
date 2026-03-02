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
      cardBg: "",
    },
    warning: {
      ring: "text-warning",
      bg: "bg-warning/10",
      border: "border-warning/20",
      label: "Attention requise",
      trackColor: "stroke-warning/20",
      strokeColor: "stroke-warning",
      emoji: "🟡",
      cardBg: score < 60 ? "bg-warning/[0.04]" : "",
    },
    critical: {
      ring: "text-destructive",
      bg: "bg-destructive/10",
      border: "border-destructive/20",
      label: "Situation critique",
      trackColor: "stroke-destructive/20",
      strokeColor: "stroke-destructive",
      emoji: "🔴",
      cardBg: "bg-destructive/[0.04]",
    },
  };

  const config = levelConfig[level];

  // Derive instant answers
  const caVsObj = data?.caConfirmeVsObjectif ?? 0;
  const objAnswer = caVsObj >= 80 ? "En bonne voie" : caVsObj >= 50 ? "Effort nécessaire" : "Objectif compromis";
  const objColor = caVsObj >= 80 ? "text-success" : caVsObj >= 50 ? "text-warning" : "text-destructive";

  const sessionsAtRisk = data?.sessionsAtRisk ?? 0;
  const sessionAnswer = sessionsAtRisk === 0 ? "Aucune" : `${sessionsAtRisk} session${sessionsAtRisk > 1 ? "s" : ""}`;
  const sessionColor = sessionsAtRisk === 0 ? "text-success" : "text-destructive";

  const urgences = data?.nbUrgences ?? 0;
  const urgenceAnswer = urgences === 0 ? "Non" : `${urgences} problème${urgences > 1 ? "s" : ""}`;
  const urgenceColor = urgences === 0 ? "text-success" : "text-destructive";

  // Condensed critical insight
  const buildCriticalInsight = (insight: string) => {
    // Detect patterns like "X sessions sous 40%" + "Manque à gagner"
    if (insight.includes("Manque à gagner")) {
      const amount = insight.match(/[\d\s]+€/)?.[0]?.trim();
      return amount ? `Risque ${amount}` : insight;
    }
    return insight;
  };

  const insightIcon = (insight: string) => {
    if (insight.includes("vert") || insight.includes("ordre"))
      return <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-success flex-shrink-0" />;
    if (insight.includes("Risque") || insight.includes("Manque"))
      return <TrendingDown className="h-3.5 w-3.5 mt-0.5 text-destructive flex-shrink-0" />;
    if (insight.includes("urgent") || insight.includes("impayée"))
      return <Zap className="h-3.5 w-3.5 mt-0.5 text-destructive flex-shrink-0" />;
    return <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-warning flex-shrink-0" />;
  };

  const isCriticalInsight = (insight: string) =>
    insight.includes("Manque") || insight.includes("Risque") || insight.includes("urgent") || insight.includes("impayée") || insight.includes("sous 40%");

  return (
    <div className={cn("rounded-xl border bg-card p-6", config.border, config.cardBg)}>
      <div className="flex items-center gap-2 mb-4">
        <div className={cn("p-1.5 rounded-lg", config.bg)}>
          <Activity className={cn("h-4 w-4", config.ring)} />
        </div>
        <h2 className="font-display font-semibold text-foreground">Score Santé du Centre</h2>
        <span className={cn(
          "ml-auto text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5",
          config.bg, config.ring,
          score < 60 && "ring-1 ring-warning/30"
        )}>
          {score < 60 && <AlertTriangle className="h-3 w-3" />}
          {config.emoji} {config.label}
        </span>
      </div>

      {/* 4 questions — réponses instantanées */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5 p-3 rounded-lg bg-muted/30 border border-border/50">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Santé globale ?</p>
          <p className={cn("text-sm font-semibold", config.ring)}>{config.label}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Objectif mensuel ?</p>
          <p className={cn("text-sm font-semibold", objColor)}>{objAnswer}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Sessions à risque ?</p>
          <p className={cn("text-sm font-semibold", sessionColor)}>{sessionAnswer}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Problème urgent ?</p>
          <p className={cn("text-sm font-semibold", urgenceColor)}>{urgenceAnswer}</p>
        </div>
      </div>

      <div className="flex items-center gap-8">
        {/* Score circle — 40% larger */}
        <div className="relative flex-shrink-0">
          <svg width="168" height="168" viewBox="0 0 130 130" className="-rotate-90">
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
              className={config.strokeColor}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {score < 60 && <AlertTriangle className={cn("h-4 w-4 mb-0.5", config.ring)} />}
            <span className={cn("text-[2.75rem] font-bold tabular-nums leading-none", config.ring)}>{score}</span>
            <span className="text-xs text-muted-foreground font-medium">/100</span>
          </div>
        </div>

        {/* Insights + Metrics */}
        <div className="flex-1 space-y-3">
          {/* Dynamic insights — condensed */}
          <div className="space-y-1.5">
            {data?.insights.map((insight, i) => {
              const condensed = buildCriticalInsight(insight);
              const critical = isCriticalInsight(insight);
              return (
                <div key={i} className="flex items-start gap-2 text-sm">
                  {insightIcon(condensed)}
                  <span className={cn(
                    "leading-tight",
                    critical ? "text-foreground font-semibold" : "text-muted-foreground"
                  )}>{condensed}</span>
                </div>
              );
            })}
          </div>

          {/* Mini metrics bar */}
          <div className="flex gap-4 pt-3 mt-1 border-t border-border">
            <div className="text-center flex-1">
              <p className={cn("text-base font-bold tabular-nums", (data?.tauxRemplissage ?? 0) < 40 ? "text-destructive" : (data?.tauxRemplissage ?? 0) < 70 ? "text-warning" : "text-foreground")}>
                {data?.tauxRemplissage ?? 0}%
              </p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Remplissage</p>
            </div>
            <div className="text-center flex-1">
              <p className="text-base font-bold tabular-nums text-foreground">{data?.tauxConversion ?? 0}%</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Conversion</p>
            </div>
            <div className="text-center flex-1">
              <p className="text-base font-bold tabular-nums text-foreground">{data?.caConfirmeVsObjectif ?? 0}%</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">CA vs obj.</p>
            </div>
            <div className="text-center flex-1">
              <p className={cn("text-base font-bold tabular-nums", (data?.nbUrgences ?? 0) > 0 ? "text-destructive" : "text-foreground")}>
                {data?.nbUrgences ?? 0}
              </p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Urgences</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}