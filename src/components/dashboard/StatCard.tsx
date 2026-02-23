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
    iconBg: "bg-[#EBF3F7]", 
    iconColor: "text-[#1E5068]",
  },
  success: { 
    iconBg: "bg-[#E8F7F1]", 
    iconColor: "text-[#1A9E6A]",
  },
  warning: { 
    iconBg: "bg-[#FDF4E3]", 
    iconColor: "text-[#D4880A]",
  },
  info: { 
    iconBg: "bg-[#EBF3F7]", 
    iconColor: "text-[#1E5068]",
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
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p 
              className="text-muted-foreground truncate uppercase"
              style={{ fontFamily: 'Nunito Sans', fontWeight: 600, fontSize: 11.5, letterSpacing: '0.07em' }}
            >
              {title}
            </p>
            {isClickable && (
              <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
          <p 
            className="text-foreground tabular-nums"
            style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: 34 }}
          >
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
                <span className="text-muted-foreground" style={{ fontSize: 11 }}>{changeLabel}</span>
              )}
            </div>
          )}
        </div>

        {/* Icône ronde colorée */}
        <div className={cn(
          "flex items-center justify-center rounded-[11px] flex-shrink-0",
          styles.iconBg
        )} style={{ width: 38, height: 38 }}>
          <Icon className={cn("h-[18px] w-[18px]", styles.iconColor)} />
        </div>
      </div>
    </div>
  );
}
