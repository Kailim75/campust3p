import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";
import { Paperclip, UserCircle, Mail } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CrmLabelBadge } from "./CrmLabelBadge";

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
  crm_labels?: string[];
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

const STATUS_COLORS: Record<string, string> = {
  nouveau: "border-l-blue-500",
  en_cours: "border-l-amber-500",
  traite: "border-l-green-500",
  archive: "border-l-muted-foreground/30",
  trash: "border-l-destructive/30",
};

function getFirstParticipant(participants: any): string {
  if (!Array.isArray(participants) || participants.length === 0) return "Inconnu";
  const p = participants[0];
  return p?.name || p?.email || "Inconnu";
}

export function ThreadList({ threads, isLoading, selectedThreadId, onSelect }: ThreadListProps) {
  if (isLoading) {
    return (
      <div className="p-2 space-y-px">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="rounded px-3 py-2 space-y-1.5">
            <div className="flex justify-between items-center">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-2.5 w-10" />
            </div>
            <Skeleton className="h-3 w-3/4" />
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
    <div className="divide-y divide-border/40">
      {threads.map((thread) => {
        const isSelected = selectedThreadId === thread.id;
        const isUnread = thread.is_unread;
        const borderColor = STATUS_COLORS[thread.status] || STATUS_COLORS.nouveau;

        return (
          <button
            key={thread.id}
            onClick={() => onSelect(thread.id)}
            className={cn(
              "w-full text-left transition-colors border-l-[3px]",
              borderColor,
              isSelected
                ? "bg-accent"
                : isUnread
                  ? "bg-primary/[0.03] hover:bg-accent/50"
                  : "hover:bg-accent/30",
            )}
          >
            <div className="px-3 py-1.5">
              {/* Row 1: Sender + Meta */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  {isUnread && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  )}
                  <span className={cn(
                    "text-[12px] truncate leading-none",
                    isUnread ? "font-semibold text-foreground" : "text-foreground/70"
                  )}>
                    {getFirstParticipant(thread.participants)}
                  </span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {thread.assigned_to && (
                    <UserCircle className="h-2.5 w-2.5 text-primary/40" />
                  )}
                  {thread.has_attachments && (
                    <Paperclip className="h-2.5 w-2.5 text-muted-foreground/40" />
                  )}
                  {thread.message_count > 1 && (
                    <span className="text-[9px] text-muted-foreground/50 bg-muted/50 rounded-sm px-1 py-px font-medium leading-none">
                      {thread.message_count}
                    </span>
                  )}
                  <span className={cn(
                    "text-[10px] tabular-nums leading-none ml-0.5",
                    isUnread ? "text-foreground/60 font-medium" : "text-muted-foreground/50"
                  )}>
                    {formatDate(thread.last_message_at)}
                  </span>
                </div>
              </div>

              {/* Row 2: Subject + Labels */}
              <div className="flex items-center gap-1 mt-0.5">
                <p className={cn(
                  "text-[12px] truncate leading-snug flex-1",
                  isUnread ? "font-medium text-foreground" : "text-foreground/60"
                )}>
                  {thread.subject || "(Sans sujet)"}
                </p>
                {(thread.crm_labels || []).slice(0, 2).map((label) => (
                  <CrmLabelBadge key={label} label={label} size="xs" />
                ))}
                {(thread.crm_labels || []).length > 2 && (
                  <span className="text-[8px] text-muted-foreground/50 leading-none">
                    +{(thread.crm_labels || []).length - 2}
                  </span>
                )}
              </div>

              {/* Row 3: Snippet (compact) */}
              {thread.snippet && (
                <p className="text-[11px] text-muted-foreground/45 truncate leading-tight mt-0.5">
                  {thread.snippet}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
