import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useLmsQuestionMutations, LmsQuestion } from "@/hooks/useLmsQuizzes";
import { useAllLmsQuizzes } from "@/hooks/useLmsQuizzes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const answerSchema = z.object({
  id: z.string(),
  texte: z.string().min(1, "La réponse est requise"),
  is_correct: z.boolean(),
  explication: z.string().optional(),
});

const formSchema = z.object({
  quiz_id: z.string().min(1, "Le quiz est requis"),
  type: z.string(),
  enonce: z.string().min(1, "L'énoncé est requis"),
  reponses: z.array(answerSchema).min(2, "Au moins 2 réponses sont requises"),
  explication: z.string().optional(),
  niveau: z.string(),
  points: z.coerce.number().min(1).max(10),
  actif: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface QuestionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question?: LmsQuestion | null;
  defaultQuizId?: string;
}

export function QuestionFormDialog({
  open,
  onOpenChange,
  question,
  defaultQuizId,
}: QuestionFormDialogProps) {
  const { createQuestion, updateQuestion } = useLmsQuestionMutations();
  const { data: quizzes } = useAllLmsQuizzes();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quiz_id: defaultQuizId || "",
      type: "qcm",
      enonce: "",
      reponses: [
        { id: crypto.randomUUID(), texte: "", is_correct: true, explication: "" },
        { id: crypto.randomUUID(), texte: "", is_correct: false, explication: "" },
      ],
      explication: "",
      niveau: "moyen",
      points: 1,
      actif: true,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "reponses",
  });

  useEffect(() => {
    if (question) {
      form.reset({
        quiz_id: question.quiz_id || "",
        type: question.type,
        enonce: question.enonce,
        reponses: question.reponses.map((r) => ({
          id: r.id || crypto.randomUUID(),
          texte: r.texte,
          is_correct: r.is_correct,
          explication: r.explication || "",
        })),
        explication: question.explication || "",
        niveau: question.niveau,
        points: question.points,
        actif: question.actif,
      });
    } else {
      form.reset({
        quiz_id: defaultQuizId || "",
        type: "qcm",
        enonce: "",
        reponses: [
          { id: crypto.randomUUID(), texte: "", is_correct: true, explication: "" },
          { id: crypto.randomUUID(), texte: "", is_correct: false, explication: "" },
        ],
        explication: "",
        niveau: "moyen",
        points: 1,
        actif: true,
      });
    }
  }, [question, defaultQuizId, form]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      quiz_id: values.quiz_id,
      exam_id: null,
      competency_id: null,
      theme_id: null,
      type: values.type,
      enonce: values.enonce,
      reponses: values.reponses,
      explication: values.explication || null,
      niveau: values.niveau,
      points: values.points,
      actif: values.actif,
    };

    if (question) {
      await updateQuestion.mutateAsync({ id: question.id, ...payload });
    } else {
      await createQuestion.mutateAsync(payload as any);
    }
    onOpenChange(false);
  };

  const addAnswer = () => {
    append({
      id: crypto.randomUUID(),
      texte: "",
      is_correct: false,
      explication: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {question ? "Modifier la question" : "Nouvelle question"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="quiz_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quiz *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un quiz..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {quizzes?.map((q: any) => (
                        <SelectItem key={q.id} value={q.id}>
                          {q.titre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="enonce"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Énoncé de la question *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ex: Quelle est la durée maximale de validité d'une carte VTC ?"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FormLabel>Réponses</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addAnswer}
                  disabled={fields.length >= 6}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter
                </Button>
              </div>

              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className={cn(
                    "p-3 rounded-lg border space-y-2",
                    form.watch(`reponses.${index}.is_correct`)
                      ? "border-primary bg-primary/10"
                      : "border-border"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <FormField
                      control={form.control}
                      name={`reponses.${index}.is_correct`}
                      render={({ field: checkField }) => (
                        <FormItem className="flex items-center space-x-2 mt-2">
                          <FormControl>
                            <Checkbox
                              checked={checkField.value}
                              onCheckedChange={checkField.onChange}
                            />
                          </FormControl>
                          <FormLabel className="text-xs text-muted-foreground">
                            Correcte
                          </FormLabel>
                        </FormItem>
                      )}
                    />

                    <div className="flex-1 space-y-2">
                      <FormField
                        control={form.control}
                        name={`reponses.${index}.texte`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input placeholder={`Réponse ${index + 1}`} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`reponses.${index}.explication`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                placeholder="Explication (optionnelle)"
                                className="text-sm"
                                {...field}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    {fields.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <FormField
              control={form.control}
              name="explication"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Explication générale</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Explication affichée après la correction..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="niveau"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Niveau</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="facile">Facile</SelectItem>
                        <SelectItem value="moyen">Moyen</SelectItem>
                        <SelectItem value="difficile">Difficile</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="points"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Points</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={10} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="qcm">QCM (choix unique)</SelectItem>
                        <SelectItem value="qcm_multi">QCM (choix multiple)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={createQuestion.isPending || updateQuestion.isPending}
              >
                {question ? "Modifier" : "Créer"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
