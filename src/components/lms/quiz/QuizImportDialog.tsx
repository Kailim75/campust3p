import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLmsQuizMutations, useLmsQuestionMutations } from "@/hooks/useLmsQuizzes";
import { readQuizFile, generateQuizTemplate, ParsedQuizData } from "@/lib/quiz-import-export";
import { 
  Upload, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  FileQuestion
} from "lucide-react";
import { toast } from "sonner";

interface QuizImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function QuizImportDialog({ open, onOpenChange, onSuccess }: QuizImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedQuizData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { createQuiz } = useLmsQuizMutations();
  const { createQuestion } = useLmsQuestionMutations();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setIsLoading(true);

    try {
      const data = await readQuizFile(selectedFile);
      setParsedData(data);
      
      if (data.quizzes.size === 0) {
        setError("Aucun quiz valide trouvé dans le fichier. Vérifiez le format.");
      }
    } catch (err) {
      setError("Erreur lors de la lecture du fichier. Vérifiez le format.");
      setParsedData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const csv = generateQuizTemplate();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modele_import_quiz.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Modèle téléchargé");
  };

  const handleImport = async () => {
    if (!parsedData || parsedData.quizzes.size === 0) return;

    setIsImporting(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const [, quizData] of parsedData.quizzes) {
        // Create quiz
        const quizResult = await createQuiz.mutateAsync({
          titre: quizData.titre,
          description: quizData.description,
          nb_questions: quizData.nb_questions,
          temps_limite_min: quizData.temps_limite_min,
          seuil_reussite_pct: quizData.seuil_reussite_pct,
          afficher_correction: true,
          melanger_questions: true,
          actif: true,
          module_id: null,
          lesson_id: null,
        });

        if (quizResult?.id) {
          // Create questions for this quiz
          for (const question of quizData.questions) {
            try {
              await createQuestion.mutateAsync({
                quiz_id: quizResult.id,
                enonce: question.enonce,
                type: question.type,
                niveau: question.niveau,
                points: question.points,
                explication: question.explication,
                reponses: question.reponses,
                actif: true,
                exam_id: null,
                competency_id: null,
                theme_id: null,
              });
              successCount++;
            } catch {
              errorCount++;
            }
          }
        }
      }

      toast.success(`Import terminé : ${successCount} questions importées`);
      if (errorCount > 0) {
        toast.warning(`${errorCount} questions n'ont pas pu être importées`);
      }
      
      onSuccess?.();
      handleClose();
    } catch (err) {
      toast.error("Erreur lors de l'import");
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedData(null);
    setError(null);
    onOpenChange(false);
  };

  const totalQuestions = parsedData 
    ? Array.from(parsedData.quizzes.values()).reduce((acc, q) => acc + q.questions.length, 0)
    : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importer des quiz
          </DialogTitle>
          <DialogDescription>
            Importez des quiz et questions depuis un fichier CSV ou Excel
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Download template */}
          <div className="p-4 border rounded-lg bg-muted/50">
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm">Modèle de fichier</p>
                <p className="text-xs text-muted-foreground mb-2">
                  Téléchargez le modèle CSV avec les colonnes requises
                </p>
                <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger le modèle
                </Button>
              </div>
            </div>
          </div>

          {/* File upload */}
          <div className="space-y-2">
            <Label>Fichier à importer</Label>
            <div className="flex gap-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Formats acceptés : CSV, Excel (.xlsx, .xls)
            </p>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-sm">Analyse du fichier...</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Preview */}
          {parsedData && parsedData.quizzes.size > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Aperçu de l'import</Label>
                <div className="flex gap-2">
                  <Badge variant="secondary">
                    {parsedData.quizzes.size} quiz
                  </Badge>
                  <Badge variant="secondary">
                    {totalQuestions} questions
                  </Badge>
                </div>
              </div>

              <ScrollArea className="h-48 rounded-lg border p-3">
                <div className="space-y-3">
                  {Array.from(parsedData.quizzes.entries()).map(([key, quiz]) => (
                    <div key={key} className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">{quiz.titre}</span>
                      </div>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span>{quiz.questions.length} questions</span>
                        <span>•</span>
                        <span>Seuil: {quiz.seuil_reussite_pct}%</span>
                        {quiz.temps_limite_min && (
                          <>
                            <span>•</span>
                            <span>{quiz.temps_limite_min} min</span>
                          </>
                        )}
                      </div>
                      <div className="mt-2 space-y-1">
                        {quiz.questions.slice(0, 2).map((q, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs">
                            <FileQuestion className="h-3 w-3 text-muted-foreground" />
                            <span className="truncate">{q.enonce}</span>
                          </div>
                        ))}
                        {quiz.questions.length > 2 && (
                          <p className="text-xs text-muted-foreground">
                            + {quiz.questions.length - 2} autres questions
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleClose}>
              Annuler
            </Button>
            <Button 
              onClick={handleImport}
              disabled={!parsedData || parsedData.quizzes.size === 0 || isImporting}
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Import en cours...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Importer {totalQuestions} questions
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
