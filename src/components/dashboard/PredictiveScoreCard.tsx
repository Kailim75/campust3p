import { cn } from "@/lib/utils";
import { TrendingUp, AlertTriangle, Users, CreditCard, ArrowRight, Lightbulb, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePredictiveScoring, type SubScore, type SmartAlert, type SmartRecommendation } from "@/hooks/usePredictiveScoring";

interface PredictiveScoreCardProps {
  onNavigate?: (section: string) => void;
}

function scoreColor(v: number) {
  if (v >= 75) return { text: "text-success", bg: "bg-success", badge: "bg-success/15 text-success border-success/20" };
  if (v >= 50) return { text: "text-warning", bg: "bg-warning", badge: "bg-warning/15 text-warning border-warning/20" };
  return { text: "text-destructive", bg: "bg-destructive", badge: "bg-destructive/15 text-destructive border-destructive/20" };
}

const subScoreIcons: Record<string, typeof TrendingUp> = {
  s1: TrendingUp,
  s2: AlertTriangle,
  s3: Users,
  s4: CreditCard,
};

const severityConfig = {
  critical: { label: "Critique", className: "bg-destructive/10 text-destructive border-destructive/20", dot: "bg-destructive" },
  important: { label: "Important", className: "bg-warning/10 text-warning border-warning/20", dot: "bg-warning" },
  info: { label: "Info", className: "bg-info/10 text-info border-info/20", dot: "bg-info" },
};

function SubScoreRow({ sub }: { sub: SubScore }) {
  const color = scoreColor(sub.value);
  const Icon = subScoreIcons[sub.key] || TrendingUp;

  return (
    <div className="flex items-center gap-3 py-1.5">
      <Icon className={cn("h-4 w-4 flex-shrink-0", color.text)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-foreground">{sub.label}</span>
          <span className={cn("text-xs font-bold tabular-nums", color.text)}>{sub.value}</span>
        </div>
        <div className="w-full h-1 rounded-full bg-muted mt-1">
          <div className={cn("h-full rounded-full transition-all", color.bg)} style={{ width: `${sub.value}%`, opacity: 0.7 }} />
        </div>
        {sub.detail && <p className="text-[10px] text-muted-foreground mt-0.5">{sub.detail}</p>}
      </div>
    </div>
  );
}

function AlertRow({ alert, onNavigate }: { alert: SmartAlert; onNavigate?: (section: string) => void }) {
  const config = severityConfig[alert.severity];

  return (
    <div className={cn("flex items-start gap-2.5 p-2.5 rounded-lg border text-xs", config.className)}>
      <div className={cn("w-2 h-2 rounded-full mt-1 flex-shrink-0", config.dot)} />
      <div className="flex-1 min-w-0">
        <p className="font-medium leading-tight">{alert.title}</p>
        {alert.impact > 0 && (
          <p className="text-[10px] opacity-80 mt-0.5">Impact : {alert.impact.toLocaleString("fr-FR")} €</p>
        )}
      </div>
      <button
        onClick={() => onNavigate?.(alert.action.section)}
        className="text-[10px] font-semibold whitespace-nowrap hover:underline flex-shrink-0"
      >
        {alert.action.label} →
      </button>
    </div>
  );
}

function RecoRow({ reco, onNavigate }: { reco: SmartRecommendation; onNavigate?: (section: string) => void }) {
  return (
    <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/40 border border-border text-xs group">
      <Lightbulb className="h-3.5 w-3.5 text-warning flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground leading-tight">{reco.text}</p>
        {reco.impact > 0 && (
          <p className="text-[10px] text-muted-foreground mt-0.5">Impact estimé : +{reco.impact.toLocaleString("fr-FR")} €</p>
        )}
      </div>
      <button
        onClick={() => onNavigate?.(reco.action.section)}
        className="text-[10px] font-semibold text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
      >
        {reco.action.label} →
      </button>
    </div>
  );
}

export function PredictiveScoreCard({ onNavigate }: PredictiveScoreCardProps) {
  const { data, isLoading } = usePredictiveScoring();

  if (isLoading) {
    return (
      <div className="rounded-2xl border bg-card p-5 space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { globalScore, subScores, synthesis, alerts, recommendations } = data;
  const color = scoreColor(globalScore);

  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">🔮 Prévision 30 jours</h3>
        </div>
        <Badge variant="outline" className={cn("text-xs font-bold", color.badge)}>
          Score {globalScore}/100
        </Badge>
      </div>

      {/* Score + Sub-scores */}
      <div className="px-5 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Global Score Circle */}
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="relative">
              <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
                <circle
                  cx="50" cy="50" r="42"
                  fill="none"
                  stroke={`hsl(var(--${globalScore >= 75 ? "success" : globalScore >= 50 ? "warning" : "destructive"}))`}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${globalScore * 2.64} 264`}
                  transform="rotate(-90 50 50)"
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={cn("text-2xl font-bold tabular-nums", color.text)}>{globalScore}</span>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground text-center font-medium">Atteinte objectif</p>
          </div>

          {/* Sub-scores */}
          <div className="md:col-span-2 space-y-0.5">
            {subScores.map(sub => (
              <SubScoreRow key={sub.key} sub={sub} />
            ))}
          </div>
        </div>

        {/* Synthesis */}
        <div className={cn(
          "mt-3 px-3 py-2 rounded-lg text-xs font-medium",
          globalScore < 50 ? "bg-destructive/5 text-destructive" : globalScore < 75 ? "bg-warning/5 text-warning" : "bg-success/5 text-success"
        )}>
          {synthesis}
        </div>
      </div>

      {/* Alerts + Recos */}
      {(alerts.length > 0 || recommendations.length > 0) && (
        <div className="border-t px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Alerts */}
          {alerts.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3" />
                Alertes ({alerts.length})
              </p>
              <div className="space-y-1.5">
                {alerts.map(a => <AlertRow key={a.id} alert={a} onNavigate={onNavigate} />)}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Lightbulb className="h-3 w-3" />
                Recommandations ({recommendations.length})
              </p>
              <div className="space-y-1.5">
                {recommendations.map(r => <RecoRow key={r.id} reco={r} onNavigate={onNavigate} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
