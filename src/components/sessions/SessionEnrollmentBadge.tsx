import { Progress } from "@/components/ui/progress";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionFinancialData } from "@/hooks/useSessionFinancials";

interface SessionEnrollmentBadgeProps {
  enrolled: number;
  total: number;
  showProgress?: boolean;
  financial?: SessionFinancialData;
  className?: string;
}

export function SessionEnrollmentBadge({
  enrolled,
  total,
  showProgress = true,
  financial,
  className,
}: SessionEnrollmentBadgeProps) {
  const percentage = total > 0 ? Math.round((enrolled / total) * 100) : 0;
  const isFull = enrolled >= total;
  const isNearFull = percentage >= 80 && !isFull;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center gap-2">
        <Users className={cn(
          "h-4 w-4",
          isFull ? "text-destructive" : isNearFull ? "text-warning" : "text-muted-foreground"
        )} />
        <span className={cn(
          "text-sm font-medium",
          isFull ? "text-destructive" : isNearFull ? "text-warning" : "text-foreground"
        )}>
          {enrolled}/{total}
        </span>
        {isFull && (
          <span className="text-xs text-destructive font-medium">Complet</span>
        )}
      </div>
      {financial && enrolled > 0 && (
        <div className="text-xs text-muted-foreground space-y-0.5">
          {financial.nb_payes > 0 && (
            <span className="text-success">{financial.nb_payes} payé{financial.nb_payes > 1 ? 's' : ''}</span>
          )}
          {financial.nb_partiel > 0 && (
            <span className="text-warning ml-1">{financial.nb_partiel} partiel{financial.nb_partiel > 1 ? 's' : ''}</span>
          )}
          {financial.ca_securise > 0 && (
            <p className="text-xs font-medium text-success">
              CA : {financial.ca_securise.toLocaleString('fr-FR')} €
            </p>
          )}
        </div>
      )}
      {showProgress && (
        <Progress
          value={percentage}
          className={cn(
            "h-1.5 w-20",
            isFull && "[&>div]:bg-destructive",
            isNearFull && "[&>div]:bg-warning"
          )}
        />
      )}
    </div>
  );
}
