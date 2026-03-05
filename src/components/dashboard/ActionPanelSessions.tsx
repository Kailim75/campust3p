import { Calendar, ArrowRight, AlertTriangle, FileText, UserX } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useUpcomingSessions } from "@/hooks/useDashboardActionData";
import { useTopFactures } from "@/hooks/useDashboardFallbackWidgets";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { formatEur } from "@/lib/format-currency";

interface Props {
  onNavigate: (section: string, params?: Record<string, string>) => void;
}

function FallbackTopFactures({ onNavigate }: Props) {
  const { data: factures, isLoading } = useTopFactures();

  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!factures || factures.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-border/50">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="h-3.5 w-3.5 text-warning" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Top factures en attente
        </span>
      </div>
      <div className="space-y-1">
        {factures.map(f => (
          <button
            key={f.id}
            onClick={() => onNavigate("finances", { tab: "factures" })}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors text-left group"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{f.numero_facture}</p>
              <p className="text-xs text-muted-foreground">
                {f.ageDays > 0 ? `${f.ageDays}j de retard` : "En attente"}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span className="text-sm font-semibold text-foreground">{formatEur(f.montant_total)}</span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>
        ))}
      </div>
      <button
        onClick={() => onNavigate("finances", { tab: "factures" })}
        className="text-xs text-primary hover:underline mt-1 ml-3"
      >
        Voir toutes les factures →
      </button>
    </div>
  );
}

export function ActionPanelSessions({ onNavigate }: Props) {
  const { data: sessions, isLoading } = useUpcomingSessions();

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <Skeleton className="h-5 w-40 mb-4" />
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full mb-2" />)}
      </div>
    );
  }

  const isEmpty = !sessions || sessions.length === 0;
  const fewSessions = sessions && sessions.length < 2;

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

      {isEmpty && (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground mb-3">Aucune session prévue cette semaine</p>
          <button
            onClick={() => onNavigate("sessions")}
            className="text-sm text-primary hover:underline font-medium"
          >
            Voir toutes les sessions →
          </button>
        </div>
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
                  {session.inscrits}/{session.places_totales}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <Progress value={session.fillPercent} className="h-1.5 flex-1" />
                <span className={cn(
                  "text-[10px] font-medium w-8 text-right",
                  session.fillPercent < 50 ? "text-warning" : "text-muted-foreground"
                )}>
                  {session.fillPercent}%
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              {session.track && (
                <Badge variant="outline" className="text-[10px]">
                  {session.track === "initial" ? "Initial" : "Formation continue"}
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
        >
          Voir toutes les sessions →
        </button>
      )}

      {/* Fallback widget when few sessions */}
      {fewSessions && <FallbackTopFactures onNavigate={onNavigate} />}

      {fewSessions && !isEmpty && (
        <p className="text-xs text-muted-foreground mt-2 ml-3">
          Peu de sessions planifiées — pensez à anticiper votre planning.
        </p>
      )}
    </div>
  );
}
