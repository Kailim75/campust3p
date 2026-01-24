import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useLmsQuizMutations, LmsQuiz } from "@/hooks/useLmsQuizzes";
import { useLmsModules } from "@/hooks/useLmsModules";
import { useLmsLessons } from "@/hooks/useLmsLessons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  titre: z.string().min(1, "Le titre est requis"),
  description: z.string().optional(),
  module_id: z.string().optional(),
  lesson_id: z.string().optional(),
  nb_questions: z.coerce.number().min(1).max(100),
  temps_limite_min: z.coerce.number().min(1).max(180).optional(),
  seuil_reussite_pct: z.coerce.number().min(0).max(100),
  tentatives_max: z.coerce.number().min(1).max(10).optional(),
  afficher_correction: z.boolean(),
  melanger_questions: z.boolean(),
  actif: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface QuizFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quiz?: LmsQuiz | null;
}

export function QuizFormDialog({ open, onOpenChange, quiz }: QuizFormDialogProps) {
  const { createQuiz, updateQuiz } = useLmsQuizMutations();
  const { data: modules } = useLmsModules();
  const [selectedModuleId, setSelectedModuleId] = useState<string | undefined>();
  const { data: lessons } = useLmsLessons(selectedModuleId);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      titre: "",
      description: "",
      module_id: "",
      lesson_id: "",
      nb_questions: 10,
      temps_limite_min: 15,
      seuil_reussite_pct: 70,
      tentatives_max: 3,
      afficher_correction: true,
      melanger_questions: true,
      actif: true,
    },
  });

  useEffect(() => {
    if (quiz) {
      form.reset({
        titre: quiz.titre,
        description: quiz.description || "",
        module_id: quiz.module_id || "",
        lesson_id: quiz.lesson_id || "",
        nb_questions: quiz.nb_questions,
        temps_limite_min: quiz.temps_limite_min || undefined,
        seuil_reussite_pct: quiz.seuil_reussite_pct,
        tentatives_max: quiz.tentatives_max || undefined,
        afficher_correction: quiz.afficher_correction,
        melanger_questions: quiz.melanger_questions,
        actif: quiz.actif,
      });
      setSelectedModuleId(quiz.module_id || undefined);
    } else {
      form.reset({
        titre: "",
        description: "",
        module_id: "",
        lesson_id: "",
        nb_questions: 10,
        temps_limite_min: 15,
        seuil_reussite_pct: 70,
        tentatives_max: 3,
        afficher_correction: true,
        melanger_questions: true,
        actif: true,
      });
      setSelectedModuleId(undefined);
    }
  }, [quiz, form]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      ...values,
      module_id: values.module_id || null,
      lesson_id: values.lesson_id || null,
      description: values.description || null,
      temps_limite_min: values.temps_limite_min || null,
      tentatives_max: values.tentatives_max || null,
    };

    if (quiz) {
      await updateQuiz.mutateAsync({ id: quiz.id, ...payload });
    } else {
      await createQuiz.mutateAsync(payload as any);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{quiz ? "Modifier le quiz" : "Nouveau quiz"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="titre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titre *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Quiz - Réglementation VTC" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Description du quiz..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="module_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Module</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(val) => {
                        field.onChange(val);
                        setSelectedModuleId(val);
                        form.setValue("lesson_id", "");
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Aucun</SelectItem>
                        {modules?.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.nom}
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
                name="lesson_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Leçon</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!selectedModuleId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Aucune</SelectItem>
                        {lessons?.map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.titre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nb_questions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de questions</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={100} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="temps_limite_min"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Temps limite (min)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={180} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="seuil_reussite_pct"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seuil de réussite (%)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} max={100} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tentatives_max"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tentatives max</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={10} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="afficher_correction"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel>Afficher la correction</FormLabel>
                      <FormDescription>
                        Montrer les bonnes réponses après le quiz
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="melanger_questions"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel>Mélanger les questions</FormLabel>
                      <FormDescription>
                        Ordre aléatoire à chaque tentative
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="actif"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel>Quiz actif</FormLabel>
                      <FormDescription>
                        Visible pour les apprenants
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={createQuiz.isPending || updateQuiz.isPending}>
                {quiz ? "Modifier" : "Créer"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
