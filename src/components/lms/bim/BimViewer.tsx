import { Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Html, useGLTF } from "@react-three/drei";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Box,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize,
  Info,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { BimScene, QuestionContextuelle } from "@/hooks/useBimScenes";

interface BimViewerProps {
  scene: BimScene;
  onComplete?: (score: number, answers: Record<string, number>) => void;
  readOnly?: boolean;
}

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} scale={1} />;
}

function LoadingFallback() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <Box className="h-8 w-8 animate-pulse" />
        <span className="text-sm">Chargement du modèle 3D...</span>
      </div>
    </Html>
  );
}

export function BimViewer({ scene, onComplete, readOnly = false }: BimViewerProps) {
  const questions = Array.isArray(scene.questions_contextuelles)
    ? (scene.questions_contextuelles as unknown as QuestionContextuelle[])
    : [];

  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);

  const currentQuestion = questions[currentQuestionIdx];
  const hasQuestions = questions.length > 0;
  const progress = hasQuestions
    ? Math.round((Object.keys(answers).length / questions.length) * 100)
    : 0;

  const handleAnswer = (optionIdx: number) => {
    if (!currentQuestion || readOnly) return;

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionIdx,
    }));

    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx((prev) => prev + 1);
    } else {
      setShowResults(true);
      // Calculate score
      const score = questions.reduce((acc, q) => {
        const userAnswer = answers[q.id] ?? optionIdx;
        return acc + (userAnswer === q.reponse_correcte ? (q.points || 1) : 0);
      }, 0);
      const maxScore = questions.reduce((acc, q) => acc + (q.points || 1), 0);
      const scorePct = Math.round((score / maxScore) * 100);
      onComplete?.(scorePct, { ...answers, [currentQuestion.id]: optionIdx });
    }
  };

  const resetQuiz = () => {
    setCurrentQuestionIdx(0);
    setAnswers({});
    setShowResults(false);
  };

  return (
    <div className="space-y-4">
      {/* 3D Viewer */}
      <Card className="overflow-hidden">
        <div className="relative h-[400px] bg-muted/30">
          {scene.fichier_3d_url ? (
            <Canvas camera={{ position: [5, 5, 5], fov: 50 }}>
              <ambientLight intensity={0.5} />
              <directionalLight position={[10, 10, 5]} intensity={1} />
              <Suspense fallback={<LoadingFallback />}>
                <Model url={scene.fichier_3d_url} />
                <Environment preset="city" />
              </Suspense>
              <OrbitControls enablePan enableZoom enableRotate />
            </Canvas>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Box className="h-16 w-16 mx-auto mb-2 opacity-30" />
                <p>Aucun modèle 3D configuré</p>
              </div>
            </div>
          )}

          {/* Controls overlay */}
          <div className="absolute bottom-4 right-4 flex gap-2">
            <Button variant="secondary" size="icon" className="h-8 w-8">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon" className="h-8 w-8">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon" className="h-8 w-8">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Scene info */}
      {scene.consignes && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3 flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5" />
            <p className="text-sm">{scene.consignes}</p>
          </CardContent>
        </Card>
      )}

      {/* Questions */}
      {hasQuestions && !readOnly && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Questions contextuelles
              </CardTitle>
              <Badge variant="outline">
                {Object.keys(answers).length} / {questions.length}
              </Badge>
            </div>
            <Progress value={progress} className="h-2" />
          </CardHeader>
          <CardContent>
            {showResults ? (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <CheckCircle className="h-12 w-12 mx-auto text-success mb-2" />
                  <p className="font-semibold">Évaluation terminée !</p>
                </div>
                <div className="space-y-2">
                  {questions.map((q, idx) => {
                    const userAnswer = answers[q.id];
                    const isCorrect = userAnswer === q.reponse_correcte;
                    return (
                      <div
                        key={q.id}
                        className={`p-3 rounded-lg border ${
                          isCorrect ? "bg-success/10 border-success/30" : "bg-destructive/10 border-destructive/30"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {isCorrect ? (
                            <CheckCircle className="h-4 w-4 text-success mt-0.5" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-medium">Q{idx + 1}: {q.question}</p>
                            {q.explication && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {q.explication}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Button onClick={resetQuiz} variant="outline" className="w-full">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Recommencer
                </Button>
              </div>
            ) : currentQuestion ? (
              <div className="space-y-4">
                <div>
                  <p className="font-medium">{currentQuestion.question}</p>
                  {currentQuestion.theme_t3p && (
                    <Badge variant="secondary" className="mt-2 text-xs">
                      {currentQuestion.theme_t3p}
                    </Badge>
                  )}
                </div>
                <div className="space-y-2">
                  {currentQuestion.options.map((option, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      className="w-full justify-start text-left h-auto py-3"
                      onClick={() => handleAnswer(idx)}
                    >
                      <span className="font-medium mr-2">{String.fromCharCode(65 + idx)}.</span>
                      {option}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
