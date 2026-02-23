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
  primary: { 
    iconBg: "bg-primary/10", 
    iconColor: "text-primary",
  },
  success: { 
    iconBg: "bg-success/10", 
    iconColor: "text-success",
  },
  warning: { 
    iconBg: "bg-warning/10", 
    iconColor: "text-warning",
  },
  info: { 
    iconBg: "bg-info/10", 
    iconColor: "text-info",
  },
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
  const styles = variantStyles[variant];

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
            <p className="text-muted-foreground truncate uppercase text-[11px] font-medium tracking-wider">
              {title}
            </p>
            {isClickable && (
              <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
          <p className="text-foreground tabular-nums font-bold text-[28px] tracking-tight">
            {value}
          </p>
          
          {change !== undefined && (
            <div className="flex items-center gap-1">
              {isPositive && <TrendingUp className="h-3 w-3 text-success" />}
              {isNegative && <TrendingDown className="h-3 w-3 text-destructive" />}
              <span className={cn(
                "font-mono text-xs font-medium tabular-nums",
                isPositive && "text-success",
                isNegative && "text-destructive",
                !isPositive && !isNegative && "text-muted-foreground"
              )}>
                {isPositive && "+"}{change}%
              </span>
              {changeLabel && (
                <span className="text-muted-foreground text-[11px]">{changeLabel}</span>
              )}
            </div>
          )}
        </div>

        <div className={cn(
          "flex items-center justify-center rounded-xl flex-shrink-0",
          styles.iconBg
        )} style={{ width: 40, height: 40 }}>
          <Icon className={cn("h-5 w-5", styles.iconColor)} />
        </div>
      </div>
    </div>
  );
}
