import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useProspectDuplicateCheck } from "@/hooks/useProspectDuplicateCheck";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateProspect, useUpdateProspect, type Prospect, type ProspectStatus, type ProspectPriorite } from "@/hooks/useProspects";

const prospectSchema = z.object({
  nom: z.string().min(1, "Le nom est requis"),
  prenom: z.string().min(1, "Le prénom est requis"),
  telephone: z.string().optional(),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  formation_souhaitee: z.string().min(1, "La formation souhaitée est requise"),
  source: z.string().min(1, "La source est requise"),
  statut: z.enum(["nouveau", "contacte", "relance", "converti", "perdu"]),
  priorite: z.enum(["basse", "normale", "haute", "urgente"]),
  date_prochaine_relance: z.string().min(1, "La date de prochaine relance est requise"),
  notes: z.string().optional(),
});

type ProspectFormValues = z.infer<typeof prospectSchema>;

interface ProspectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospect?: Prospect | null;
}

const STATUS_OPTIONS: { value: ProspectStatus; label: string }[] = [
  { value: "nouveau", label: "Nouveau" },
  { value: "contacte", label: "Contacté" },
  { value: "relance", label: "À relancer" },
  { value: "converti", label: "Converti" },
  { value: "perdu", label: "Perdu" },
];

const PRIORITE_OPTIONS: { value: ProspectPriorite; label: string; color: string }[] = [
  { value: "basse", label: "Basse", color: "text-gray-600" },
  { value: "normale", label: "Normale", color: "text-blue-600" },
  { value: "haute", label: "Haute", color: "text-orange-600" },
  { value: "urgente", label: "Urgente", color: "text-destructive" },
];

const FORMATION_OPTIONS = [
  "VTC",
  "TAXI",
  "VMDTR",
  "ACC VTC",
  "ACC VTC 75",
  "Formation continue VTC",
  "Formation continue Taxi",
  "Mobilité Taxi",
];

const SOURCE_OPTIONS = [
  "Site web",
  "Réseaux sociaux",
  "Bouche à oreille",
  "Parrainage",
  "Publicité",
  "Salon",
  "Autre",
];

export function ProspectFormDialog({ open, onOpenChange, prospect }: ProspectFormDialogProps) {
  const createProspect = useCreateProspect();
  const updateProspect = useUpdateProspect();
  const isEditing = !!prospect;

  const form = useForm<ProspectFormValues>({
    resolver: zodResolver(prospectSchema),
    defaultValues: {
      nom: "",
      prenom: "",
      telephone: "",
      email: "",
      formation_souhaitee: "",
      source: "",
      statut: "nouveau",
      priorite: "normale",
      date_prochaine_relance: "",
      notes: "",
    },
  });

  // RM-1: Duplicate detection
  const watchNom = form.watch("nom");
  const watchPrenom = form.watch("prenom");
  const watchEmail = form.watch("email");
  const watchTelephone = form.watch("telephone");

  const { duplicates, isChecking: isCheckingDuplicates, hasDuplicates } = useProspectDuplicateCheck({
    nom: isEditing ? "" : watchNom,
    prenom: isEditing ? "" : watchPrenom,
    email: isEditing ? undefined : watchEmail,
    telephone: isEditing ? undefined : watchTelephone,
  });

  useEffect(() => {
    if (prospect) {
      form.reset({
        nom: prospect.nom,
        prenom: prospect.prenom,
        telephone: prospect.telephone || "",
        email: prospect.email || "",
        formation_souhaitee: prospect.formation_souhaitee || "",
        source: prospect.source || "",
        statut: prospect.statut,
        priorite: prospect.priorite || "normale",
        date_prochaine_relance: prospect.date_prochaine_relance || "",
        notes: prospect.notes || "",
      });
    } else {
      form.reset({
        nom: "",
        prenom: "",
        telephone: "",
        email: "",
        formation_souhaitee: "",
        source: "",
        statut: "nouveau",
        priorite: "normale",
        date_prochaine_relance: "",
        notes: "",
      });
    }
  }, [prospect, form]);

  const onSubmit = async (values: ProspectFormValues) => {
    try {
      if (isEditing && prospect) {
        await updateProspect.mutateAsync({
          id: prospect.id,
          updates: {
            nom: values.nom,
            prenom: values.prenom,
            statut: values.statut,
            priorite: values.priorite,
            email: values.email || null,
            telephone: values.telephone || null,
            formation_souhaitee: values.formation_souhaitee || null,
            source: values.source || null,
            date_prochaine_relance: values.date_prochaine_relance || null,
            notes: values.notes || null,
          },
        });
      } else {
        await createProspect.mutateAsync({
          nom: values.nom,
          prenom: values.prenom,
          statut: values.statut,
          priorite: values.priorite,
          email: values.email || null,
          telephone: values.telephone || null,
          formation_souhaitee: values.formation_souhaitee || null,
          source: values.source || null,
          date_prochaine_relance: values.date_prochaine_relance || null,
          notes: values.notes || null,
        });
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving prospect:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier le prospect" : "Nouveau prospect"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* RM-1: Duplicate alert */}
            {hasDuplicates && !isEditing && (
              <div className="rounded-md border border-warning bg-warning/10 p-3 text-sm space-y-1">
                <p className="font-medium text-warning">⚠️ Doublons potentiels détectés</p>
                {duplicates.slice(0, 3).map((d) => (
                  <p key={`${d.source}-${d.id}`} className="text-muted-foreground">
                    {d.prenom} {d.nom} {d.email ? `(${d.email})` : ""} — {d.source === "contact" ? "Contact" : "Prospect"} existant ({d.match_type === "email" ? "même email" : "même nom/prénom"})
                  </p>
                ))}
                <p className="text-xs text-muted-foreground mt-1">Vous pouvez continuer la création si ce n'est pas un doublon.</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="prenom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prénom *</FormLabel>
                    <FormControl>
                      <Input placeholder="Jean" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom *</FormLabel>
                    <FormControl>
                      <Input placeholder="Dupont" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="telephone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone</FormLabel>
                    <FormControl>
                      <Input placeholder="06 12 34 56 78" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="jean@exemple.fr" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="formation_souhaitee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Formation souhaitée</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FORMATION_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
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
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SOURCE_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
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
                name="statut"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Statut</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
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
                name="priorite"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priorité</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PRIORITE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <span className={option.color}>{option.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="date_prochaine_relance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date prochaine relance</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Informations complémentaires..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={createProspect.isPending || updateProspect.isPending}
              >
                {createProspect.isPending || updateProspect.isPending
                  ? "Enregistrement..."
                  : isEditing
                  ? "Modifier"
                  : "Créer"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
