import { useSessionTimeline, type SessionTimelineEvent, type SessionTimelineEventType } from "@/hooks/useSessionTimeline";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  UserPlus, FileText, CreditCard, ClipboardCheck, Award, Star,
  PlayCircle, CheckCircle2, GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_META: Record<SessionTimelineEventType, { icon: React.ElementType; color: string; label: string }> = {
  session_created: { icon: PlayCircle, color: "text-info", label: "Création" },
  inscription: { icon: UserPlus, color: "text-primary", label: "Inscription" },
  document_sent: { icon: FileText, color: "text-accent", label: "Document" },
  payment: { icon: CreditCard, color: "text-success", label: "Paiement" },
  emargement: { icon: ClipboardCheck, color: "text-warning", label: "Émargement" },
  exam: { icon: GraduationCap, color: "text-info", label: "Examen" },
  satisfaction: { icon: Star, color: "text-warning", label: "Satisfaction" },
  attestation: { icon: Award, color: "text-success", label: "Attestation" },
  session_closed: { icon: CheckCircle2, color: "text-muted-foreground", label: "Clôture" },
};

interface SessionTimelineProps {
  sessionId: string;
}

export function SessionTimeline({ sessionId }: SessionTimelineProps) {
  const { data: events = [], isLoading } = useSessionTimeline(sessionId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (!events.length) {
    return (
      <p className="text-xs text-muted-foreground italic">Aucun événement enregistré pour le moment.</p>
    );
  }

  return (
    <ol className="relative border-l border-border ml-2 space-y-3 max-h-[360px] overflow-y-auto pr-2">
      {events.map((ev: SessionTimelineEvent) => {
        const meta = TYPE_META[ev.type];
        const Icon = meta.icon;
        return (
          <li key={ev.id} className="ml-3">
            <span className={cn("absolute -left-[7px] flex h-3.5 w-3.5 items-center justify-center rounded-full bg-background border", meta.color)}>
              <Icon className="h-2.5 w-2.5" />
            </span>
            <div className="flex items-baseline gap-2 flex-wrap">
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", meta.color)}>
                {meta.label}
              </Badge>
              <span className="text-xs font-medium text-foreground">{ev.title}</span>
              {ev.detail && (
                <span className="text-xs text-muted-foreground truncate">— {ev.detail}</span>
              )}
              <span className="ml-auto text-[10px] text-muted-foreground whitespace-nowrap">
                {format(new Date(ev.date), "dd MMM yyyy HH:mm", { locale: fr })}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
