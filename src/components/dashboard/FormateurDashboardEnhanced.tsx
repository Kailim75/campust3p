import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  Users, 
  Clock, 
  TrendingUp, 
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Star,
  FileSignature,
  Eye,
  ChevronRight
} from "lucide-react";
import { format, parseISO, isToday, isTomorrow, isThisWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { useFormateursStats, useFormateursDisponibilite, useFormateursTable } from "@/hooks/useFormateurs";
import { useSessions } from "@/hooks/useSessions";
import { useSessionInscrits } from "@/hooks/useSessionInscrits";
import { useEmargements } from "@/hooks/useEmargements";
import { ApprenantDetailSheet } from "@/components/apprenants/ApprenantDetailSheet";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface FormateurDashboardEnhancedProps {
  formateurId?: string;
  formateurNom?: string;
}

export function FormateurDashboardEnhanced({ formateurId, formateurNom }: FormateurDashboardEnhancedProps) {
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  
  const { data: formateursStats, isLoading: loadingStats } = useFormateursStats();
  const { data: disponibilite, isLoading: loadingDispo } = useFormateursDisponibilite();
  const { data: allSessions } = useSessions();
  const { data: formateurs } = useFormateursTable();

  // Get formateur info
  const formateur = formateurId 
    ? formateurs?.find(f => f.id === formateurId)
    : null;
  
  const effectiveNom = formateurNom || formateur?.nom || "";

  const isLoading = loadingStats || loadingDispo;

  // Find stats for this formateur
  const myStats = formateursStats?.find(f => f.formateur === effectiveNom);
  const myDispo = disponibilite?.filter(d => d.formateur === effectiveNom) || [];
  
  // Get sessions for this formateur
  const mySessions = allSessions?.filter(s => s.formateur === effectiveNom) || [];
  const upcomingSessions = mySessions
    .filter(s => s.statut === "a_venir" || s.statut === "en_cours")
    .sort((a, b) => new Date(a.date_debut).getTime() - new Date(b.date_debut).getTime());

  // Get session IDs for fetching stagiaires
  const mySessionIds = mySessions.map(s => s.id);

  // Fetch all stagiaires for my sessions
  const { data: allInscriptions } = useQuery({
    queryKey: ["formateur-stagiaires", mySessionIds],
    queryFn: async () => {
      if (mySessionIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from("session_inscriptions")
        .select(`
          id,
          session_id,
          statut,
          contact:contacts (
            id,
            nom,
            prenom,
            email,
            telephone,
            formation
          ),
          session:sessions (
            id,
            nom,
            date_debut,
            date_fin
          )
        `)
        .in("session_id", mySessionIds)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: mySessionIds.length > 0,
  });

  // Fetch satisfaction scores for my sessions
  const { data: satisfactionData } = useQuery({
    queryKey: ["formateur-satisfaction", mySessionIds],
    queryFn: async () => {
      if (mySessionIds.length === 0) return null;
      
      const { data, error } = await supabase
        .from("satisfaction_reponses")
        .select("note_formateur, note_globale, nps_score")
        .in("session_id", mySessionIds);

      if (error) throw error;
      
      if (!data || data.length === 0) return null;
      
      const avgFormateur = data.reduce((acc, r) => acc + (r.note_formateur || 0), 0) / data.length;
      const avgGlobal = data.reduce((acc, r) => acc + (r.note_globale || 0), 0) / data.length;
      const avgNps = data.reduce((acc, r) => acc + (r.nps_score || 0), 0) / data.length;
      
      return {
        count: data.length,
        avgFormateur: avgFormateur.toFixed(1),
        avgGlobal: avgGlobal.toFixed(1),
        avgNps: avgNps.toFixed(1),
      };
    },
    enabled: mySessionIds.length > 0,
  });

  // Fetch pending emargements (unsigned - no signature_data)
  const { data: pendingEmargements } = useQuery({
    queryKey: ["formateur-emargements", mySessionIds],
    queryFn: async () => {
      if (mySessionIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from("emargements")
        .select("id, date_emargement, periode, present, signature_data, contact_id, session_id")
        .in("session_id", mySessionIds)
        .is("signature_data", null)
        .order("date_emargement", { ascending: true })
        .limit(10);
      
      if (error) throw error;
      if (!data || data.length === 0) return [];
      
      // Fetch contact and session names separately
      const enriched = await Promise.all(data.map(async (e) => {
        const [contactRes, sessionRes] = await Promise.all([
          supabase.from("contacts").select("nom, prenom").eq("id", e.contact_id).single(),
          supabase.from("sessions").select("nom").eq("id", e.session_id).single(),
        ]);
        return {
          id: e.id,
          date_emargement: e.date_emargement,
          periode: e.periode,
          contact: contactRes.data,
          session: sessionRes.data,
        };
      }));
      
      return enriched;
    },
    enabled: mySessionIds.length > 0,
  });

  // Categorize sessions by timing
  const todaySessions = upcomingSessions.filter((s: any) => isToday(parseISO(s.date_debut)));
  const tomorrowSessions = upcomingSessions.filter((s: any) => isTomorrow(parseISO(s.date_debut)));
  const thisWeekSessions = upcomingSessions.filter((s: any) => 
    isThisWeek(parseISO(s.date_debut), { weekStartsOn: 1 }) && 
    !isToday(parseISO(s.date_debut)) && 
    !isTomorrow(parseISO(s.date_debut))
  );

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
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
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tableau de bord Formateur</h1>
          <p className="text-muted-foreground">
            Bienvenue, {effectiveNom || "Formateur"}
          </p>
        </div>
        {satisfactionData && (
          <div className="flex items-center gap-2 bg-accent px-4 py-2 rounded-lg">
            <Star className="h-5 w-5 text-primary fill-primary" />
            <span className="font-medium">{satisfactionData.avgFormateur}/10</span>
            <span className="text-sm text-muted-foreground">
              ({satisfactionData.count} avis)
            </span>
          </div>
        )}
      </div>

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

      {/* Today's Sessions - Highlighted */}
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

      {/* Main Content Tabs */}
      <Tabs defaultValue="stagiaires" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stagiaires" className="gap-2">
            <Users className="h-4 w-4" />
            Mes stagiaires
          </TabsTrigger>
          <TabsTrigger value="sessions" className="gap-2">
            <Calendar className="h-4 w-4" />
            Planning
          </TabsTrigger>
          <TabsTrigger value="emargements" className="gap-2">
            <FileSignature className="h-4 w-4" />
            Émargements
            {pendingEmargements && pendingEmargements.length > 0 && (
              <Badge variant="destructive" className="ml-1">
                {pendingEmargements.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Stagiaires Tab */}
        <TabsContent value="stagiaires">
          <Card>
            <CardHeader>
              <CardTitle>Stagiaires de mes sessions</CardTitle>
            </CardHeader>
            <CardContent>
              {!allInscriptions || allInscriptions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Aucun stagiaire inscrit</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {allInscriptions.map((inscription: any) => (
                      <div 
                        key={inscription.id}
                        className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {inscription.contact?.prenom?.[0]}{inscription.contact?.nom?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {inscription.contact?.prenom} {inscription.contact?.nom}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {inscription.session?.nom}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {inscription.statut}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedContactId(inscription.contact?.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    {tomorrowSessions.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Demain</h4>
                        {tomorrowSessions.map((session) => (
                          <SessionRow key={session.id} session={session} />
                        ))}
                      </div>
                    )}
                    
                    {thisWeekSessions.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Cette semaine</h4>
                        {thisWeekSessions.map((session) => (
                          <SessionRow key={session.id} session={session} />
                        ))}
                      </div>
                    )}

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
                <CardTitle>Charge de travail (3 mois)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {myDispo.map((dispo) => (
                    <div key={dispo.mois} className="p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium capitalize">
                          {format(new Date(dispo.mois + "-01"), "MMMM yyyy", { locale: fr })}
                        </p>
                        <span className="text-sm text-muted-foreground">
                          {dispo.sessions.length} session{dispo.sessions.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <Progress 
                        value={(dispo.joursOccupes / dispo.joursTotaux) * 100} 
                        className="h-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {dispo.joursOccupes} / {dispo.joursTotaux} jours occupés
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Emargements Tab */}
        <TabsContent value="emargements">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSignature className="h-5 w-5" />
                Émargements en attente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!pendingEmargements || pendingEmargements.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50 text-green-500" />
                  <p>Tous les émargements sont à jour !</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingEmargements.map((emargement: any) => (
                    <div 
                      key={emargement.id}
                      className="flex items-center justify-between p-3 bg-accent rounded-lg border border-border"
                    >
                      <div>
                        <p className="font-medium">
                          {emargement.contact?.prenom} {emargement.contact?.nom}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {emargement.session?.nom} • {format(parseISO(emargement.date_emargement), "dd/MM/yyyy", { locale: fr })} ({emargement.periode})
                        </p>
                      </div>
                      <Badge variant="secondary">
                        Non signé
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Fiche apprenant V2 */}
      <ApprenantDetailSheet
        contactId={selectedContactId}
        open={!!selectedContactId}
        onOpenChange={(open) => {
          if (!open) setSelectedContactId(null);
        }}
        onEdit={() => {}}
      />
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
      <div className="flex items-center gap-2">
        <Badge variant="outline">{session.formation_type || "Formation"}</Badge>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}
