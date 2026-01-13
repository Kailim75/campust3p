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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateSession, useUpdateSession, type Session, type SessionInsert } from "@/hooks/useSessions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Constants } from "@/integrations/supabase/types";

const formationTypes = Constants.public.Enums.formation_type;

const sessionStatuses = [
  { value: "a_venir", label: "À venir" },
  { value: "en_cours", label: "En cours" },
  { value: "terminee", label: "Terminée" },
  { value: "annulee", label: "Annulée" },
  { value: "complet", label: "Complet" },
] as const;

const sessionSchema = z.object({
  nom: z.string().min(1, "Le nom est requis").max(200),
  formation_type: z.enum(formationTypes),
  date_debut: z.string().min(1, "La date de début est requise"),
  date_fin: z.string().min(1, "La date de fin est requise"),
  places_totales: z.coerce.number().min(1, "Au moins 1 place requise").max(100),
  lieu: z.string().max(200).optional(),
  formateur: z.string().max(200).optional(),
  prix: z.coerce.number().min(0).optional(),
  description: z.string().max(1000).optional(),
  statut: z.enum(["a_venir", "en_cours", "terminee", "annulee", "complet"]),
});

type SessionFormValues = z.infer<typeof sessionSchema>;

interface SessionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session?: Session | null;
}

export function SessionFormDialog({ open, onOpenChange, session }: SessionFormDialogProps) {
  const createSession = useCreateSession();
  const updateSession = useUpdateSession();
  const isEditing = !!session;

  const form = useForm<SessionFormValues>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      nom: "",
      formation_type: "TAXI",
      date_debut: "",
      date_fin: "",
      places_totales: 10,
      lieu: "",
      formateur: "",
      prix: 0,
      description: "",
      statut: "a_venir",
    },
  });

  useEffect(() => {
    if (session) {
      form.reset({
        nom: session.nom,
        formation_type: session.formation_type,
        date_debut: session.date_debut,
        date_fin: session.date_fin,
        places_totales: session.places_totales,
        lieu: session.lieu || "",
        formateur: session.formateur || "",
        prix: session.prix ? Number(session.prix) : 0,
        description: session.description || "",
        statut: session.statut,
      });
    } else {
      form.reset({
        nom: "",
        formation_type: "TAXI",
        date_debut: "",
        date_fin: "",
        places_totales: 10,
        lieu: "",
        formateur: "",
        prix: 0,
        description: "",
        statut: "a_venir",
      });
    }
  }, [session, form]);

  const onSubmit = async (values: SessionFormValues) => {
    try {
      const sessionData: SessionInsert = {
        nom: values.nom,
        formation_type: values.formation_type,
        date_debut: values.date_debut,
        date_fin: values.date_fin,
        places_totales: values.places_totales,
        lieu: values.lieu || null,
        formateur: values.formateur || null,
        prix: values.prix || null,
        description: values.description || null,
        statut: values.statut,
      };

      if (isEditing && session) {
        await updateSession.mutateAsync({ id: session.id, updates: sessionData });
        toast.success("Session mise à jour avec succès");
      } else {
        await createSession.mutateAsync(sessionData);
        toast.success("Session créée avec succès");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(isEditing ? "Erreur lors de la mise à jour" : "Erreur lors de la création");
    }
  };

  const isLoading = createSession.isPending || updateSession.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier la session" : "Créer une session"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Informations générales */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Informations générales
              </h3>
              
              <FormField
                control={form.control}
                name="nom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom de la session *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: Formation Taxi Janvier 2026" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="formation_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type de formation *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choisir" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {formationTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
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
                  name="statut"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Statut *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choisir" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sessionStatuses.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Dates et places */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Planning
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="date_debut"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date de début *</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date_fin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date de fin *</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="places_totales"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Places totales *</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min={1} max={100} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Détails */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Détails
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="lieu"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lieu</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Paris, Salle A" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="formateur"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Formateur</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Nom du formateur" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="prix"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prix (€)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min={0} step={0.01} placeholder="1500" />
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
                      <Textarea {...field} placeholder="Description de la session..." rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Mettre à jour" : "Créer la session"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
