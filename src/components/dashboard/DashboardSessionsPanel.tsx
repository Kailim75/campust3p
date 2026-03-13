/**
 * DashboardSessionsPanel — Sessions / pedagogy / operational vigilance.
 * Shows upcoming sessions with fill rate and risk indicators.
 */

import { Calendar, ArrowRight, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { UpcomingSession } from "@/hooks/useDashboardData";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

interface Props {
  sessions: UpcomingSession[];
  isLoading: boolean;
  onNavigate: (section: string, params?: Record<string, string>) => void;
}

export function DashboardSessionsPanel({ sessions, isLoading, onNavigate }: Props) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5" role="region" aria-label="Sessions et pédagogie">
        <Skeleton className="h-5 w-48 mb-4" />
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-14 w-full mb-2" />
        ))}
      </div>
    );
  }

  const isEmpty = sessions.length === 0;
  const atRisk = sessions.filter((s) => s.isRisk).length;

  return (
    <div className="rounded-xl border border-border bg-card p-5" role="region" aria-label="Sessions et pédagogie">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          Sessions (7 prochains jours)
        </h3>
        <div className="flex items-center gap-2">
          {atRisk > 0 && (
            <Badge variant="outline" className="text-[10px] text-warning border-warning/30">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {atRisk} à risque
            </Badge>
          )}
          <Badge variant="secondary" className="text-xs">
            {sessions.length}
          </Badge>
        </div>
      </div>

      {isEmpty && (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground mb-3">
            Aucune session prévue cette semaine
          </p>
          <button
            onClick={() => onNavigate("sessions")}
            className="text-sm text-primary hover:underline font-medium"
            aria-label="Voir toutes les sessions"
          >
            Voir toutes les sessions →
          </button>
        </div>
      )}

      <div className="space-y-1">
        {sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => onNavigate("sessions")}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left group"
            aria-label={`Session ${session.nom}, ${session.inscrits} inscrits sur ${session.places_totales}, taux de remplissage ${session.fillPercent}%`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground truncate">
                  {session.nom}
                </p>
                {session.isRisk && (
                  <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground">
                  {format(parseISO(session.date_debut), "EEE d MMM", { locale: fr })}
                </span>
                <span className="text-xs text-muted-foreground">·</span>
                <span
                  className={cn(
                    "text-xs font-medium",
                    session.isRisk ? "text-warning" : "text-muted-foreground"
                  )}
                >
                  {session.inscrits}/{session.places_totales}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <Progress value={session.fillPercent} className="h-1.5 flex-1" />
                <span
                  className={cn(
                    "text-[10px] font-medium w-8 text-right",
                    session.fillPercent < 50 ? "text-warning" : "text-muted-foreground"
                  )}
                >
                  {session.fillPercent}%
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              {session.track && (
                <Badge variant="outline" className="text-[10px]">
                  {session.track === "initial" ? "Initial" : "FC"}
                </Badge>
              )}
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>
        ))}
      </div>

      {!isEmpty && (
        <button
          onClick={() => onNavigate("sessions")}
          className="text-xs text-primary hover:underline mt-3 ml-3"
          aria-label="Voir toutes les sessions"
        >
          Voir toutes les sessions →
        </button>
      )}
    </div>
  );
}
