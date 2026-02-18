import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Users, TrendingUp, TrendingDown, AlertTriangle, DollarSign, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { isThisMonth, parseISO, subMonths, isWithinInterval, startOfMonth, endOfMonth } from "date-fns";
import { Session } from "@/hooks/useSessions";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SessionsKPICardsProps {
  sessions: Session[];
  inscriptionsCounts: Record<string, number>;
}

export function SessionsKPICards({ sessions, inscriptionsCounts }: SessionsKPICardsProps) {
  const now = new Date();
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  // Sessions ce mois
  const sessionsThisMonth = sessions.filter(s => isThisMonth(parseISO(s.date_debut)));
  const sessionsLastMonth = sessions.filter(s => 
    isWithinInterval(parseISO(s.date_debut), { start: lastMonthStart, end: lastMonthEnd })
  );
  const monthChange = sessionsLastMonth.length > 0
    ? Math.round(((sessionsThisMonth.length - sessionsLastMonth.length) / sessionsLastMonth.length) * 100)
    : sessionsThisMonth.length > 0 ? 100 : 0;

  // Sessions à venir / en cours
  const upcomingSessions = sessions.filter(s => s.statut === 'a_venir' || s.statut === 'en_cours');
  const activeSessions = sessions.filter(s => s.statut === 'en_cours');

  // Taux de remplissage moyen (sessions à venir uniquement)
  const upcomingPlaces = upcomingSessions.reduce((acc, s) => acc + s.places_totales, 0);
  const upcomingInscrits = upcomingSessions.reduce((acc, s) => acc + (inscriptionsCounts[s.id] || 0), 0);
  const avgFillRate = upcomingPlaces > 0 ? Math.round((upcomingInscrits / upcomingPlaces) * 100) : 0;

  // CA prévisionnel
  const caPrevisionnel = upcomingSessions.reduce((acc, s) => {
    const inscrits = inscriptionsCounts[s.id] || 0;
    const prix = Number(s.prix) || 0;
    return acc + (inscrits * prix);
  }, 0);

  // Sessions incomplètes (< 50% remplissage à < 7 jours)
  const today = new Date();
  const sessionsIncompletes = upcomingSessions.filter(s => {
    const startDate = parseISO(s.date_debut);
    const daysUntilStart = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const inscrits = inscriptionsCounts[s.id] || 0;
    const fillRate = (inscrits / s.places_totales) * 100;
    return daysUntilStart <= 7 && daysUntilStart > 0 && fillRate < 50;
  });

  const fillColor = avgFillRate >= 70 ? "text-success" : avgFillRate >= 40 ? "text-warning" : "text-destructive";
  const fillBg = avgFillRate >= 70 ? "bg-success/10" : avgFillRate >= 40 ? "bg-warning/10" : "bg-destructive/10";

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Sessions ce mois */}
          <Card className="card-elevated group hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <CalendarDays className="h-5 w-5 text-primary" />
                </div>
                <TrendBadge value={monthChange} />
              </div>
              <p className="text-2xl font-bold tracking-tight">{sessionsThisMonth.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Sessions ce mois</p>
              {activeSessions.length > 0 && (
                <div className="mt-3 flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                  </span>
                  <span className="text-xs text-success font-medium">{activeSessions.length} en cours</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sessions à venir */}
          <Card className="card-elevated group hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-info/10">
                  <BarChart3 className="h-5 w-5 text-info" />
                </div>
                <Badge variant="secondary" className="text-xs font-normal">
                  {upcomingInscrits} inscrits
                </Badge>
              </div>
              <p className="text-2xl font-bold tracking-tight">{upcomingSessions.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Sessions à venir</p>
              <p className="text-xs text-muted-foreground mt-1">
                {upcomingPlaces} places disponibles
              </p>
            </CardContent>
          </Card>

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
                  <Progress 
                    value={avgFillRate} 
                    className="mt-3 h-2" 
                  />
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>{upcomingInscrits} inscrits sur {upcomingPlaces} places (sessions à venir)</p>
            </TooltipContent>
          </Tooltip>

          {/* CA prévisionnel */}
          <Card className="card-elevated group hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-success/10">
                  <DollarSign className="h-5 w-5 text-success" />
                </div>
              </div>
              <p className="text-2xl font-bold tracking-tight">
                {caPrevisionnel.toLocaleString('fr-FR')} €
              </p>
              <p className="text-xs text-muted-foreground mt-1">CA prévisionnel</p>
              <p className="text-xs text-muted-foreground mt-1">
                Sur {upcomingSessions.length} session{upcomingSessions.length > 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Alert banner */}
        {sessionsIncompletes.length > 0 && (
          <Card className="border-warning/40 bg-warning/5 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-warning/10 shrink-0 mt-0.5">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-warning">
                    {sessionsIncompletes.length} session{sessionsIncompletes.length > 1 ? 's' : ''} avec faible remplissage
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    Démarrage imminent (&lt;7j) : {sessionsIncompletes.map(s => s.nom).join(', ')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}

function TrendBadge({ value }: { value: number }) {
  if (value === 0) return null;
  const isPositive = value > 0;
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-md",
      isPositive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
    )}>
      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {isPositive ? '+' : ''}{value}%
    </span>
  );
}
