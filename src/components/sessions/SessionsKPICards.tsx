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
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Taux de remplissage */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="card-elevated group hover:shadow-md transition-shadow cursor-help">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className={cn("p-2.5 rounded-xl", fillBg)}>
                      <Users className={cn("h-5 w-5", fillColor)} />
                    </div>
                    <span className={cn("text-xs font-medium", fillColor)}>
                      {upcomingInscrits}/{upcomingPlaces}
                    </span>
                  </div>
                  <p className={cn("text-2xl font-bold tracking-tight", fillColor)}>{avgFillRate}%</p>
                  <p className="text-xs text-muted-foreground mt-1">Taux de remplissage</p>
                  {sessionsUnder50.length > 0 && (
                    <p className="text-xs text-warning font-medium mt-1">
                      {sessionsUnder50.length} session{sessionsUnder50.length > 1 ? 's' : ''} sous 50%
                    </p>
                  )}
                  <Progress value={avgFillRate} className="mt-2 h-2" />
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>{upcomingInscrits} inscrits sur {upcomingPlaces} places (sessions ouvertes)</p>
            </TooltipContent>
          </Tooltip>

          {/* CA sécurisé */}
          <Card className="card-elevated group hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-success/10">
                  <ShieldCheck className="h-5 w-5 text-success" />
                </div>
              </div>
              <p className="text-2xl font-bold tracking-tight text-success">
                {caSecuriseTotal.toLocaleString('fr-FR')} €
              </p>
              <p className="text-xs text-muted-foreground mt-1">CA sécurisé</p>
              <p className="text-xs text-muted-foreground mt-1">
                Paiements validés uniquement
              </p>
            </CardContent>
          </Card>

          {/* CA prévisionnel */}
          <Card className="card-elevated group hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
              </div>
              <p className="text-2xl font-bold tracking-tight">
                {caPrevisionnel.toLocaleString('fr-FR')} €
              </p>
              <p className="text-xs text-muted-foreground mt-1">CA prévisionnel</p>
              <p className="text-xs text-success font-medium mt-1">
                dont {caSecuriseTotal.toLocaleString('fr-FR')} € sécurisés
              </p>
            </CardContent>
          </Card>

          {/* Projection mensuelle */}
          <Card className="card-elevated group hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-info/10">
                  <Target className="h-5 w-5 text-info" />
                </div>
              </div>
              <p className="text-2xl font-bold tracking-tight">
                {projectionMois.toLocaleString('fr-FR')} €
              </p>
              <p className="text-xs text-muted-foreground mt-1">Projection fin de mois</p>
              <p className="text-xs text-muted-foreground mt-1">
                Basé sur {caSecuriseMois.toLocaleString('fr-FR')} € sécurisés (J{dayOfMonth}/{daysInMonth})
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Alert banner */}
        {sessionsCritiques.length > 0 && (
          <Card className="border-destructive/40 bg-destructive/5 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-destructive/10 shrink-0 mt-0.5">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-destructive">
                    {sessionsCritiques.length} session{sessionsCritiques.length > 1 ? 's' : ''} critique{sessionsCritiques.length > 1 ? 's' : ''} — Action immédiate
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    Remplissage &lt;50% et démarrage &lt;14j : {sessionsCritiques.map(s => s.nom).join(', ')}
                  </p>
                </div>
                {onToggleCritical && (
                  <button
                    onClick={onToggleCritical}
                    className={cn(
                      "shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                      criticalOnly
                        ? "bg-destructive text-destructive-foreground"
                        : "bg-destructive/10 text-destructive hover:bg-destructive/20"
                    )}
                  >
                    {criticalOnly ? "Tout afficher" : "Filtrer critiques"}
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}
