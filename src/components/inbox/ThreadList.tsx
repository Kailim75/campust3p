import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";
import { Paperclip, UserCircle, Link2 } from "lucide-react";

interface Thread {
  id: string;
  subject: string | null;
  snippet: string | null;
  is_unread: boolean;
  status: string;
  has_attachments: boolean;
  message_count: number;
  last_message_at: string | null;
  participants: any;
  assigned_to: string | null;
  priority: string;
}

interface ThreadListProps {
  threads: Thread[];
  isLoading: boolean;
  selectedThreadId: string | null;
  onSelect: (id: string) => void;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Hier";
  return format(d, "dd MMM", { locale: fr });
}

function getStatusColor(status: string) {
  switch (status) {
    case "nouveau": return "border-l-blue-500";
    case "en_cours": return "border-l-amber-500";
    case "traite": return "border-l-green-500";
    case "archive": return "border-l-muted-foreground/40";
    default: return "border-l-transparent";
  }
}

function getStatusDot(status: string) {
  switch (status) {
    case "nouveau": return "bg-blue-500";
    case "en_cours": return "bg-amber-500";
    case "traite": return "bg-green-500";
    case "archive": return "bg-muted-foreground/40";
    default: return "bg-muted";
  }
}

function getFirstParticipant(participants: any): string {
  if (!Array.isArray(participants) || participants.length === 0) return "Inconnu";
  const p = participants[0];
  return p?.name || p?.email || "Inconnu";
}

export function ThreadList({ threads, isLoading, selectedThreadId, onSelect }: ThreadListProps) {
  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="animate-pulse space-y-2 py-3 px-4">
            <div className="flex justify-between">
              <div className="h-3.5 bg-muted rounded w-1/3" />
              <div className="h-3 bg-muted rounded w-12" />
            </div>
            <div className="h-3.5 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground text-sm">
        <div className="text-3xl mb-2 opacity-30">📭</div>
        Aucun email trouvé
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/60">
      {threads.map((thread) => {
        const isSelected = selectedThreadId === thread.id;
        const isUnread = thread.is_unread;

        return (
          <button
            key={thread.id}
            onClick={() => onSelect(thread.id)}
            className={cn(
              "w-full text-left px-0 py-0 transition-colors border-l-[3px]",
              getStatusColor(thread.status),
              isSelected
                ? "bg-accent"
                : isUnread
                  ? "bg-primary/[0.03] hover:bg-accent/50"
                  : "hover:bg-accent/30",
            )}
          >
            <div className="px-3 py-2.5">
              {/* Row 1: Sender + Date */}
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  {isUnread && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  )}
                  <span className={cn(
                    "text-[13px] truncate",
                    isUnread ? "font-semibold text-foreground" : "text-muted-foreground"
                  )}>
                    {getFirstParticipant(thread.participants)}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground flex-shrink-0 tabular-nums">
                  {formatDate(thread.last_message_at)}
                </span>
              </div>

              {/* Row 2: Subject */}
              <p className={cn(
                "text-[13px] truncate",
                isUnread ? "font-medium text-foreground" : "text-foreground/75"
              )}>
                {thread.subject || "(Sans sujet)"}
              </p>

              {/* Row 3: Snippet + Indicators */}
              <div className="flex items-center gap-1.5 mt-1">
                <p className="text-[11px] text-muted-foreground/70 truncate flex-1 leading-tight">
                  {thread.snippet || ""}
                </p>

                {/* Meta indicators */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {thread.assigned_to && (
                    <UserCircle className="h-3 w-3 text-primary/50" />
                  )}
                  {thread.has_attachments && (
                    <Paperclip className="h-3 w-3 text-muted-foreground/50" />
                  )}
                  {thread.message_count > 1 && (
                    <span className="text-[10px] text-muted-foreground/60 bg-muted/60 rounded px-1 py-px font-medium">
                      {thread.message_count}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
