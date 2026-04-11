import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ClipboardCheck,
  Play,
  Trophy,
  XCircle,
  Clock,
  RotateCcw,
  ChevronRight,
  ListChecks,
} from "lucide-react";
import {
  useLmsQuizzes,
  useLmsQuizAttempts,
  LmsQuiz,
  type LmsQuizAttempt,
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
import { fixEncoding } from "@/lib/fix-encoding";

interface ContactQuizSectionProps {
  contactId: string;
  contactName: string;
}

export function ContactQuizSection({ contactId, contactName }: ContactQuizSectionProps) {
  const { data: quizzes = [], isLoading: quizzesLoading } = useLmsQuizzes();
  const { data: attempts = [], isLoading: attemptsLoading } = useLmsQuizAttempts(undefined, contactId);
  
  const [selectedQuiz, setSelectedQuiz] = useState<LmsQuiz | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);

  const isLoading = quizzesLoading || attemptsLoading;

  const activeQuizzes = useMemo(() => quizzes.filter((q) => q.actif), [quizzes]);
  const attemptsByQuiz = useMemo(() => {
    const grouped = new Map<string, LmsQuizAttempt[]>();
    attempts.forEach((attempt) => {
      const existing = grouped.get(attempt.quiz_id) ?? [];
      existing.push(attempt);
      grouped.set(attempt.quiz_id, existing);
    });
    return grouped;
  }, [attempts]);

  const passedQuizCount = useMemo(
    () => activeQuizzes.filter((quiz) => (attemptsByQuiz.get(quiz.id) ?? []).some((attempt) => attempt.reussi)).length,
    [activeQuizzes, attemptsByQuiz]
  );

  const averageScore = useMemo(() => {
    if (attempts.length === 0) return 0;
    return Math.round(attempts.reduce((sum, attempt) => sum + (attempt.score_pct || 0), 0) / attempts.length);
  }, [attempts]);

  // Get attempt info for each quiz
  const getQuizAttemptInfo = (quizId: string) => {
    const quizAttempts = attemptsByQuiz.get(quizId) ?? [];
    const lastAttempt = quizAttempts[0];
    const bestAttempt = quizAttempts.reduce<LmsQuizAttempt | null>((best, current) => {
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

  const handleStartQuiz = (quiz: LmsQuiz) => {
    setSelectedQuiz(quiz);
    setShowPlayer(true);
  };

  const handleQuizComplete = () => {
    // Quiz completed - player shows results
  };

  const handleClosePlayer = () => {
    setShowPlayer(false);
    setSelectedQuiz(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-dashed">
        <CardContent className="p-4 space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              <p className="font-medium">Quiz & évaluations</p>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Suis ici les quiz disponibles pour {contactName}, les tentatives déjà réalisées et les résultats obtenus.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-lg border bg-muted/30 px-3 py-3">
              <p className="text-xs text-muted-foreground">Quiz actifs</p>
              <p className="mt-1 text-lg font-semibold">{activeQuizzes.length}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 px-3 py-3">
              <p className="text-xs text-muted-foreground">Quiz réussis</p>
              <p className="mt-1 text-lg font-semibold">{passedQuizCount}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 px-3 py-3">
              <p className="text-xs text-muted-foreground">Tentatives</p>
              <p className="mt-1 text-lg font-semibold">{attempts.length}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 px-3 py-3">
              <p className="text-xs text-muted-foreground">Score moyen</p>
              <p className="mt-1 text-lg font-semibold">{averageScore}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quiz disponibles */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5" />
          Quiz disponibles
        </h3>

        {activeQuizzes.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="Aucun quiz disponible"
            description="Les quiz créés dans l'espace E-Learning apparaîtront ici."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {activeQuizzes.map((quiz) => {
              const attemptInfo = getQuizAttemptInfo(quiz.id);
              const canRetry = !quiz.tentatives_max || attemptInfo.attemptCount < quiz.tentatives_max;
              
              return (
                <Card key={quiz.id} className="relative overflow-hidden">
                  {attemptInfo.passed && (
                    <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
                      <div className="absolute top-3 right-[-20px] transform rotate-45 bg-success text-success-foreground text-xs py-1 px-6">
                        Réussi
                      </div>
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{fixEncoding(quiz.titre)}</CardTitle>
                      <Badge variant="outline">
                        {quiz.nb_questions} Q
                      </Badge>
                    </div>
                    {quiz.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {fixEncoding(quiz.description)}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Quiz info */}
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Trophy className="h-3 w-3" />
                        Seuil: {quiz.seuil_reussite_pct}%
                      </span>
                      {quiz.temps_limite_min && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {quiz.temps_limite_min} min
                        </span>
                      )}
                      {quiz.tentatives_max && (
                        <span>
                          Max {quiz.tentatives_max} tentative{quiz.tentatives_max > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>

                    {/* Attempt history */}
                    {attemptInfo.attemptCount > 0 && (
                      <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-medium">Historique</span>
                          <span className="text-muted-foreground">
                            {attemptInfo.attemptCount} tentative{attemptInfo.attemptCount > 1 ? "s" : ""}
                          </span>
                        </div>
                        {attemptInfo.bestAttempt && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Meilleur score:</span>
                            <Badge variant={attemptInfo.bestAttempt.reussi ? "default" : "secondary"}>
                              {attemptInfo.bestAttempt.score_pct}%
                            </Badge>
                          </div>
                        )}
                        {attemptInfo.lastAttempt && (
                          <div className="text-xs text-muted-foreground">
                            Dernière tentative: {attemptInfo.lastAttempt.completed_at
                              ? format(new Date(attemptInfo.lastAttempt.completed_at), "dd MMM yyyy à HH:mm", { locale: fr })
                              : "En cours"}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action button */}
                    <Button
                      className="w-full"
                      onClick={() => handleStartQuiz(quiz)}
                      disabled={!canRetry}
                      variant={attemptInfo.passed ? "outline" : "default"}
                    >
                      {attemptInfo.attemptCount === 0 ? (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Commencer le quiz
                        </>
                      ) : canRetry ? (
                        <>
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Retenter
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 mr-2" />
                          Tentatives épuisées
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Historique des tentatives */}
      {attempts.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Historique des résultats</h3>
          <div className="space-y-2">
            {attempts.slice(0, 10).map((attempt) => {
              const quiz = quizzes.find((q) => q.id === attempt.quiz_id);
              return (
                <div
                  key={attempt.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-card"
                >
                  <div className="flex items-center gap-3">
                    {attempt.reussi ? (
                      <Trophy className="h-5 w-5 text-success" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )}
                    <div>
                      <p className="font-medium text-sm">{fixEncoding(quiz?.titre) || "Quiz supprimé"}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(attempt.completed_at), "dd MMM yyyy à HH:mm", { locale: fr })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold">{attempt.score_pct}%</p>
                      <p className="text-xs text-muted-foreground">
                        {attempt.nb_correct}/{attempt.nb_total}
                      </p>
                    </div>
                    <Badge variant={attempt.reussi ? "default" : "secondary"}>
                      {attempt.reussi ? "Réussi" : "Échoué"}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quiz Player Dialog */}
      <Dialog open={showPlayer} onOpenChange={setShowPlayer}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedQuiz?.titre}</DialogTitle>
            <DialogDescription>
              Répondez aux questions pour valider ce quiz. Seuil de réussite: {selectedQuiz?.seuil_reussite_pct}%
            </DialogDescription>
          </DialogHeader>
          {selectedQuiz && (
            <QuizPlayer
              quiz={selectedQuiz}
              contactId={contactId}
              attemptNumber={((attemptsByQuiz.get(selectedQuiz.id) ?? []).length) + 1}
              onComplete={handleQuizComplete}
              onCancel={handleClosePlayer}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
