import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertTriangle, CalendarCheck, CalendarDays, User } from "lucide-react";

export type QuickFilter = "all" | "actifs" | "overdue" | "today" | "week" | "mine";

interface ProspectQuickFiltersProps {
  activeFilter: QuickFilter;
  onFilterChange: (filter: QuickFilter) => void;
  counts: {
    overdue: number;
    today: number;
    week: number;
  };
}

const FILTERS: { value: QuickFilter; label: string; icon: React.ReactNode; countKey?: "overdue" | "today" | "week" }[] = [
  { value: "actifs", label: "Actifs", icon: null },
  { value: "all", label: "Tous", icon: null },
  { value: "overdue", label: "En retard", icon: <AlertTriangle className="h-3 w-3" />, countKey: "overdue" },
  { value: "today", label: "Aujourd'hui", icon: <CalendarCheck className="h-3 w-3" />, countKey: "today" },
  { value: "week", label: "Cette semaine", icon: <CalendarDays className="h-3 w-3" />, countKey: "week" },
  { value: "mine", label: "Assigné à moi", icon: <User className="h-3 w-3" /> },
];

export function ProspectQuickFilters({ activeFilter, onFilterChange, counts }: ProspectQuickFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map((f) => {
        const count = f.countKey ? counts[f.countKey] : undefined;
        const isActive = activeFilter === f.value;
        return (
          <button
            key={f.value}
            onClick={() => onFilterChange(f.value)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
              isActive
                ? f.value === "overdue"
                  ? "bg-destructive/10 text-destructive border-destructive/30"
                  : "bg-primary/10 text-primary border-primary/30"
                : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
            )}
          >
            {f.icon}
            {f.label}
            {count !== undefined && count > 0 && (
              <Badge
                variant="secondary"
                className={cn(
                  "h-5 min-w-5 px-1 text-[10px]",
                  isActive && f.value === "overdue" && "bg-destructive text-destructive-foreground"
                )}
              >
                {count}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}
