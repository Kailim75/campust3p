import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  GraduationCap,
  ClipboardCheck,
  Trophy,
  Clock,
  Play,
  RotateCcw,
  XCircle,
  CheckCircle2,
  BookOpen,
  ArrowLeft,
  User,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  useLmsQuizzes,
  useLmsQuizAttempts,
  LmsQuiz,
} from "@/hooks/useLmsQuizzes";
import { QuizPlayer } from "@/components/lms/quiz/QuizPlayer";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// Hook to get contact by token
function useContactByToken(token: string | null) {
  return useQuery({
    queryKey: ["learner-contact", token],
    queryFn: async () => {
      if (!token) return null;
      
      // Use secure RPC function to validate token (bypasses RLS for anonymous access)
      const { data, error } = await supabase
        .rpc("validate_learner_portal_token", { p_token: token });

      if (error) throw error;
      
      // The function returns an array, get first element
      const tokenData = Array.isArray(data) ? data[0] : data;
      
      if (!tokenData) {
        throw new Error("Lien invalide ou expiré");
      }
      
      if (new Date(tokenData.expire_at) < new Date()) {
        throw new Error("Ce lien a expiré");
      }

      // Return contact info from RPC result
      return {
        id: tokenData.contact_id,
        prenom: tokenData.contact_prenom,
        nom: tokenData.contact_nom,
        formation: tokenData.contact_formation,
      };
    },
    enabled: !!token,
    retry: false,
  });
}

export default function LearnerPortal() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  
  const { data: contact, isLoading: contactLoading, error: contactError } = useContactByToken(token);
  const { data: quizzes = [], isLoading: quizzesLoading } = useLmsQuizzes();
  const { data: attempts = [], isLoading: attemptsLoading } = useLmsQuizAttempts(undefined, contact?.id);
  
  const [selectedQuiz, setSelectedQuiz] = useState<LmsQuiz | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);

  const isLoading = contactLoading || quizzesLoading || attemptsLoading;

  // Get attempt info for each quiz
  const getQuizAttemptInfo = (quizId: string) => {
    const quizAttempts = attempts.filter((a: any) => a.quiz_id === quizId);
    const lastAttempt = quizAttempts[0];
    const bestAttempt = quizAttempts.reduce((best: any, current: any) => {
      if (!best || current.score_pct > best.score_pct) return current;
      return best;
    }, null);
    return {
      attemptCount: quizAttempts.length,
      lastAttempt,
      bestAttempt,
      passed: quizAttempts.some((a: any) => a.reussi),
    };
  };

  // Calculate global progress
  const calculateProgress = () => {
    if (quizzes.length === 0) return { completed: 0, total: 0, percentage: 0 };
    const activeQuizzes = quizzes.filter((q) => q.actif);
    const completedQuizzes = activeQuizzes.filter((q) => {
      const info = getQuizAttemptInfo(q.id);
      return info.passed;
    });
    const percentage = Math.round((completedQuizzes.length / activeQuizzes.length) * 100);
    return {
      completed: completedQuizzes.length,
      total: activeQuizzes.length,
      percentage: isNaN(percentage) ? 0 : percentage,
    };
  };

  const progress = calculateProgress();

  const handleStartQuiz = (quiz: LmsQuiz) => {
    setSelectedQuiz(quiz);
    setShowPlayer(true);
  };

  const handleQuizComplete = () => {
    // Handled in player
  };

  const handleClosePlayer = () => {
    setShowPlayer(false);
    setSelectedQuiz(null);
  };

  // Error state
  if (contactError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-6 space-y-4">
            <XCircle className="h-16 w-16 mx-auto text-destructive" />
            <h1 className="text-2xl font-bold">Accès refusé</h1>
            <p className="text-muted-foreground">
              {(contactError as Error).message || "Lien invalide ou expiré."}
            </p>
            <p className="text-sm text-muted-foreground">
              Contactez votre centre de formation pour obtenir un nouveau lien d'accès.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-32 w-full" />
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // No token
  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-6 space-y-4">
            <BookOpen className="h-16 w-16 mx-auto text-muted-foreground" />
            <h1 className="text-2xl font-bold">Portail Apprenant</h1>
            <p className="text-muted-foreground">
              Utilisez le lien personnalisé envoyé par votre centre de formation pour accéder à vos quiz.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeQuizzes = quizzes.filter((q) => q.actif);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Portail E-Learning</h1>
              <p className="text-sm text-muted-foreground">
                Bienvenue, {contact?.prenom} {contact?.nom}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="hidden sm:flex">
            <User className="h-3 w-3 mr-1" />
            {contact?.formation || "Stagiaire"}
          </Badge>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Progress Card */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Votre progression
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {progress.completed} / {progress.total} quiz réussis
              </span>
              <span className="text-2xl font-bold text-primary">{progress.percentage}%</span>
            </div>
            <Progress value={progress.percentage} className="h-3" />
            {progress.percentage === 100 && (
              <div className="flex items-center gap-2 text-success">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Félicitations ! Tous les quiz sont validés.</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quizzes */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Quiz disponibles
          </h2>

          {activeQuizzes.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="Aucun quiz disponible"
              description="Votre centre de formation n'a pas encore ajouté de quiz."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {activeQuizzes.map((quiz) => {
                const attemptInfo = getQuizAttemptInfo(quiz.id);
                const canRetry = !quiz.tentatives_max || attemptInfo.attemptCount < quiz.tentatives_max;
                
                return (
                  <Card
                    key={quiz.id}
                    className={`relative overflow-hidden transition-shadow hover:shadow-lg ${
                      attemptInfo.passed ? "border-success/50" : ""
                    }`}
                  >
                    {attemptInfo.passed && (
                      <div className="absolute top-0 right-0 w-20 h-20 overflow-hidden">
                        <div className="absolute top-4 right-[-24px] transform rotate-45 bg-success text-success-foreground text-xs py-1 px-8">
                          Réussi
                        </div>
                      </div>
                    )}
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{quiz.titre}</CardTitle>
                      {quiz.description && (
                        <CardDescription className="line-clamp-2">
                          {quiz.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Quiz info */}
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <ClipboardCheck className="h-4 w-4" />
                          {quiz.nb_questions} questions
                        </span>
                        <span className="flex items-center gap-1">
                          <Trophy className="h-4 w-4" />
                          Seuil: {quiz.seuil_reussite_pct}%
                        </span>
                        {quiz.temps_limite_min && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {quiz.temps_limite_min} min
                          </span>
                        )}
                      </div>

                      {/* Attempt history */}
                      {attemptInfo.attemptCount > 0 && (
                        <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-sm">Vos résultats</span>
                            <span className="text-sm text-muted-foreground">
                              {attemptInfo.attemptCount} tentative{attemptInfo.attemptCount > 1 ? "s" : ""}
                            </span>
                          </div>
                          {attemptInfo.bestAttempt && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Meilleur score:</span>
                              <Badge variant={attemptInfo.bestAttempt.reussi ? "default" : "secondary"}>
                                {attemptInfo.bestAttempt.score_pct}%
                              </Badge>
                            </div>
                          )}
                          {attemptInfo.lastAttempt && (
                            <div className="text-xs text-muted-foreground">
                              Dernière tentative: {format(new Date(attemptInfo.lastAttempt.completed_at), "dd MMM yyyy à HH:mm", { locale: fr })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Retry limit warning */}
                      {quiz.tentatives_max && attemptInfo.attemptCount >= quiz.tentatives_max && !attemptInfo.passed && (
                        <div className="flex items-center gap-2 text-destructive text-sm">
                          <XCircle className="h-4 w-4" />
                          Tentatives épuisées ({quiz.tentatives_max} max)
                        </div>
                      )}

                      {/* Action button */}
                      <Button
                        className="w-full"
                        size="lg"
                        onClick={() => handleStartQuiz(quiz)}
                        disabled={!canRetry}
                        variant={attemptInfo.passed ? "outline" : "default"}
                      >
                        {attemptInfo.attemptCount === 0 ? (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Commencer
                          </>
                        ) : canRetry ? (
                          <>
                            <RotateCcw className="h-4 w-4 mr-2" />
                            {attemptInfo.passed ? "Repasser" : "Réessayer"}
                          </>
                        ) : (
                          "Non disponible"
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent attempts */}
        {attempts.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Historique récent</h2>
            <div className="space-y-2">
              {attempts.slice(0, 5).map((attempt: any) => {
                const quiz = quizzes.find((q) => q.id === attempt.quiz_id);
                return (
                  <div
                    key={attempt.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-card"
                  >
                    <div className="flex items-center gap-3">
                      {attempt.reussi ? (
                        <CheckCircle2 className="h-6 w-6 text-success" />
                      ) : (
                        <XCircle className="h-6 w-6 text-destructive" />
                      )}
                      <div>
                        <p className="font-medium">{quiz?.titre || "Quiz"}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(attempt.completed_at), "dd MMMM yyyy à HH:mm", { locale: fr })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{attempt.score_pct}%</p>
                      <p className="text-sm text-muted-foreground">
                        {attempt.nb_correct}/{attempt.nb_total} correct{attempt.nb_correct > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Quiz Player Dialog */}
      <Dialog open={showPlayer} onOpenChange={setShowPlayer}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedQuiz?.titre}</DialogTitle>
            <DialogDescription>
              Répondez aux questions pour valider ce quiz. Seuil de réussite: {selectedQuiz?.seuil_reussite_pct}%
            </DialogDescription>
          </DialogHeader>
          {selectedQuiz && contact && (
            <QuizPlayer
              quiz={selectedQuiz}
              contactId={contact.id}
              attemptNumber={(attempts.filter((a: any) => a.quiz_id === selectedQuiz.id).length) + 1}
              onComplete={handleQuizComplete}
              onCancel={handleClosePlayer}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
