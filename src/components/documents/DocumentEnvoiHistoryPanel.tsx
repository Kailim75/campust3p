// ═══════════════════════════════════════════════════════════════
// DocumentEnvoiHistoryPanel — Chronological history of document sends
// Used in Contact Detail Sheet (Suivi tab) and optionally in Session view
// ═══════════════════════════════════════════════════════════════

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Mail,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  FileText,
  Inbox,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  useDocumentEnvoiHistory,
  type EnvoiEvent,
} from "@/hooks/useDocumentEnvoiHistory";

interface DocumentEnvoiHistoryPanelProps {
  contactId?: string | null;
  sessionId?: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  "envoyé": { label: "Envoyé", icon: CheckCircle2, className: "bg-success/10 text-success border-success/20" },
  "envoye": { label: "Envoyé", icon: CheckCircle2, className: "bg-success/10 text-success border-success/20" },
  "livré": { label: "Livré", icon: Inbox, className: "bg-info/10 text-info border-info/20" },
  "livre": { label: "Livré", icon: Inbox, className: "bg-info/10 text-info border-info/20" },
  "echec": { label: "Échec", icon: XCircle, className: "bg-destructive/10 text-destructive border-destructive/20" },
  "généré": { label: "Généré", icon: FileText, className: "bg-muted text-muted-foreground border-muted" },
  "genere": { label: "Généré", icon: FileText, className: "bg-muted text-muted-foreground border-muted" },
};

function getStatusConfig(statut: string) {
  return STATUS_CONFIG[statut.toLowerCase()] ?? {
    label: statut,
    icon: Clock,
    className: "bg-muted text-muted-foreground border-muted",
  };
}

export function DocumentEnvoiHistoryPanel({
  contactId,
  sessionId,
}: DocumentEnvoiHistoryPanelProps) {
  const { data: events = [], isLoading } = useDocumentEnvoiHistory(
    contactId,
    sessionId
  );

  // Group by date
  const groupedByDate = useMemo(() => {
    const groups: Record<string, EnvoiEvent[]> = {};
    for (const event of events) {
      const dateKey = format(parseISO(event.date_envoi), "yyyy-MM-dd");
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(event);
    }
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [events]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Send className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Aucun document envoyé</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Historique des envois
        </h4>
        <Badge variant="secondary" className="text-xs">
          {events.length} envoi{events.length > 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="space-y-4">
        {groupedByDate.map(([dateKey, dayEvents]) => (
          <div key={dateKey}>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              {format(parseISO(dateKey), "EEEE d MMMM yyyy", { locale: fr })}
            </p>
            <div className="space-y-2">
              {dayEvents.map((event) => {
                const statusConf = getStatusConfig(event.statut);
                const StatusIcon = statusConf.icon;

                return (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                  >
                    <div className="mt-0.5">
                      <StatusIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">
                          {event.document_name}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${statusConf.className}`}
                        >
                          {statusConf.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>
                          {format(parseISO(event.date_envoi), "HH:mm", { locale: fr })}
                        </span>
                        {event.envoi_type && (
                          <span className="capitalize">{event.envoi_type}</span>
                        )}
                        {event.document_type && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {event.document_type}
                          </Badge>
                        )}
                      </div>
                      {event.commentaires && (
                        <p className="text-xs text-muted-foreground italic">
                          {event.commentaires}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
