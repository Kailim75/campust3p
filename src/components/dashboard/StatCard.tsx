import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown, ChevronRight } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  variant?: "primary" | "success" | "warning" | "info";
  onClick?: () => void;
}

const variantStyles = {
  primary: { icon: "text-primary" },
  success: { icon: "text-success" },
  warning: { icon: "text-warning" },
  info: { icon: "text-info" },
};

export function StatCard({ 
  title, 
  value, 
  change, 
  changeLabel,
  icon: Icon, 
  variant = "primary",
  onClick,
}: StatCardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;
  const isClickable = !!onClick;

  return (
    <div 
      className={cn(
        "stat-card",
        isClickable && "cursor-pointer group"
      )}
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Icon className={cn("h-4 w-4", variantStyles[variant].icon)} />
            <p className="text-xs font-medium text-muted-foreground truncate">{title}</p>
            {isClickable && (
              <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
          <p className="text-2xl font-mono font-medium text-foreground tabular-nums">{value}</p>
          
          {change !== undefined && (
            <div className="flex items-center gap-1">
              {isPositive && <TrendingUp className="h-3 w-3 text-success" />}
              {isNegative && <TrendingDown className="h-3 w-3 text-destructive" />}
              <span className={cn(
                "text-xs font-mono font-medium tabular-nums",
                isPositive && "text-success",
                isNegative && "text-destructive",
                !isPositive && !isNegative && "text-muted-foreground"
              )}>
                {isPositive && "+"}{change}%
              </span>
              {changeLabel && (
                <span className="text-[11px] text-muted-foreground">{changeLabel}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
