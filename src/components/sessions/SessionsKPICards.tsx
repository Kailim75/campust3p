import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Users, TrendingUp, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isThisMonth, isFuture, isPast, parseISO } from "date-fns";
import { Session } from "@/hooks/useSessions";

interface SessionsKPICardsProps {
  sessions: Session[];
  inscriptionsCounts: Record<string, number>;
}

export function SessionsKPICards({ sessions, inscriptionsCounts }: SessionsKPICardsProps) {
  // Sessions ce mois
  const sessionsThisMonth = sessions.filter(s => isThisMonth(parseISO(s.date_debut)));
  
  // Sessions à venir
  const upcomingSessions = sessions.filter(s => s.statut === 'a_venir' || s.statut === 'en_cours');
  
  // Taux de remplissage moyen
  const totalPlaces = sessions.reduce((acc, s) => acc + s.places_totales, 0);
  const totalInscrits = sessions.reduce((acc, s) => acc + (inscriptionsCounts[s.id] || 0), 0);
  const avgFillRate = totalPlaces > 0 ? Math.round((totalInscrits / totalPlaces) * 100) : 0;
  
  // CA prévisionnel (sessions à venir avec prix)
  const caPrevisionnel = upcomingSessions.reduce((acc, s) => {
    const inscrits = inscriptionsCounts[s.id] || 0;
    const prix = Number(s.prix) || 0;
    return acc + (inscrits * prix);
  }, 0);
  
  // Sessions incomplètes (< 50% de remplissage à moins de 7 jours)
  const today = new Date();
  const sessionsIncompletes = upcomingSessions.filter(s => {
    const startDate = parseISO(s.date_debut);
    const daysUntilStart = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const inscrits = inscriptionsCounts[s.id] || 0;
    const fillRate = (inscrits / s.places_totales) * 100;
    return daysUntilStart <= 7 && daysUntilStart > 0 && fillRate < 50;
  });

  const kpis = [
    {
      label: "Sessions ce mois",
      value: sessionsThisMonth.length,
      icon: CalendarDays,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Sessions à venir",
      value: upcomingSessions.length,
      icon: TrendingUp,
      color: "text-info",
      bgColor: "bg-info/10",
    },
    {
      label: "Taux de remplissage",
      value: `${avgFillRate}%`,
      icon: Users,
      color: avgFillRate >= 70 ? "text-success" : avgFillRate >= 40 ? "text-warning" : "text-destructive",
      bgColor: avgFillRate >= 70 ? "bg-success/10" : avgFillRate >= 40 ? "bg-warning/10" : "bg-destructive/10",
    },
    {
      label: "CA prévisionnel",
      value: `${caPrevisionnel.toLocaleString('fr-FR')} €`,
      icon: TrendingUp,
      color: "text-success",
      bgColor: "bg-success/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="text-2xl font-bold">{kpi.value}</p>
              </div>
              <div className={cn("p-2 rounded-lg", kpi.bgColor)}>
                <kpi.icon className={cn("h-5 w-5", kpi.color)} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {sessionsIncompletes.length > 0 && (
        <Card className="col-span-2 lg:col-span-4 border-warning/50 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-warning" />
              <div>
                <p className="text-sm font-medium text-warning">
                  {sessionsIncompletes.length} session{sessionsIncompletes.length > 1 ? 's' : ''} avec faible remplissage
                </p>
                <p className="text-xs text-muted-foreground">
                  {sessionsIncompletes.map(s => s.nom).join(', ')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
