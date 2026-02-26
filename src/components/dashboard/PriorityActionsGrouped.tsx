import { cn } from "@/lib/utils";
import { useAllAlerts } from "@/hooks/useAlerts";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  AlertCircle, CreditCard, FileWarning, Calendar, Award, Clock, 
  ChevronRight, CheckCircle2, Bell 
} from "lucide-react";

interface PriorityActionsGroupedProps {
  onNavigate: (section: string) => void;
  onNavigateWithContact?: (section: string, contactId?: string) => void;
}

interface ActionGroup {
  id: string;
  label: string;
  icon: React.ElementType;
  count: number;
  level: "urgent" | "important" | "info";
  section: string;
}

export function PriorityActionsGrouped({ onNavigate, onNavigateWithContact }: PriorityActionsGroupedProps) {
  const { data: alerts, isLoading, counts } = useAllAlerts();

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <Skeleton className="h-5 w-40 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      </div>
    );
  }

  // Group alerts by category and level
  const paymentAlerts = alerts.filter(a => a.type === "payment");
  const rappelAlerts = alerts.filter(a => a.type === "rappel");
  const documentAlerts = alerts.filter(a => a.type === "document" || a.type === "carte_pro" || a.type === "permis");
  const sessionAlerts = alerts.filter(a => a.type === "session");
  const examAlerts = alerts.filter(a => a.type === "exam_t3p" || a.type === "exam_pratique");

  const groups: ActionGroup[] = [];

  // Urgent
  if (paymentAlerts.filter(a => a.priority === "high").length > 0) {
    groups.push({ id: "payments", label: "Paiements en retard", icon: CreditCard, count: paymentAlerts.filter(a => a.priority === "high").length, level: "urgent", section: "paiements" });
  }
  if (rappelAlerts.filter(a => a.priority === "high").length > 0) {
    groups.push({ id: "rappels", label: "Rappels en retard", icon: Bell, count: rappelAlerts.filter(a => a.priority === "high").length, level: "urgent", section: "alertes" });
  }
  if (documentAlerts.filter(a => a.priority === "high").length > 0) {
    groups.push({ id: "docs", label: "Dossiers incomplets / expirés", icon: FileWarning, count: documentAlerts.filter(a => a.priority === "high").length, level: "urgent", section: "contacts" });
  }

  // Important
  if (sessionAlerts.length > 0) {
    groups.push({ id: "sessions", label: "Sessions à surveiller", icon: Calendar, count: sessionAlerts.length, level: "important", section: "sessions" });
  }
  if (documentAlerts.filter(a => a.priority === "medium").length > 0) {
    groups.push({ id: "docs-medium", label: "Documents à valider", icon: FileWarning, count: documentAlerts.filter(a => a.priority === "medium").length, level: "important", section: "contacts" });
  }

  // Info
  if (examAlerts.length > 0) {
    groups.push({ id: "exams", label: "Examens à venir", icon: Award, count: examAlerts.length, level: "info", section: "alertes" });
  }

  const levelConfig = {
    urgent: { dot: "bg-destructive", text: "text-destructive", bg: "bg-destructive/5", border: "border-destructive/10", label: "Urgent" },
    important: { dot: "bg-warning", text: "text-warning", bg: "bg-warning/5", border: "border-warning/10", label: "Important" },
    info: { dot: "bg-info", text: "text-info", bg: "bg-info/5", border: "border-info/10", label: "Info" },
  };

  const totalCount = alerts.length;

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="font-display font-semibold text-foreground">Actions prioritaires</h2>
          {totalCount > 0 && (
            <Badge variant="secondary" className="text-xs tabular-nums">{totalCount}</Badge>
          )}
        </div>
        <button 
          onClick={() => onNavigate("alertes")}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          Voir tout <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="flex items-center gap-3 py-6 justify-center">
          <div className="p-2 rounded-full bg-success/10">
            <CheckCircle2 className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Tout est en ordre</p>
            <p className="text-xs text-muted-foreground">Aucune action urgente</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map(group => {
            const config = levelConfig[group.level];
            const Icon = group.icon;
            return (
              <button
                key={group.id}
                onClick={() => onNavigate(group.section)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                  "hover:shadow-sm hover:border-border",
                  config.bg, config.border
                )}
              >
                <div className={cn("w-2 h-2 rounded-full flex-shrink-0", config.dot)} />
                <Icon className={cn("h-4 w-4 flex-shrink-0", config.text)} />
                <span className="text-sm font-medium text-foreground flex-1">{group.label}</span>
                <Badge variant="outline" className={cn("text-xs tabular-nums", config.text)}>
                  {group.count}
                </Badge>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
