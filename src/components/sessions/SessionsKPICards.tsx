import { Card, CardContent } from "@/components/ui/card";
import { Users, TrendingUp, TrendingDown, AlertTriangle, DollarSign, Target, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseISO } from "date-fns";
import { Session } from "@/hooks/useSessions";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { SessionFinancialData } from "@/hooks/useSessionFinancials";

interface SessionsKPICardsProps {
  sessions: Session[];
  inscriptionsCounts: Record<string, number>;
  financials?: Record<string, SessionFinancialData>;
  criticalOnly?: boolean;
  onToggleCritical?: () => void;
}

export function SessionsKPICards({ sessions, inscriptionsCounts, financials = {}, criticalOnly, onToggleCritical }: SessionsKPICardsProps) {
  const today = new Date();

  // Sessions à venir / en cours
  const upcomingSessions = sessions.filter(s => s.statut === 'a_venir' || s.statut === 'en_cours');

  // Taux de remplissage moyen (sessions ouvertes)
  const upcomingPlaces = upcomingSessions.reduce((acc, s) => acc + s.places_totales, 0);
  const upcomingInscrits = upcomingSessions.reduce((acc, s) => acc + (inscriptionsCounts[s.id] || 0), 0);
  const avgFillRate = upcomingPlaces > 0 ? Math.round((upcomingInscrits / upcomingPlaces) * 100) : 0;

  // Sessions sous 50%
  const sessionsUnder50 = upcomingSessions.filter(s => {
    const inscrits = inscriptionsCounts[s.id] || 0;
    return s.places_totales > 0 && (inscrits / s.places_totales) < 0.5;
  });

  // CA prévisionnel
  const caPrevisionnel = upcomingSessions.reduce((acc, s) => {
    const inscrits = inscriptionsCounts[s.id] || 0;
    const prix = Number(s.prix) || 0;
    return acc + (inscrits * prix);
  }, 0);

  // CA sécurisé total
  const caSecuriseTotal = Object.values(financials).reduce((acc, f) => acc + f.ca_securise, 0);

  // Sessions critiques (< 50% remplissage à < 14 jours)
  const sessionsCritiques = upcomingSessions.filter(s => {
    const startDate = parseISO(s.date_debut);
    const daysUntilStart = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const inscrits = inscriptionsCounts[s.id] || 0;
    const fillRate = s.places_totales > 0 ? (inscrits / s.places_totales) * 100 : 0;
    return daysUntilStart <= 14 && daysUntilStart > 0 && fillRate < 50;
  });

  // Projection mensuelle
  const dayOfMonth = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const caSecuriseMois = upcomingSessions.reduce((acc, s) => {
    const sd = parseISO(s.date_debut);
    if (sd.getMonth() === today.getMonth() && sd.getFullYear() === today.getFullYear()) {
      return acc + (financials[s.id]?.ca_securise || 0);
    }
    return acc;
  }, 0);
  const projectionMois = daysInMonth > 0 ? Math.round((caSecuriseMois / dayOfMonth) * daysInMonth) : 0;

  const fillColor = avgFillRate >= 70 ? "text-success" : avgFillRate >= 40 ? "text-warning" : "text-destructive";
  const fillBg = avgFillRate >= 70 ? "bg-success/10" : avgFillRate >= 40 ? "bg-warning/10" : "bg-destructive/10";

  return (
    <TooltipProvider>
      <div className="space-y-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Taux de remplissage */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="card-elevated group hover:shadow-md transition-shadow cursor-help">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg shrink-0", fillBg)}>
                      <Users className={cn("h-4 w-4", fillColor)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-xl font-bold tracking-tight leading-none", fillColor)}>{avgFillRate}%</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Remplissage · {upcomingInscrits}/{upcomingPlaces}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>{upcomingInscrits} inscrits sur {upcomingPlaces} places (sessions ouvertes)</p>
              {sessionsUnder50.length > 0 && <p className="text-warning">{sessionsUnder50.length} session{sessionsUnder50.length > 1 ? 's' : ''} sous 50%</p>}
            </TooltipContent>
          </Tooltip>

          {/* CA sécurisé */}
          <Card className="card-elevated group hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10 shrink-0">
                  <ShieldCheck className="h-4 w-4 text-success" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xl font-bold tracking-tight text-success leading-none">
                    {caSecuriseTotal.toLocaleString('fr-FR')} €
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">CA sécurisé</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CA prévisionnel */}
          <Card className="card-elevated group hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                  <DollarSign className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xl font-bold tracking-tight leading-none">
                    {caPrevisionnel.toLocaleString('fr-FR')} €
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Prévisionnel · {caSecuriseTotal.toLocaleString('fr-FR')} € sécurisés</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Projection mensuelle */}
          <Card className="card-elevated group hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-info/10 shrink-0">
                  <Target className="h-4 w-4 text-info" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xl font-bold tracking-tight leading-none">
                    {projectionMois.toLocaleString('fr-FR')} €
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Projection · J{dayOfMonth}/{daysInMonth}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alert banner — compact */}
        {sessionsCritiques.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-destructive/30 bg-destructive/5">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-xs font-medium text-destructive flex-1 min-w-0 truncate">
              {sessionsCritiques.length} session{sessionsCritiques.length > 1 ? 's' : ''} critique{sessionsCritiques.length > 1 ? 's' : ''} — {sessionsCritiques.map(s => s.nom).join(', ')}
            </p>
            {onToggleCritical && (
              <button
                onClick={onToggleCritical}
                className={cn(
                  "shrink-0 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors",
                  criticalOnly
                    ? "bg-destructive text-destructive-foreground"
                    : "bg-destructive/10 text-destructive hover:bg-destructive/20"
                )}
              >
                {criticalOnly ? "Tout afficher" : "Filtrer"}
              </button>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
