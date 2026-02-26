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
      <div className="rounded-xl border border-border bg-card p-6 h-full">
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

  const urgentGroups: ActionGroup[] = [];
  const importantGroups: ActionGroup[] = [];
  const infoGroups: ActionGroup[] = [];

  // Urgent
  if (paymentAlerts.filter(a => a.priority === "high").length > 0) {
    urgentGroups.push({ id: "payments", label: "Paiements retard", icon: CreditCard, count: paymentAlerts.filter(a => a.priority === "high").length, level: "urgent", section: "paiements" });
  }
  if (rappelAlerts.filter(a => a.priority === "high").length > 0) {
    urgentGroups.push({ id: "rappels", label: "Rappels retard", icon: Bell, count: rappelAlerts.filter(a => a.priority === "high").length, level: "urgent", section: "alertes" });
  }
  if (documentAlerts.filter(a => a.priority === "high").length > 0) {
    urgentGroups.push({ id: "docs", label: "Dossiers incomplets", icon: FileWarning, count: documentAlerts.filter(a => a.priority === "high").length, level: "urgent", section: "contacts" });
  }

  // Important
  if (sessionAlerts.length > 0) {
    importantGroups.push({ id: "sessions", label: "Sessions à risque", icon: Calendar, count: sessionAlerts.length, level: "important", section: "sessions" });
  }
  if (documentAlerts.filter(a => a.priority === "medium").length > 0) {
    importantGroups.push({ id: "docs-medium", label: "Docs à valider", icon: FileWarning, count: documentAlerts.filter(a => a.priority === "medium").length, level: "important", section: "contacts" });
  }

  // Info
  if (examAlerts.length > 0) {
    infoGroups.push({ id: "exams", label: "Examens à venir", icon: Award, count: examAlerts.length, level: "info", section: "alertes" });
  }

  const levelConfig = {
    urgent: { dot: "bg-destructive", text: "text-destructive", label: "Urgent" },
    important: { dot: "bg-warning", text: "text-warning", label: "Important" },
    info: { dot: "bg-info", text: "text-info", label: "Info" },
  };

  const totalCount = alerts.length;
  const allCategories = [
    { level: "urgent" as const, groups: urgentGroups },
    { level: "important" as const, groups: importantGroups },
    { level: "info" as const, groups: infoGroups },
  ].filter(c => c.groups.length > 0);

  return (
    <div className="rounded-xl border border-border bg-card p-6 h-full flex flex-col">
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

      {allCategories.length === 0 ? (
        <div className="flex items-center gap-3 py-6 justify-center flex-1">
          <div className="p-2 rounded-full bg-success/10">
            <CheckCircle2 className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Tout est en ordre</p>
            <p className="text-xs text-muted-foreground">Aucune action urgente</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4 flex-1">
          {allCategories.map(({ level, groups }) => {
            const config = levelConfig[level];
            return (
              <div key={level}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
                  <span className={cn("text-[10px] font-semibold uppercase tracking-wider", config.text)}>
                    {config.label}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {groups.map(group => {
                    const Icon = group.icon;
                    return (
                      <button
                        key={group.id}
                        onClick={() => onNavigate(group.section)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left group/item"
                      >
                        <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm text-foreground flex-1 truncate">{group.label}</span>
                        <Badge variant="outline" className={cn("text-xs tabular-nums", config.text)}>
                          {group.count}
                        </Badge>
                        <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover/item:opacity-100 transition-opacity" />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
