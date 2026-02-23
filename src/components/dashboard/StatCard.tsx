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
  primary: { bg: "bg-primary/10", icon: "text-primary" },
  success: { bg: "bg-success/10", icon: "text-success" },
  warning: { bg: "bg-accent/10", icon: "text-accent" },
  info: { bg: "bg-info/10", icon: "text-info" },
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
        "stat-card bg-card border border-border/50 transition-all duration-200",
        isClickable && "cursor-pointer hover:border-primary/50 hover:shadow-md group"
      )}
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-medium text-muted-foreground">{title}</p>
            {isClickable && (
              <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
          <p className="text-[34px] font-mono font-medium text-foreground">{value}</p>
          
          {change !== undefined && (
            <div className="flex items-center gap-1.5">
              {isPositive && <TrendingUp className="h-4 w-4 text-success" />}
              {isNegative && <TrendingDown className="h-4 w-4 text-destructive" />}
              <span className={cn(
                "text-[13px] font-mono font-medium",
                isPositive && "text-success",
                isNegative && "text-destructive",
                !isPositive && !isNegative && "text-muted-foreground"
              )}>
                {isPositive && "+"}{change}%
              </span>
              {changeLabel && (
                <span className="text-xs text-muted-foreground">{changeLabel}</span>
              )}
            </div>
          )}
        </div>

        <div className={cn("p-2.5 rounded-xl", variantStyles[variant].bg)}>
          <Icon className={cn("h-5 w-5", variantStyles[variant].icon)} />
        </div>
      </div>
    </div>
  );
}
