// ═══════════════════════════════════════════════════════════════
// DocumentEnvoiHistoryPanel — Vertical timeline of document sends
// Uses EnvoiStatusBadge as single source of truth for statuses
// ═══════════════════════════════════════════════════════════════

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, Send } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  useDocumentEnvoiHistory,
  type EnvoiEvent,
} from "@/hooks/useDocumentEnvoiHistory";
import { EnvoiStatusBadge, getEnvoiStatusConfig } from "./EnvoiStatusBadge";

interface DocumentEnvoiHistoryPanelProps {
  contactId?: string | null;
  sessionId?: string | null;
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

      <div className="space-y-5">
        {groupedByDate.map(([dateKey, dayEvents]) => (
          <div key={dateKey}>
            <p className="text-xs font-medium text-muted-foreground mb-3">
              {format(parseISO(dateKey), "EEEE d MMMM yyyy", { locale: fr })}
            </p>

            {/* Vertical timeline */}
            <div className="relative pl-6 space-y-0">
              {/* Timeline line */}
              <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />

              {dayEvents.map((event, idx) => {
                const config = getEnvoiStatusConfig(event.statut);
                const StatusIcon = config.icon;
                const isLast = idx === dayEvents.length - 1;

                return (
                  <div key={event.id} className={cn("relative flex gap-3", !isLast && "pb-4")}>
                    {/* Timeline dot */}
                    <div className="absolute -left-6 top-1 flex items-center justify-center">
                      <div className={cn(
                        "h-[18px] w-[18px] rounded-full border-2 bg-background flex items-center justify-center",
                        event.statut === "echec" ? "border-destructive" : "border-primary"
                      )}>
                        <StatusIcon className={cn(
                          "h-3 w-3",
                          event.statut === "echec" ? "text-destructive" : "text-primary"
                        )} />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1 pt-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">
                          {event.document_name}
                        </span>
                        <EnvoiStatusBadge statut={event.statut} size="sm" />
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
