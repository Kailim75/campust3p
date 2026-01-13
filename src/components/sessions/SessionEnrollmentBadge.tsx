import { Progress } from "@/components/ui/progress";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface SessionEnrollmentBadgeProps {
  enrolled: number;
  total: number;
  showProgress?: boolean;
  className?: string;
}

export function SessionEnrollmentBadge({
  enrolled,
  total,
  showProgress = true,
  className,
}: SessionEnrollmentBadgeProps) {
  const percentage = total > 0 ? Math.round((enrolled / total) * 100) : 0;
  const isFull = enrolled >= total;
  const isNearFull = percentage >= 80 && !isFull;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
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
