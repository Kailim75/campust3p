import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle2, Database, ExternalLink, ShieldCheck, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { LastActionLine, MarkDoneBtn } from "./AujourdhuiShared";
import type { AutoNote, CrmQualityItem, CrmQualitySummary } from "./aujourdhui-types";
import type { Prospect } from "@/hooks/useProspects";

interface BlocQualiteCrmProps {
  items: CrmQualityItem[];
  summary: CrmQualitySummary | null;
  todayNotes: AutoNote[];
  recentNotes: AutoNote[];
  openContact: (id: string) => void;
  openProspect: (p: Prospect) => void;
  markDone: (contactId: string, blocLabel: string) => void;
}

const SEVERITY_LABELS = {
  critical: "Urgent",
  warning: "À vérifier",
  info: "Info",
} as const;

const TYPE_ICONS = {
  duplicate: Users,
  missing_channel: AlertTriangle,
  missing_phone: Database,
  missing_email: Database,
  missing_formation: Database,
  prospect_without_next_action: ShieldCheck,
} as const;

export function BlocQualiteCrm({
  items,
  summary,
  todayNotes,
  recentNotes,
  openContact,
  openProspect,
  markDone,
}: BlocQualiteCrmProps) {
  if (!summary || summary.totalIssues === 0) return null;

  const visibleItems = items.slice(0, 8);

  const openItem = (item: CrmQualityItem) => {
    if (item.ownerSource === "prospect" && item.ownerProspect) {
      openProspect(item.ownerProspect);
      return;
    }
    openContact(item.ownerId);
  };

  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-5 py-4 border-b bg-muted/30 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
            <Database className="h-4 w-4 text-info" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">À nettoyer</h3>
            <p className="text-[11px] text-muted-foreground">
              {summary.totalIssues} point{summary.totalIssues > 1 ? "s" : ""} qualité CRM détecté{summary.totalIssues > 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="w-28 space-y-1 hidden sm:block">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Score CRM</span>
              <span className="font-semibold text-foreground">{summary.score}%</span>
            </div>
            <Progress value={summary.score} className="h-1.5" />
          </div>
          <Badge variant="outline" className={cn(
            "text-xs",
            summary.criticalCount > 0
              ? "bg-destructive/10 text-destructive border-destructive/20"
              : "bg-warning/10 text-warning border-warning/20",
          )}>
            {summary.criticalCount} urgent{summary.criticalCount > 1 ? "s" : ""}
          </Badge>
        </div>
      </div>

      <div className="px-5 py-3 border-b bg-background/60 flex flex-wrap gap-1.5">
        {summary.duplicateGroups > 0 && (
          <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20">
            {summary.duplicateGroups} doublon{summary.duplicateGroups > 1 ? "s" : ""}
          </Badge>
        )}
        {summary.warningCount > 0 && (
          <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/20">
            {summary.warningCount} à vérifier
          </Badge>
        )}
        {summary.infoCount > 0 && (
          <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">
            {summary.infoCount} info{summary.infoCount > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      <div className="divide-y max-h-96 overflow-y-auto">
        {visibleItems.length === 0 ? (
          <div className="p-5 text-center text-muted-foreground text-xs">
            <CheckCircle2 className="h-6 w-6 mx-auto mb-1.5 text-success/50" />
            Les points qualité du jour sont traités
          </div>
        ) : visibleItems.map((item) => {
          const Icon = TYPE_ICONS[item.type] || Database;
          return (
            <div key={item.id} className="px-5 py-3 hover:bg-muted/20 transition-colors">
              <div className="flex items-start justify-between gap-3 mb-1.5">
                <div className="flex items-start gap-2 min-w-0">
                  <Icon className={cn(
                    "h-3.5 w-3.5 mt-0.5 shrink-0",
                    item.severity === "critical" ? "text-destructive" : item.severity === "warning" ? "text-warning" : "text-muted-foreground",
                  )} />
                  <div className="min-w-0">
                    <button
                      onClick={() => openItem(item)}
                      className="text-sm font-medium text-foreground hover:text-primary transition-colors text-left inline-flex items-center gap-1"
                    >
                      {item.title}
                      <ExternalLink className="h-3 w-3 opacity-40 shrink-0" />
                    </button>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">{item.description}</p>
                  </div>
                </div>
                <Badge variant="outline" className={cn(
                  "text-[9px] shrink-0",
                  item.severity === "critical"
                    ? "bg-destructive/10 text-destructive border-destructive/20"
                    : item.severity === "warning"
                      ? "bg-warning/10 text-warning border-warning/20"
                      : "bg-muted text-muted-foreground",
                )}>
                  {SEVERITY_LABELS[item.severity]}
                </Badge>
              </div>

              {item.type === "duplicate" && (
                <div className="flex flex-wrap gap-1 mb-1 pl-5">
                  {item.records.slice(0, 4).map((record) => (
                    <Badge key={`${record.source}-${record.id}`} variant="outline" className="text-[9px] bg-background">
                      {record.source === "prospect" ? "Prospect" : "Contact"} · {record.prenom} {record.nom}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="pl-5">
                <LastActionLine todayNotes={todayNotes} recentNotes={recentNotes} contactId={item.ownerId} />
              </div>
              <div className="flex gap-1.5 mt-1 pl-5">
                <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => openItem(item)}>
                  {item.actionLabel}
                </Button>
                <MarkDoneBtn contactId={item.ownerId} bloc="Qualité CRM" markDone={markDone} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
