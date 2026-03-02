import { cn } from "@/lib/utils";
import { useAllAlerts } from "@/hooks/useAlerts";
import { useDashboardActionCounts } from "@/hooks/useDashboardActionCounts";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  UserX, Bell, FileWarning, Megaphone, CreditCard, UserPlus,
  ChevronRight, CheckCircle2,
} from "lucide-react";

interface PriorityActionsGroupedProps {
  onNavigate: (section: string) => void;
  onNavigateWithContact?: (section: string, contactId?: string) => void;
}

interface ActionItem {
  id: string;
  label: string;
  icon: React.ElementType;
  count: number;
  section: string;
}

export function PriorityActionsGrouped({ onNavigate }: PriorityActionsGroupedProps) {
  const { data: alerts, isLoading: alertsLoading, counts } = useAllAlerts();
  const { data: extra, isLoading: extraLoading } = useDashboardActionCounts();

  const isLoading = alertsLoading || extraLoading;

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 h-full">
        <Skeleton className="h-5 w-40 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-11 w-full" />)}
        </div>
      </div>
    );
  }

  // 🔴 URGENT
  const prospectRelances = alerts.filter(a => a.type === "rappel" && a.title.includes("prospect") && a.priority === "high").length;
  const rappelsRetard = alerts.filter(a => a.type === "rappel" && !a.title.includes("prospect") && a.priority === "high").length;
  const dossiersIncomplets = alerts.filter(a => (a.type === "document" || a.type === "carte_pro" || a.type === "permis") && a.priority === "high").length;

  const urgentItems: ActionItem[] = [
    { id: "prospect-relances", label: "Relances prospect en retard", icon: UserX, count: prospectRelances, section: "pipeline" },
    { id: "rappels-retard", label: "Rappels non effectués", icon: Bell, count: rappelsRetard, section: "alertes" },
    { id: "dossiers-incomplets", label: "Dossiers incomplets", icon: FileWarning, count: dossiersIncomplets, section: "contacts" },
  ].filter(item => item.count > 0);

  // 🟠 IMPORTANT
  const sessionsAPromouvoir = extra?.sessionsToPromote ?? 0;
  const paiementsEnAttente = counts.payments;

  const importantItems: ActionItem[] = [
    { id: "sessions-promouvoir", label: "Sessions à promouvoir", icon: Megaphone, count: sessionsAPromouvoir, section: "sessions" },
    { id: "paiements-attente", label: "Paiements en attente", icon: CreditCard, count: paiementsEnAttente, section: "paiements" },
  ].filter(item => item.count > 0);

  // 🔵 INFO
  const nouvellesInscriptions = extra?.newInscriptions ?? 0;

  const infoItems: ActionItem[] = [
    { id: "nouvelles-inscriptions", label: "Nouvelles inscriptions", icon: UserPlus, count: nouvellesInscriptions, section: "sessions" },
  ].filter(item => item.count > 0);

  const levels = [
    { key: "urgent", label: "Urgent", dot: "bg-destructive", text: "text-destructive", items: urgentItems },
    { key: "important", label: "Important", dot: "bg-warning", text: "text-warning", items: importantItems },
    { key: "info", label: "Information", dot: "bg-info", text: "text-info", items: infoItems },
  ].filter(l => l.items.length > 0);

  const totalCount = urgentItems.reduce((s, i) => s + i.count, 0)
    + importantItems.reduce((s, i) => s + i.count, 0)
    + infoItems.reduce((s, i) => s + i.count, 0);

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

      {levels.length === 0 ? (
        <div className="flex items-center gap-3 py-6 justify-center flex-1">
          <div className="p-2 rounded-full bg-success/10">
            <CheckCircle2 className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Tout est en ordre</p>
            <p className="text-xs text-muted-foreground">Aucune action en attente</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4 flex-1">
          {levels.map(({ key, label, dot, text, items }) => (
            <div key={key}>
              <div className="flex items-center gap-2 mb-2">
                <div className={cn("w-1.5 h-1.5 rounded-full", dot)} />
                <span className={cn("text-[10px] font-semibold uppercase tracking-wider", text)}>
                  {label}
                </span>
              </div>
              <div className="space-y-1">
                {items.map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onNavigate(item.section)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left group/item"
                    >
                      <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm text-foreground flex-1 truncate">{item.label}</span>
                      <Badge variant="outline" className={cn("text-xs tabular-nums", text)}>
                        {item.count}
                      </Badge>
                      <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover/item:opacity-100 transition-opacity" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
