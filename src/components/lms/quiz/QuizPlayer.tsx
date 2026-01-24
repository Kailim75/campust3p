import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  LmsQuiz, 
  LmsQuestion, 
  useLmsQuizQuestions, 
  useSubmitQuizAttempt,
  QuestionAnswer,
  AttemptAnswer
} from "@/hooks/useLmsQuizzes";
import { cn } from "@/lib/utils";
import { fixEncoding } from "@/lib/fix-encoding";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  AlertCircle,
  Trophy,
  RotateCcw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface QuizPlayerProps {
  quiz: LmsQuiz;
  contactId: string;
  attemptNumber: number;
  onComplete: (passed: boolean, score: number) => void;
  onCancel: () => void;
}

interface UserAnswer {
  questionId: string;
  selectedIds: string[];
}

export function QuizPlayer({ 
  quiz, 
  contactId, 
  attemptNumber, 
  onComplete, 
  onCancel 
}: QuizPlayerProps) {
  const { data: allQuestions, isLoading } = useLmsQuizQuestions(quiz.id);
  const submitAttempt = useSubmitQuizAttempt();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(
    quiz.temps_limite_min ? quiz.temps_limite_min * 60 : null
  );
  const [startTime] = useState(new Date());
  const [showResults, setShowResults] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Shuffle and limit questions
  const questions = useMemo(() => {
    if (!allQuestions) return [];
    let qs = [...allQuestions];
    if (quiz.melanger_questions) {
      qs = qs.sort(() => Math.random() - 0.5);
    }
    return qs.slice(0, quiz.nb_questions);
  }, [allQuestions, quiz.melanger_questions, quiz.nb_questions]);

  // Timer
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || showResults) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, showResults]);

  const currentQuestion = questions[currentIndex];
  const currentAnswer = userAnswers.find((a) => a.questionId === currentQuestion?.id);

  const handleSelectAnswer = (answerId: string) => {
    if (showResults) return;

    const isMulti = currentQuestion.type === "qcm_multi";
    
    setUserAnswers((prev) => {
      const existing = prev.find((a) => a.questionId === currentQuestion.id);
      
      if (isMulti) {
        if (existing) {
          const newSelectedIds = existing.selectedIds.includes(answerId)
            ? existing.selectedIds.filter((id) => id !== answerId)
            : [...existing.selectedIds, answerId];
          return prev.map((a) =>
            a.questionId === currentQuestion.id
              ? { ...a, selectedIds: newSelectedIds }
              : a
          );
        } else {
          return [...prev, { questionId: currentQuestion.id, selectedIds: [answerId] }];
        }
      } else {
        if (existing) {
          return prev.map((a) =>
            a.questionId === currentQuestion.id
              ? { ...a, selectedIds: [answerId] }
              : a
          );
        } else {
          return [...prev, { questionId: currentQuestion.id, selectedIds: [answerId] }];
        }
      }
    });
  };

  const calculateResults = () => {
    let totalPoints = 0;
    let earnedPoints = 0;
    const details: AttemptAnswer[] = [];

    questions.forEach((q) => {
      totalPoints += q.points;
      const userAnswer = userAnswers.find((a) => a.questionId === q.id);
      const correctIds = (q.reponses as unknown as QuestionAnswer[])
        .filter((r) => r.is_correct)
        .map((r) => r.id);
      
      const selectedIds = userAnswer?.selectedIds || [];
      const isCorrect =
        correctIds.length === selectedIds.length &&
        correctIds.every((id) => selectedIds.includes(id));

      if (isCorrect) {
        earnedPoints += q.points;
      }

      details.push({
        question_id: q.id,
        selected_ids: selectedIds,
        is_correct: isCorrect,
        points_earned: isCorrect ? q.points : 0,
      });
    });

    const scorePct = Math.round((earnedPoints / totalPoints) * 100);
    const passed = scorePct >= quiz.seuil_reussite_pct;

    return {
      scorePct,
      nbCorrect: details.filter((d) => d.is_correct).length,
      nbTotal: questions.length,
      passed,
      details,
    };
  };

  const handleSubmit = async () => {
    if (submitted) return;
    setSubmitted(true);

    const endTime = new Date();
    const timePassed = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
    const results = calculateResults();

    await submitAttempt.mutateAsync({
      contact_id: contactId,
      quiz_id: quiz.id,
      tentative_numero: attemptNumber,
      score_pct: results.scorePct,
      nb_correct: results.nbCorrect,
      nb_total: results.nbTotal,
      temps_passe_sec: timePassed,
      reponses_detail: results.details,
      reussi: results.passed,
      started_at: startTime.toISOString(),
      completed_at: endTime.toISOString(),
    });

    setShowResults(true);
    onComplete(results.passed, results.scorePct);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const answeredCount = userAnswers.length;
  const progress = (answeredCount / questions.length) * 100;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Aucune question disponible pour ce quiz.</p>
        </CardContent>
      </Card>
    );
  }

  if (showResults && quiz.afficher_correction) {
    const results = calculateResults();
    return <QuizResults quiz={quiz} questions={questions} results={results} userAnswers={userAnswers} onRetry={onCancel} />;
  }

  if (showResults) {
    const results = calculateResults();
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-6">
          {results.passed ? (
            <Trophy className="h-16 w-16 mx-auto text-primary" />
          ) : (
            <XCircle className="h-16 w-16 mx-auto text-destructive" />
          )}
          <div>
            <h2 className="text-2xl font-bold mb-2">
              {results.passed ? "Félicitations !" : "Dommage..."}
            </h2>
            <p className="text-muted-foreground">
              Vous avez obtenu {results.scorePct}% ({results.nbCorrect}/{results.nbTotal} bonnes réponses)
            </p>
            <p className="text-sm mt-2">
              Seuil de réussite : {quiz.seuil_reussite_pct}%
            </p>
          </div>
          <Button onClick={onCancel}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with progress and timer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant="outline">
            Question {currentIndex + 1} / {questions.length}
          </Badge>
          <Badge variant="secondary">
            {answeredCount} répondue{answeredCount > 1 ? "s" : ""}
          </Badge>
        </div>
        {timeLeft !== null && (
          <Badge
            variant={timeLeft < 60 ? "destructive" : "outline"}
            className="text-lg px-3 py-1"
          >
            <Clock className="h-4 w-4 mr-2" />
            {formatTime(timeLeft)}
          </Badge>
        )}
      </div>

      <Progress value={progress} className="h-2" />

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <CardTitle className="text-lg font-medium leading-relaxed">
                  {fixEncoding(currentQuestion.enonce)}
                </CardTitle>
                <Badge variant="outline" className="shrink-0">
                  {currentQuestion.points} pt{currentQuestion.points > 1 ? "s" : ""}
                </Badge>
              </div>
              {currentQuestion.type === "qcm_multi" && (
                <p className="text-sm text-muted-foreground">
                  Plusieurs réponses possibles
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {(currentQuestion.reponses as unknown as QuestionAnswer[]).map((answer, idx) => {
                const isSelected = currentAnswer?.selectedIds.includes(answer.id);
                return (
                  <button
                    key={answer.id}
                    type="button"
                    onClick={() => handleSelectAnswer(answer.id)}
                    className={cn(
                      "w-full text-left p-4 rounded-lg border transition-all",
                      "hover:border-primary hover:bg-primary/5",
                      isSelected
                        ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                        : "border-border"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="pt-0.5">{fixEncoding(answer.texte)}</span>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Précédent
        </Button>

        <div className="flex gap-1">
          {questions.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={cn(
                "w-8 h-8 rounded text-sm font-medium transition-colors",
                idx === currentIndex
                  ? "bg-primary text-primary-foreground"
                  : userAnswers.find((a) => a.questionId === questions[idx].id)
                  ? "bg-primary/20 text-primary"
                  : "bg-muted hover:bg-muted/80"
              )}
            >
              {idx + 1}
            </button>
          ))}
        </div>

        {currentIndex === questions.length - 1 ? (
          <Button onClick={handleSubmit} disabled={submitAttempt.isPending}>
            Terminer
          </Button>
        ) : (
          <Button
            onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
          >
            Suivant
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>

      <div className="text-center">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Annuler le quiz
        </Button>
      </div>
    </div>
  );
}

interface QuizResultsProps {
  quiz: LmsQuiz;
  questions: LmsQuestion[];
  results: ReturnType<typeof calculateResults>;
  userAnswers: UserAnswer[];
  onRetry: () => void;
}

function QuizResults({ quiz, questions, results, userAnswers, onRetry }: QuizResultsProps) {
  return (
    <div className="space-y-6">
      {/* Score summary */}
      <Card className={results.passed ? "border-primary" : "border-destructive"}>
        <CardContent className="py-8 text-center space-y-4">
          {results.passed ? (
            <Trophy className="h-16 w-16 mx-auto text-primary" />
          ) : (
            <XCircle className="h-16 w-16 mx-auto text-destructive" />
          )}
          <div>
            <h2 className="text-3xl font-bold mb-2">{results.scorePct}%</h2>
            <p className="text-muted-foreground">
              {results.nbCorrect} / {results.nbTotal} bonnes réponses
            </p>
            <Badge variant={results.passed ? "default" : "destructive"} className="mt-2">
              {results.passed ? "Réussi" : "Non réussi"} (seuil: {quiz.seuil_reussite_pct}%)
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Detailed correction */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Correction détaillée</h3>
        {questions.map((question, idx) => {
          const detail = results.details.find((d) => d.question_id === question.id);
          const userAnswer = userAnswers.find((a) => a.questionId === question.id);
          const isCorrect = detail?.is_correct;

          return (
            <Card key={question.id} className={isCorrect ? "border-primary/50" : "border-destructive/50"}>
              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  {isCorrect ? (
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-medium">Question {idx + 1}</p>
                    <p className="text-muted-foreground">{fixEncoding(question.enonce)}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {(question.reponses as QuestionAnswer[]).map((answer) => {
                  const wasSelected = userAnswer?.selectedIds.includes(answer.id);
                  return (
                    <div
                      key={answer.id}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded text-sm",
                        answer.is_correct && "bg-primary/10",
                        wasSelected && !answer.is_correct && "bg-destructive/10"
                      )}
                    >
                      {answer.is_correct ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : wasSelected ? (
                        <XCircle className="h-4 w-4 text-destructive" />
                      ) : (
                        <div className="w-4 h-4" />
                      )}
                      <span>{fixEncoding(answer.texte)}</span>
                      {wasSelected && <Badge variant="outline" className="ml-auto text-xs">Votre réponse</Badge>}
                    </div>
                  );
                })}
                {question.explication && (
                  <div className="mt-3 p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-1">Explication :</p>
                    <p className="text-sm text-muted-foreground">{fixEncoding(question.explication)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="text-center">
        <Button onClick={onRetry}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Retour aux quiz
        </Button>
      </div>
    </div>
  );
}

function calculateResults() {
  return {
    scorePct: 0,
    nbCorrect: 0,
    nbTotal: 0,
    passed: false,
    details: [] as AttemptAnswer[],
  };
}
