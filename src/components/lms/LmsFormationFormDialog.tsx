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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LmsFormation, useCreateLmsFormation, useUpdateLmsFormation } from "@/hooks/useLmsFormations";

const formSchema = z.object({
  code: z.string().min(2, "Le code est requis"),
  nom: z.string().min(3, "Le nom est requis"),
  description: z.string().optional(),
  type_formation: z.string().min(1, "Le type est requis"),
  categorie: z.string().min(1, "La catégorie est requise"),
  duree_heures: z.coerce.number().min(1, "La durée doit être positive"),
  seuil_reussite_pct: z.coerce.number().min(0).max(100).default(70),
  actif: z.boolean().default(true),
  ordre: z.coerce.number().default(0),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formation?: LmsFormation | null;
}

export function LmsFormationFormDialog({ open, onOpenChange, formation }: Props) {
  const createFormation = useCreateLmsFormation();
  const updateFormation = useUpdateLmsFormation();
  const isEditing = !!formation;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: "",
      nom: "",
      description: "",
      type_formation: "VTC",
      categorie: "initiale",
      duree_heures: 250,
      seuil_reussite_pct: 70,
      actif: true,
      ordre: 0,
    },
  });

  useEffect(() => {
    if (formation) {
      form.reset({
        code: formation.code,
        nom: formation.nom,
        description: formation.description || "",
        type_formation: formation.type_formation,
        categorie: formation.categorie,
        duree_heures: formation.duree_heures,
        seuil_reussite_pct: formation.seuil_reussite_pct,
        actif: formation.actif,
        ordre: formation.ordre,
      });
    } else {
      form.reset({
        code: "",
        nom: "",
        description: "",
        type_formation: "VTC",
        categorie: "initiale",
        duree_heures: 250,
        seuil_reussite_pct: 70,
        actif: true,
        ordre: 0,
      });
    }
  }, [formation, form]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      code: values.code,
      nom: values.nom,
      description: values.description || null,
      type_formation: values.type_formation,
      categorie: values.categorie,
      duree_heures: values.duree_heures,
      seuil_reussite_pct: values.seuil_reussite_pct,
      actif: values.actif,
      ordre: values.ordre,
    };

    try {
      if (isEditing) {
        await updateFormation.mutateAsync({ id: formation.id, ...payload });
      } else {
        await createFormation.mutateAsync(payload);
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
            {isEditing ? "Modifier la formation" : "Nouvelle formation"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input placeholder="VTC-INIT" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type_formation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de formation</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="VTC">VTC</SelectItem>
                        <SelectItem value="Taxi">Taxi</SelectItem>
                        <SelectItem value="VMDTR">VMDTR / Mobilité</SelectItem>
                        <SelectItem value="Passerelle">Passerelle</SelectItem>
                        <SelectItem value="Continue">Formation continue</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="nom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom</FormLabel>
                  <FormControl>
                    <Input placeholder="Formation initiale VTC" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="categorie"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catégorie</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="initiale">Initiale</SelectItem>
                        <SelectItem value="continue">Continue</SelectItem>
                        <SelectItem value="perfectionnement">Perfectionnement</SelectItem>
                        <SelectItem value="mobilite">Mobilité</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Décrivez la formation..."
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
                name="duree_heures"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Durée (heures)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
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
                    <FormLabel>Ordre d'affichage</FormLabel>
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
              name="actif"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="!mt-0">Formation active</FormLabel>
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
                disabled={createFormation.isPending || updateFormation.isPending}
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
