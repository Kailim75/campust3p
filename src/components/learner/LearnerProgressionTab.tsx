import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  BookOpen,
  Award,
  Target,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";

interface LearnerProgressionTabProps {
  contactId: string;
  contactFormation?: string;
}

export function LearnerProgressionTab({
  contactId,
  contactFormation,
}: LearnerProgressionTabProps) {
  // Fetch session inscriptions
  const { data: inscriptions = [], isLoading: loadingInsc } = useQuery({
    queryKey: ["learner-inscriptions", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_inscriptions")
        .select(`
          *,
          session:sessions(
            id, nom, formation_type, date_debut, date_fin, statut, lieu
          )
        `)
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!contactId,
  });

  // Fetch emargements stats
  const { data: emargementStats, isLoading: loadingEmarg } = useQuery({
    queryKey: ["learner-emargement-stats", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("emargements")
        .select("id, present, signature_data")
        .eq("contact_id", contactId);

      if (error) throw error;

      const total = data?.length || 0;
      const signed = data?.filter((e) => e.signature_data).length || 0;
      const present = data?.filter((e) => e.present).length || 0;

      return {
        total,
        signed,
        present,
        percentage: total > 0 ? Math.round((signed / total) * 100) : 0,
      };
    },
    enabled: !!contactId,
  });

  // Fetch quiz attempts
  const { data: quizStats, isLoading: loadingQuiz } = useQuery({
    queryKey: ["learner-quiz-stats", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lms_quiz_attempts")
        .select("id, quiz_id, score_pct, reussi")
        .eq("contact_id", contactId);

      if (error) throw error;

      const attempts = data || [];
      const quizIds = [...new Set(attempts.map((a) => a.quiz_id))];
      const passed = quizIds.filter((qid) =>
        attempts.some((a) => a.quiz_id === qid && a.reussi)
      ).length;

      const avgScore =
        attempts.length > 0
          ? Math.round(
              attempts.reduce((sum, a) => sum + (a.score_pct || 0), 0) /
                attempts.length
            )
          : 0;

      return {
        totalAttempts: attempts.length,
        uniqueQuizzes: quizIds.length,
        passed,
        avgScore,
      };
    },
    enabled: !!contactId,
  });

  // Fetch certificates
  const { data: certificates = [], isLoading: loadingCerts } = useQuery({
    queryKey: ["learner-certs-count", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attestation_certificates")
        .select("id, type_attestation")
        .eq("contact_id", contactId)
        .eq("status", "generated");

      if (error) throw error;
      return data || [];
    },
    enabled: !!contactId,
  });

  const isLoading = loadingInsc || loadingEmarg || loadingQuiz || loadingCerts;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  // Calculate overall progression
  const activeSession = inscriptions.find(
    (i: any) => i.session?.statut === "en_cours"
  );
  const completedSessions = inscriptions.filter(
    (i: any) => i.session?.statut === "terminee"
  ).length;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <TrendingUp className="h-5 w-5" />
        Ma progression
      </h2>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inscriptions.length}</p>
                <p className="text-sm text-muted-foreground">Session(s)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10 text-success">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{emargementStats?.percentage || 0}%</p>
                <p className="text-sm text-muted-foreground">Présence signée</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {quizStats?.passed || 0}/{quizStats?.uniqueQuizzes || 0}
                </p>
                <p className="text-sm text-muted-foreground">Quiz réussis</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary text-secondary-foreground">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{certificates.length}</p>
                <p className="text-sm text-muted-foreground">Attestation(s)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Session */}
      {activeSession && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Session en cours
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="font-medium">{activeSession.session?.nom}</p>
              <Badge variant="outline" className="mt-1">
                {activeSession.session?.formation_type}
              </Badge>
            </div>
            <div className="grid gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {format(new Date(activeSession.session?.date_debut), "d MMMM", { locale: fr })} -{" "}
                {format(new Date(activeSession.session?.date_fin), "d MMMM yyyy", { locale: fr })}
              </div>
              {(activeSession.session as any)?.lieu && (
                <p>📍 {(activeSession.session as any).lieu}</p>
              )}
            </div>

            {/* Session progress */}
            {(() => {
              const start = new Date(activeSession.session?.date_debut);
              const end = new Date(activeSession.session?.date_fin);
              const now = new Date();
              const totalDays = differenceInDays(end, start) + 1;
              const elapsed = differenceInDays(now, start) + 1;
              const progress = Math.min(100, Math.max(0, Math.round((elapsed / totalDays) * 100)));

              return (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progression temporelle</span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Sessions History */}
      {inscriptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historique des sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {inscriptions.map((insc: any) => {
                const session = insc.session;
                if (!session) return null;

                const isCompleted = session.statut === "terminee";
                const isCurrent = session.statut === "en_cours";
                const isUpcoming = session.statut === "planifiee";

                return (
                  <div
                    key={insc.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{session.nom}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(session.date_debut), "d MMM", { locale: fr })} -{" "}
                        {format(new Date(session.date_fin), "d MMM yyyy", { locale: fr })}
                      </div>
                    </div>
                    <Badge
                      variant={
                        isCompleted
                          ? "default"
                          : isCurrent
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {isCompleted && <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {isCompleted ? "Terminée" : isCurrent ? "En cours" : "À venir"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {inscriptions.length === 0 && (
        <EmptyState
          icon={BookOpen}
          title="Aucune session"
          description="Vous n'êtes inscrit à aucune session pour le moment."
        />
      )}
    </div>
  );
}
