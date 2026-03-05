import { Calendar, ArrowRight, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useUpcomingSessions } from "@/hooks/useDashboardActionData";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

interface Props {
  onNavigate: (section: string, params?: Record<string, string>) => void;
}

export function ActionPanelSessions({ onNavigate }: Props) {
  const { data: sessions, isLoading } = useUpcomingSessions();

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <Skeleton className="h-5 w-40 mb-4" />
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full mb-2" />)}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          Prochaines sessions (7 jours)
        </h3>
        <Badge variant="secondary" className="text-xs">
          {(sessions || []).length}
        </Badge>
      </div>

      {(sessions || []).length === 0 && (
        <p className="text-sm text-muted-foreground py-4 text-center">Aucune session prévue cette semaine</p>
      )}

      <div className="space-y-1">
        {(sessions || []).map(session => (
          <button
            key={session.id}
            onClick={() => onNavigate("sessions")}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left group"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground truncate">{session.nom}</p>
                {session.isRisk && (
                  <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground">
                  {format(parseISO(session.date_debut), "EEE d MMM", { locale: fr })}
                </span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className={cn(
                  "text-xs font-medium",
                  session.isRisk ? "text-warning" : "text-muted-foreground"
                )}>
                  {session.inscrits}/{session.places_totales} inscrits
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              {session.track && (
                <Badge variant="outline" className="text-[10px]">
                  {session.track === "initial" ? "Initial" : "Continue"}
                </Badge>
              )}
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={() => onNavigate("sessions")}
        className="text-xs text-primary hover:underline mt-3 ml-3"
      >
        Voir toutes les sessions →
      </button>
    </div>
  );
}
