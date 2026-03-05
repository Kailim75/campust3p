import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { SessionHealthScore } from "@/hooks/useSessionFinancials";

interface SessionHealthBadgeProps {
  health: SessionHealthScore;
  compact?: boolean;
  qualiopiScore?: number;
  extraCauses?: string[];
}

const levelConfig = {
  saine: { label: "Saine", class: "bg-success/10 text-success border-success/20" },
  surveiller: { label: "À surveiller", class: "bg-warning/10 text-warning border-warning/20" },
  danger: { label: "En danger", class: "bg-destructive/10 text-destructive border-destructive/20" },
};

export function SessionHealthBadge({ health, compact, qualiopiScore, extraCauses }: SessionHealthBadgeProps) {
  const config = levelConfig[health.level];
  const emoji = health.level === "saine" ? "🟢" : health.level === "surveiller" ? "🟡" : "🔴";

  const causes: string[] = [];
  if (health.fillComponent < 50) causes.push("Remplissage faible");
  if (health.caComponent < 50) causes.push("CA sécurisé insuffisant");
  if (health.calendarComponent < 50) causes.push("Session proche sans remplissage");
  if (health.paymentComponent < 50) causes.push("Paiements en retard");
  if (qualiopiScore !== undefined && qualiopiScore < 80) causes.push(`Qualiopi ${qualiopiScore}% (< 80%)`);
  if (extraCauses) causes.push(...extraCauses);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className={cn("text-xs gap-1 cursor-help", config.class)}>
          {emoji} {health.score}
          {!compact && <span className="hidden sm:inline">/ 100</span>}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1.5 text-xs">
          <p className="font-semibold">Score santé : {health.score}/100 — {config.label}</p>
          <div className="space-y-0.5 text-muted-foreground">
            <p>Remplissage (40%) : {Math.round(health.fillComponent)}%</p>
            <p>CA sécurisé (30%) : {Math.round(health.caComponent)}%</p>
            <p>Avance calendrier (20%) : {Math.round(health.calendarComponent)}%</p>
            <p>Paiements (10%) : {Math.round(health.paymentComponent)}%</p>
            {qualiopiScore !== undefined && (
              <p>Qualiopi : {qualiopiScore}%</p>
            )}
          </div>
          {causes.length > 0 && (
            <div className="pt-1 border-t border-border space-y-0.5">
              <p className="font-medium text-foreground">Causes :</p>
              {causes.map((c, i) => (
                <p key={i} className="text-destructive">⚠ {c}</p>
              ))}
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
