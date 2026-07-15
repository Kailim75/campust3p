import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Bot, CalendarClock, Check, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { addDays, format, parseISO, differenceInDays } from "date-fns";
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
            <ul className="text-[11px] mt-0.5 space-y-0.5 text-muted-foreground">
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
        <span className="text-[11px] text-muted-foreground truncate">
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
        <span className="text-[11px] text-muted-foreground/70 truncate">
          {recentNote.titre.replace("[AUTO] ", "")} — {dateLabel}
        </span>
      </div>
    );
  }
  return null;
}

export function MarkDoneBtn({
  contactId,
  bloc,
  markDone,
  label = "Traité",
}: {
  contactId: string;
  bloc: string;
  markDone: (id: string, bloc: string) => void;
  label?: string;
}) {
  return (
    <Button
      size="sm"
      variant="outline"
      className="h-7 text-[11px] text-success border-success/25 bg-success/5 hover:bg-success/10 hover:text-success"
      onClick={(e) => { e.stopPropagation(); markDone(contactId, bloc); }}
    >
      <Check className="h-3 w-3 mr-1" /> {label}
    </Button>
  );
}

const POSTPONE_PRESETS = [
  { label: "Demain", days: 1 },
  { label: "Dans 3 jours", days: 3 },
  { label: "Semaine prochaine", days: 7 },
];

export function PostponeBtn({
  contactId,
  bloc,
  postponeAction,
}: {
  contactId: string;
  bloc: string;
  postponeAction: (id: string, bloc: string, targetDate: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [customDate, setCustomDate] = useState("");
  const minDate = format(addDays(new Date(), 1), "yyyy-MM-dd");

  const postpone = (targetDate: string) => {
    postponeAction(contactId, bloc, targetDate);
    setOpen(false);
    setCustomDate("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-[11px] text-muted-foreground hover:text-primary"
          onClick={(event) => event.stopPropagation()}
        >
          <CalendarClock className="h-3 w-3 mr-1" /> Reporter
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="end" onClick={(event) => event.stopPropagation()}>
        <p className="text-xs font-medium mb-2">Reporter l'action</p>
        <div className="grid gap-1.5 mb-2">
          {POSTPONE_PRESETS.map((preset) => {
            const targetDate = format(addDays(new Date(), preset.days), "yyyy-MM-dd");
            return (
              <Button
                key={preset.label}
                size="sm"
                variant="ghost"
                className="h-7 justify-start text-xs"
                onClick={() => postpone(targetDate)}
              >
                {preset.label}
              </Button>
            );
          })}
        </div>
        <div className="flex gap-1.5">
          <Input
            type="date"
            min={minDate}
            value={customDate}
            onChange={(event) => setCustomDate(event.target.value)}
            className="h-8 text-xs"
          />
          <Button size="sm" className="h-8 text-xs" disabled={!customDate} onClick={() => postpone(customDate)}>
            OK
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
