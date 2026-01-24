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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { LmsModule, useCreateLmsModule, useUpdateLmsModule } from "@/hooks/useLmsModules";

const formSchema = z.object({
  titre: z.string().min(3, "Le titre est requis"),
  description: z.string().optional(),
  duree_estimee_min: z.coerce.number().min(0).default(0),
  ordre: z.coerce.number().default(0),
  obligatoire: z.boolean().default(true),
  icone: z.string().optional(),
  actif: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formationId: string;
  module?: LmsModule | null;
}

export function LmsModuleFormDialog({ open, onOpenChange, formationId, module }: Props) {
  const createModule = useCreateLmsModule();
  const updateModule = useUpdateLmsModule();
  const isEditing = !!module;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      titre: "",
      description: "",
      duree_estimee_min: 60,
      ordre: 0,
      obligatoire: true,
      icone: "",
      actif: true,
    },
  });

  useEffect(() => {
    if (module) {
      form.reset({
        titre: module.titre,
        description: module.description || "",
        duree_estimee_min: module.duree_estimee_min,
        ordre: module.ordre,
        obligatoire: module.obligatoire,
        icone: module.icone || "",
        actif: module.actif,
      });
    } else {
      form.reset({
        titre: "",
        description: "",
        duree_estimee_min: 60,
        ordre: 0,
        obligatoire: true,
        icone: "",
        actif: true,
      });
    }
  }, [module, form]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      formation_id: formationId,
      titre: values.titre,
      description: values.description || null,
      duree_estimee_min: values.duree_estimee_min,
      ordre: values.ordre,
      obligatoire: values.obligatoire,
      icone: values.icone || null,
      actif: values.actif,
    };

    try {
      if (isEditing) {
        await updateModule.mutateAsync({ id: module.id, ...payload });
      } else {
        await createModule.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier le module" : "Nouveau module"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="titre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titre du module</FormLabel>
                  <FormControl>
                    <Input placeholder="Réglementation du transport" {...field} />
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
                      placeholder="Décrivez le module..."
                      rows={3}
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
                name="duree_estimee_min"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Durée estimée (min)</FormLabel>
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
              name="icone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icône (optionnel)</FormLabel>
                  <FormControl>
                    <Input placeholder="book, scale, shield..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-6">
              <FormField
                control={form.control}
                name="obligatoire"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Obligatoire</FormLabel>
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
                    <FormLabel className="!mt-0">Actif</FormLabel>
                  </FormItem>
                )}
              />
            </div>

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
                disabled={createModule.isPending || updateModule.isPending}
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
