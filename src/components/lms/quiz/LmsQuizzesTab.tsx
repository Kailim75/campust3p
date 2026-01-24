import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useAllLmsQuizzes,
  useAllLmsQuestions,
  useLmsQuizMutations,
  useLmsQuestionMutations,
  LmsQuiz,
  LmsQuestion,
} from "@/hooks/useLmsQuizzes";
import { QuizFormDialog } from "./QuizFormDialog";
import { QuestionFormDialog } from "./QuestionFormDialog";
import { 
  Plus, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Search,
  FileQuestion,
  ClipboardList,
  Clock,
  Target
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export function LmsQuizzesTab() {
  const [activeSubTab, setActiveSubTab] = useState("quizzes");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Quiz state
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<LmsQuiz | null>(null);
  const [deletingQuizId, setDeletingQuizId] = useState<string | null>(null);
  
  // Question state
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<LmsQuestion | null>(null);
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null);
  const [defaultQuizId, setDefaultQuizId] = useState<string | undefined>();

  const { data: quizzes, isLoading: loadingQuizzes } = useAllLmsQuizzes();
  const { data: questions, isLoading: loadingQuestions } = useAllLmsQuestions();
  const { deleteQuiz } = useLmsQuizMutations();
  const { deleteQuestion } = useLmsQuestionMutations();

  const filteredQuizzes = quizzes?.filter((q: any) =>
    q.titre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredQuestions = questions?.filter((q: any) =>
    q.enonce.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditQuiz = (quiz: any) => {
    setEditingQuiz(quiz);
    setQuizDialogOpen(true);
  };

  const handleDeleteQuiz = async () => {
    if (deletingQuizId) {
      await deleteQuiz.mutateAsync(deletingQuizId);
      setDeletingQuizId(null);
    }
  };

  const handleEditQuestion = (question: any) => {
    setEditingQuestion(question);
    setQuestionDialogOpen(true);
  };

  const handleDeleteQuestion = async () => {
    if (deletingQuestionId) {
      await deleteQuestion.mutateAsync(deletingQuestionId);
      setDeletingQuestionId(null);
    }
  };

  const handleAddQuestionToQuiz = (quizId: string) => {
    setDefaultQuizId(quizId);
    setEditingQuestion(null);
    setQuestionDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList>
          <TabsTrigger value="quizzes" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Quiz ({quizzes?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="questions" className="flex items-center gap-2">
            <FileQuestion className="h-4 w-4" />
            Questions ({questions?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quizzes" className="mt-6">
          <div className="flex justify-end mb-4">
            <Button onClick={() => { setEditingQuiz(null); setQuizDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau quiz
            </Button>
          </div>

          {loadingQuizzes ? (
            <div className="text-center py-8 text-muted-foreground">Chargement...</div>
          ) : !filteredQuizzes?.length ? (
            <EmptyState
              icon={ClipboardList}
              title="Aucun quiz"
              description="Créez votre premier quiz pour évaluer les apprenants"
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredQuizzes.map((quiz: any) => (
                <Card key={quiz.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{quiz.titre}</CardTitle>
                        {quiz.lms_modules?.nom && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {quiz.lms_modules.nom}
                          </p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleAddQuestionToQuiz(quiz.id)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Ajouter question
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditQuiz(quiz)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeletingQuizId(quiz.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <Badge variant="outline">
                        <FileQuestion className="h-3 w-3 mr-1" />
                        {quiz.nb_questions} questions
                      </Badge>
                      {quiz.temps_limite_min && (
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 mr-1" />
                          {quiz.temps_limite_min} min
                        </Badge>
                      )}
                      <Badge variant="outline">
                        <Target className="h-3 w-3 mr-1" />
                        {quiz.seuil_reussite_pct}%
                      </Badge>
                      {!quiz.actif && (
                        <Badge variant="secondary">Inactif</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="questions" className="mt-6">
          <div className="flex justify-end mb-4">
            <Button onClick={() => { setEditingQuestion(null); setDefaultQuizId(undefined); setQuestionDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle question
            </Button>
          </div>

          {loadingQuestions ? (
            <div className="text-center py-8 text-muted-foreground">Chargement...</div>
          ) : !filteredQuestions?.length ? (
            <EmptyState
              icon={FileQuestion}
              title="Aucune question"
              description="Ajoutez des questions à vos quiz"
            />
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Énoncé</TableHead>
                    <TableHead>Quiz</TableHead>
                    <TableHead>Niveau</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuestions.map((question: any) => (
                    <TableRow key={question.id}>
                      <TableCell className="max-w-md">
                        <p className="truncate">{question.enonce}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {question.lms_quizzes?.titre || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            question.niveau === "facile"
                              ? "secondary"
                              : question.niveau === "difficile"
                              ? "destructive"
                              : "default"
                          }
                        >
                          {question.niveau}
                        </Badge>
                      </TableCell>
                      <TableCell>{question.points} pt(s)</TableCell>
                      <TableCell>
                        <Badge variant={question.actif ? "default" : "secondary"}>
                          {question.actif ? "Actif" : "Inactif"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditQuestion(question)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeletingQuestionId(question.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <QuizFormDialog
        open={quizDialogOpen}
        onOpenChange={setQuizDialogOpen}
        quiz={editingQuiz}
      />

      <QuestionFormDialog
        open={questionDialogOpen}
        onOpenChange={setQuestionDialogOpen}
        question={editingQuestion}
        defaultQuizId={defaultQuizId}
      />

      {/* Delete quiz confirmation */}
      <AlertDialog open={!!deletingQuizId} onOpenChange={() => setDeletingQuizId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce quiz ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera également toutes les questions associées. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteQuiz} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete question confirmation */}
      <AlertDialog open={!!deletingQuestionId} onOpenChange={() => setDeletingQuestionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette question ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteQuestion} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
