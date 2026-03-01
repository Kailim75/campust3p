import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Shield, ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";
import type { SessionQualiopiScore } from "@/hooks/useSessionQualiopi";

interface SessionQualiopiBadgeProps {
  qualiopi: SessionQualiopiScore;
  compact?: boolean;
}

const levelConfig = {
  conforme: {
    label: "Conforme",
    class: "bg-success/10 text-success border-success/20",
    icon: ShieldCheck,
  },
  partiel: {
    label: "Partiel",
    class: "bg-warning/10 text-warning border-warning/20",
    icon: ShieldAlert,
  },
  non_conforme: {
    label: "Non conforme",
    class: "bg-destructive/10 text-destructive border-destructive/20",
    icon: ShieldX,
  },
};

export function SessionQualiopiBadge({ qualiopi, compact }: SessionQualiopiBadgeProps) {
  const config = levelConfig[qualiopi.level];
  const Icon = config.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className={cn("text-xs gap-1 cursor-help", config.class)}>
          <Icon className="h-3 w-3" />
          {compact ? `${qualiopi.score}%` : `Q ${qualiopi.score}%`}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1.5 text-xs">
          <p className="font-semibold">
            Conformité Qualiopi : {qualiopi.score}% — {config.label}
          </p>
          <p className="text-muted-foreground">
            {qualiopi.conformeCount}/{qualiopi.totalApplicable} critères conformes
          </p>
          {qualiopi.alertes.length > 0 && (
            <div className="space-y-0.5 text-destructive">
              {qualiopi.alertes.slice(0, 3).map((a, i) => (
                <p key={i}>⚠ {a}</p>
              ))}
              {qualiopi.alertes.length > 3 && (
                <p>+ {qualiopi.alertes.length - 3} autre(s)...</p>
              )}
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
