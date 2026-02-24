import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertTriangle, FileText, Minus } from "lucide-react";

type Priority = "critical" | "important" | "standard";

const PRIORITY_CONFIG: Record<Priority, { label: string; icon: typeof AlertTriangle; className: string }> = {
  critical: {
    label: "Critique",
    icon: AlertTriangle,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  important: {
    label: "Important",
    icon: FileText,
    className: "bg-amber-500/10 text-amber-600 border-amber-200",
  },
  standard: {
    label: "Standard",
    icon: Minus,
    className: "bg-muted text-muted-foreground border-border",
  },
};

export function RappelPriorityBadge({ priority }: { priority: Priority }) {
  const config = PRIORITY_CONFIG[priority];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 gap-1", config.className)}>
      <Icon className="h-2.5 w-2.5" />
      {config.label}
    </Badge>
  );
}
