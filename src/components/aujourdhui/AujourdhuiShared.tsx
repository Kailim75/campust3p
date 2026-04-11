import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Bot, Check, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, differenceInDays } from "date-fns";
import type { UrgencyInfo } from "@/lib/urgency-utils";
import type { AutoNote } from "./aujourdhui-types";

export function UrgencyDot({ urgency }: { urgency: UrgencyInfo }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("inline-block h-2 w-2 rounded-full shrink-0", urgency.dotClassName)} />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px]">
          <p className="font-semibold text-xs">Urgence : {urgency.label}</p>
          {urgency.reasons.length > 0 && (
            <ul className="text-[10px] mt-0.5 space-y-0.5 text-muted-foreground">
              {urgency.reasons.map((r, i) => <li key={i}>• {r}</li>)}
            </ul>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function LastActionLine({
  todayNotes, recentNotes, contactId,
}: {
  todayNotes: AutoNote[];
  recentNotes: AutoNote[];
  contactId: string;
}) {
  const todayNote = todayNotes.find(n => n.contact_id === contactId);
  if (todayNote) {
    return (
      <div className="flex items-center gap-1.5 mt-1">
        <Bot className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="text-[10px] text-muted-foreground truncate">
          {todayNote.titre.replace("[AUTO] ", "")} — {format(parseISO(todayNote.created_at), "HH:mm")}
        </span>
      </div>
    );
  }
  const recentNote = recentNotes.find(n => n.contact_id === contactId);
  if (recentNote) {
    const noteDate = parseISO(recentNote.created_at);
    const days = differenceInDays(new Date(), noteDate);
    const dateLabel = days === 1 ? "hier" : days < 7 ? `il y a ${days}j` : format(noteDate, "dd/MM");
    return (
      <div className="flex items-center gap-1.5 mt-1">
        <Bot className="h-3 w-3 text-muted-foreground/50 shrink-0" />
        <span className="text-[10px] text-muted-foreground/70 truncate">
          {recentNote.titre.replace("[AUTO] ", "")} — {dateLabel}
        </span>
      </div>
    );
  }
  return null;
}

export function MarkDoneBtn({ contactId, bloc, markDone }: { contactId: string; bloc: string; markDone: (id: string, bloc: string) => void }) {
  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-7 text-[10px] text-muted-foreground hover:text-success"
      onClick={(e) => { e.stopPropagation(); markDone(contactId, bloc); }}
    >
      <Check className="h-3 w-3 mr-1" /> Fait
    </Button>
  );
}
