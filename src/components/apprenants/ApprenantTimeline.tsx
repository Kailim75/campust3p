import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  UserPlus, Calendar, FileText, Send, Receipt, CreditCard,
  Award, Car, Bell, Bot, StickyNote, Archive, History,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useApprenantTimeline, type TimelineEvent, type TimelineKind } from "@/hooks/useApprenantTimeline";

const KIND_META: Record<TimelineKind, { icon: typeof UserPlus; label: string; className: string }> = {
  created:            { icon: UserPlus,   label: "Création",       className: "text-primary bg-primary/10" },
  historical_import:  { icon: Archive,    label: "Historique",     className: "text-muted-foreground bg-muted" },
  inscription:        { icon: Calendar,   label: "Session",        className: "text-info bg-info/10" },
  document:           { icon: FileText,   label: "Document",       className: "text-accent bg-accent/10" },
  document_envoi:     { icon: Send,       label: "Envoi",          className: "text-indigo-600 bg-indigo-100" },
  facture:            { icon: Receipt,    label: "Facture",        className: "text-warning bg-warning/10" },
  paiement:           { icon: CreditCard, label: "Paiement",       className: "text-success bg-success/10" },
  examen_t3p:         { icon: Award,      label: "Examen T3P",     className: "text-primary bg-primary/10" },
  examen_pratique:    { icon: Car,        label: "Examen pratique", className: "text-primary bg-primary/10" },
  rappel:             { icon: Bell,       label: "Rappel",         className: "text-warning bg-warning/10" },
  auto_note:          { icon: Bot,        label: "Action auto",    className: "text-muted-foreground bg-muted" },
  note:               { icon: StickyNote, label: "Note",           className: "text-foreground bg-secondary" },
};

const ALL_KINDS = Object.keys(KIND_META) as TimelineKind[];

interface ApprenantTimelineProps {
  contactId: string;
  limit?: number;
}

export function ApprenantTimeline({ contactId, limit = 20 }: ApprenantTimelineProps) {
  const { data: events, isLoading } = useApprenantTimeline(contactId);
  const [showAll, setShowAll] = useState(false);
  const [filter, setFilter] = useState<TimelineKind | "all">("all");

  const filtered = useMemo(() => {
    const list = events || [];
    return filter === "all" ? list : list.filter((e) => e.kind === filter);
  }, [events, filter]);

  const visible = showAll ? filtered : filtered.slice(0, limit);

  if (isLoading) {
    return (
      <Card className="p-4 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-32 w-full" />
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Parcours apprenant
          </p>
          {events && events.length > 0 && (
            <Badge variant="outline" className="text-[10px]">{events.length}</Badge>
          )}
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <Button
            size="sm"
            variant={filter === "all" ? "secondary" : "ghost"}
            className="h-6 px-2 text-[10px]"
            onClick={() => setFilter("all")}
          >
            Tout
          </Button>
          {ALL_KINDS.filter((k) => (events || []).some((e) => e.kind === k)).map((k) => {
            const meta = KIND_META[k];
            const Icon = meta.icon;
            return (
              <Button
                key={k}
                size="sm"
                variant={filter === k ? "secondary" : "ghost"}
                className="h-6 px-2 text-[10px] gap-1"
                onClick={() => setFilter(k)}
              >
                <Icon className="h-3 w-3" />
                {meta.label}
              </Button>
            );
          })}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="text-xs text-muted-foreground py-3 text-center">
          Aucun événement
        </p>
      ) : (
        <div className="space-y-0">
          {visible.map((e, i) => (
            <TimelineRow key={e.id} event={e} isLast={i === visible.length - 1} />
          ))}
        </div>
      )}

      {filtered.length > limit && (
        <Button
          size="sm"
          variant="ghost"
          className="text-xs w-full"
          onClick={() => setShowAll((s) => !s)}
        >
          {showAll ? "Réduire" : `Voir tout (${filtered.length})`}
        </Button>
      )}
    </Card>
  );
}

function TimelineRow({ event, isLast }: { event: TimelineEvent; isLast: boolean }) {
  const meta = KIND_META[event.kind];
  const Icon = meta.icon;

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={cn("p-1.5 rounded-full flex-shrink-0", meta.className)}>
          <Icon className="h-3 w-3" />
        </div>
        {!isLast && <div className="w-px flex-1 bg-border min-h-[20px]" />}
      </div>
      <div className="pb-3 min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-foreground">{event.title}</span>
          <span className="text-[10px] text-muted-foreground">
            {format(new Date(event.at), "dd MMM yyyy à HH:mm", { locale: fr })}
          </span>
        </div>
        {event.summary && (
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{event.summary}</p>
        )}
      </div>
    </div>
  );
}
