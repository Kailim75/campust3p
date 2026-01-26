import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Calendar, 
  Users, 
  Clock, 
  TrendingUp, 
  CheckCircle2,
  AlertCircle,
  BookOpen
} from "lucide-react";
import { format, parseISO, isToday, isTomorrow, isThisWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { useFormateursStats, useFormateursDisponibilite } from "@/hooks/useFormateurs";
import { useSessions } from "@/hooks/useSessions";
import { useSessionInscrits } from "@/hooks/useSessionInscrits";

interface FormateurDashboardProps {
  formateurNom: string;
}

export function FormateurDashboard({ formateurNom }: FormateurDashboardProps) {
  const { data: formateursStats, isLoading: loadingStats } = useFormateursStats();
  const { data: disponibilite, isLoading: loadingDispo } = useFormateursDisponibilite();
  const { data: allSessions } = useSessions();

  const isLoading = loadingStats || loadingDispo;

  // Find stats for this formateur
  const myStats = formateursStats?.find(f => f.formateur === formateurNom);
  const myDispo = disponibilite?.filter(d => d.formateur === formateurNom) || [];
  
  // Get sessions for this formateur
  const mySessions = allSessions?.filter(s => s.formateur === formateurNom) || [];
  const upcomingSessions = mySessions
    .filter(s => s.statut === "a_venir" || s.statut === "en_cours")
    .sort((a, b) => new Date(a.date_debut).getTime() - new Date(b.date_debut).getTime());

  // Categorize sessions by timing
  const todaySessions = upcomingSessions.filter(s => isToday(parseISO(s.date_debut)));
  const tomorrowSessions = upcomingSessions.filter(s => isTomorrow(parseISO(s.date_debut)));
  const thisWeekSessions = upcomingSessions.filter(s => 
    isThisWeek(parseISO(s.date_debut), { weekStartsOn: 1 }) && 
    !isToday(parseISO(s.date_debut)) && 
    !isTomorrow(parseISO(s.date_debut))
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessions totales</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myStats?.sessionsTotal ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              {myStats?.sessionsAVenir ?? 0} à venir • {myStats?.sessionsEnCours ?? 0} en cours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stagiaires formés</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myStats?.stagiairesFormes ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              Total cumulé
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux remplissage</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myStats?.tauxRemplissage ?? 0}%</div>
            <Progress value={myStats?.tauxRemplissage ?? 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CA généré</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("fr-FR", {
                style: "currency",
                currency: "EUR",
                maximumFractionDigits: 0,
              }).format(myStats?.caGenere ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Sur vos sessions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Sessions */}
      {todaySessions.length > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <AlertCircle className="h-5 w-5" />
              Sessions aujourd'hui
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todaySessions.map((session) => (
                <div 
                  key={session.id}
                  className="flex items-center justify-between p-3 bg-background rounded-lg border"
                >
                  <div>
                    <p className="font-medium">{session.nom}</p>
                    <p className="text-sm text-muted-foreground">
                      {session.heure_debut || "09:00"} - {session.heure_fin || "17:00"}
                      {session.adresse_ville && ` • ${session.adresse_ville}`}
                    </p>
                  </div>
                  <Badge variant="default">Aujourd'hui</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Prochaines sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Aucune session à venir</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Tomorrow */}
              {tomorrowSessions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Demain</h4>
                  {tomorrowSessions.map((session) => (
                    <SessionRow key={session.id} session={session} />
                  ))}
                </div>
              )}
              
              {/* This Week */}
              {thisWeekSessions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Cette semaine</h4>
                  {thisWeekSessions.map((session) => (
                    <SessionRow key={session.id} session={session} />
                  ))}
                </div>
              )}

              {/* Later */}
              {upcomingSessions.filter(s => 
                !isToday(parseISO(s.date_debut)) && 
                !isTomorrow(parseISO(s.date_debut)) &&
                !isThisWeek(parseISO(s.date_debut), { weekStartsOn: 1 })
              ).slice(0, 5).map((session) => (
                <SessionRow key={session.id} session={session} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disponibilité */}
      <Card>
        <CardHeader>
          <CardTitle>Charge de travail (3 prochains mois)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {myDispo.map((dispo) => (
              <div key={dispo.mois} className="p-4 bg-muted/30 rounded-lg">
                <p className="font-medium capitalize">
                  {format(new Date(dispo.mois + "-01"), "MMMM yyyy", { locale: fr })}
                </p>
                <div className="mt-2">
                  <Progress 
                    value={(dispo.joursOccupes / dispo.joursTotaux) * 100} 
                    className="h-2"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    {dispo.joursOccupes} / {dispo.joursTotaux} jours occupés
                  </p>
                </div>
                {dispo.sessions.length > 0 && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {dispo.sessions.length} session{dispo.sessions.length > 1 ? "s" : ""}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SessionRow({ session }: { session: any }) {
  return (
    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
      <div>
        <p className="font-medium">{session.nom}</p>
        <p className="text-sm text-muted-foreground">
          {format(parseISO(session.date_debut), "EEEE d MMMM", { locale: fr })}
          {session.adresse_ville && ` • ${session.adresse_ville}`}
        </p>
      </div>
      <Badge variant="outline">{session.formation_type || "Formation"}</Badge>
    </div>
  );
}
