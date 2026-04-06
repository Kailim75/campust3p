import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";
import { Paperclip, UserCircle, Link2, Mail } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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

const STATUS_COLORS: Record<string, { border: string; dot: string }> = {
  nouveau: { border: "border-l-blue-500", dot: "bg-blue-500" },
  en_cours: { border: "border-l-amber-500", dot: "bg-amber-500" },
  traite: { border: "border-l-green-500", dot: "bg-green-500" },
  archive: { border: "border-l-muted-foreground/30", dot: "bg-muted-foreground/40" },
};

function getFirstParticipant(participants: any): string {
  if (!Array.isArray(participants) || participants.length === 0) return "Inconnu";
  const p = participants[0];
  return p?.name || p?.email || "Inconnu";
}

export function ThreadList({ threads, isLoading, selectedThreadId, onSelect }: ThreadListProps) {
  if (isLoading) {
    return (
      <div className="p-3 space-y-1">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-md px-3 py-3 space-y-2">
            <div className="flex justify-between items-center">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-10" />
            </div>
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="h-12 w-12 rounded-full bg-muted/60 flex items-center justify-center mb-3">
          <Mail className="h-5 w-5 text-muted-foreground/50" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">Aucun email trouvé</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Essayez de modifier vos filtres</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/50">
      {threads.map((thread) => {
        const isSelected = selectedThreadId === thread.id;
        const isUnread = thread.is_unread;
        const statusConf = STATUS_COLORS[thread.status] || STATUS_COLORS.nouveau;

        return (
          <button
            key={thread.id}
            onClick={() => onSelect(thread.id)}
            className={cn(
              "w-full text-left transition-colors border-l-[3px]",
              statusConf.border,
              isSelected
                ? "bg-accent"
                : isUnread
                  ? "bg-primary/[0.03] hover:bg-accent/50"
                  : "hover:bg-accent/30",
            )}
          >
            <div className="px-3 py-2.5 space-y-0.5">
              {/* Row 1: Sender + Date */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  {isUnread && (
                    <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                  )}
                  <span className={cn(
                    "text-[13px] truncate leading-none",
                    isUnread ? "font-semibold text-foreground" : "text-foreground/70"
                  )}>
                    {getFirstParticipant(thread.participants)}
                  </span>
                </div>
                <span className={cn(
                  "text-[11px] flex-shrink-0 tabular-nums leading-none",
                  isUnread ? "text-foreground/60 font-medium" : "text-muted-foreground/60"
                )}>
                  {formatDate(thread.last_message_at)}
                </span>
              </div>

              {/* Row 2: Subject */}
              <p className={cn(
                "text-[13px] truncate leading-snug",
                isUnread ? "font-medium text-foreground" : "text-foreground/65"
              )}>
                {thread.subject || "(Sans sujet)"}
              </p>

              {/* Row 3: Snippet + Meta */}
              <div className="flex items-center gap-1 pt-0.5">
                <p className="text-[11px] text-muted-foreground/55 truncate flex-1 leading-tight">
                  {thread.snippet || ""}
                </p>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {thread.assigned_to && (
                    <UserCircle className="h-3 w-3 text-primary/40" />
                  )}
                  {thread.has_attachments && (
                    <Paperclip className="h-3 w-3 text-muted-foreground/40" />
                  )}
                  {thread.message_count > 1 && (
                    <span className="text-[10px] text-muted-foreground/50 bg-muted/50 rounded-sm px-1 py-px font-medium leading-none">
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
