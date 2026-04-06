import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";
import { Paperclip, UserCircle } from "lucide-react";

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
    case "nouveau": return "bg-blue-500";
    case "en_cours": return "bg-amber-500";
    case "traite": return "bg-green-500";
    case "archive": return "bg-muted";
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
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-2" />
            <div className="h-3 bg-muted rounded w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground text-sm">
        Aucun email trouvé
      </div>
    );
  }

  return (
    <div className="divide-y">
      {threads.map((thread) => (
        <button
          key={thread.id}
          onClick={() => onSelect(thread.id)}
          className={cn(
            "w-full text-left px-4 py-3 hover:bg-accent/50 transition-colors",
            selectedThreadId === thread.id && "bg-accent",
            thread.is_unread && "bg-primary/5"
          )}
        >
          <div className="flex items-start gap-2">
            {/* Status dot */}
            <div className={cn("w-2 h-2 rounded-full mt-2 flex-shrink-0", getStatusColor(thread.status))} />
            
            <div className="flex-1 min-w-0">
              {/* From + Date */}
              <div className="flex items-center justify-between gap-2">
                <span className={cn(
                  "text-sm truncate",
                  thread.is_unread ? "font-semibold text-foreground" : "text-muted-foreground"
                )}>
                  {getFirstParticipant(thread.participants)}
                </span>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {formatDate(thread.last_message_at)}
                </span>
              </div>

              {/* Subject */}
              <p className={cn(
                "text-sm truncate mt-0.5",
                thread.is_unread ? "font-medium text-foreground" : "text-foreground/80"
              )}>
                {thread.subject || "(Sans sujet)"}
              </p>

              {/* Snippet + meta */}
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-muted-foreground truncate flex-1">
                  {thread.snippet || ""}
                </p>
                {thread.assigned_to && (
                  <UserCircle className="h-3 w-3 text-primary/60 flex-shrink-0" />
                )}
                {thread.has_attachments && (
                  <Paperclip className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                )}
                {thread.message_count > 1 && (
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {thread.message_count}
                  </span>
                )}
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
