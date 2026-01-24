import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { LmsLesson, useCreateLmsLesson, useUpdateLmsLesson } from "@/hooks/useLmsLessons";

const formSchema = z.object({
  titre: z.string().min(3, "Le titre est requis"),
  description: z.string().optional(),
  contenu_html: z.string().optional(),
  duree_estimee_min: z.coerce.number().min(0).default(30),
  ordre: z.coerce.number().default(0),
  niveau: z.string().default("debutant"),
  actif: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string;
  lesson?: LmsLesson | null;
}

export function LmsLessonFormDialog({ open, onOpenChange, moduleId, lesson }: Props) {
  const createLesson = useCreateLmsLesson();
  const updateLesson = useUpdateLmsLesson();
  const isEditing = !!lesson;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      titre: "",
      description: "",
      contenu_html: "",
      duree_estimee_min: 30,
      ordre: 0,
      niveau: "debutant",
      actif: true,
    },
  });

  useEffect(() => {
    if (lesson) {
      form.reset({
        titre: lesson.titre,
        description: lesson.description || "",
        contenu_html: lesson.contenu_html || "",
        duree_estimee_min: lesson.duree_estimee_min,
        ordre: lesson.ordre,
        niveau: lesson.niveau,
        actif: lesson.actif,
      });
    } else {
      form.reset({
        titre: "",
        description: "",
        contenu_html: "",
        duree_estimee_min: 30,
        ordre: 0,
        niveau: "debutant",
        actif: true,
      });
    }
  }, [lesson, form]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      module_id: moduleId,
      titre: values.titre,
      description: values.description || null,
      contenu_html: values.contenu_html || null,
      duree_estimee_min: values.duree_estimee_min,
      ordre: values.ordre,
      niveau: values.niveau,
      actif: values.actif,
    };

    try {
      if (isEditing) {
        await updateLesson.mutateAsync({ id: lesson.id, ...payload });
      } else {
        await createLesson.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier la leçon" : "Nouvelle leçon"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="titre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titre de la leçon</FormLabel>
                  <FormControl>
                    <Input placeholder="Introduction à la réglementation" {...field} />
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="debutant">Débutant</SelectItem>
                        <SelectItem value="intermediaire">Intermédiaire</SelectItem>
                        <SelectItem value="avance">Avancé</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duree_estimee_min"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Durée (minutes)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ordre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ordre</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Résumé de la leçon..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contenu_html"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contenu de la leçon</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Contenu pédagogique détaillé (HTML supporté)..."
                      rows={8}
                      className="font-mono text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="actif"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="!mt-0">Leçon active</FormLabel>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={createLesson.isPending || updateLesson.isPending}
              >
                {isEditing ? "Mettre à jour" : "Créer"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
