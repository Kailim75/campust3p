import { useState, useEffect } from "react";
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
import { toast } from "sonner";
import { useContacts } from "@/hooks/useContacts";
import { useCreateFacture, useUpdateFacture, useGenerateNumeroFacture, Facture, FinancementType, FactureStatut } from "@/hooks/useFactures";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  contact_id: z.string().min(1, "Veuillez sélectionner un contact"),
  montant_total: z.coerce.number().min(0, "Le montant doit être positif"),
  type_financement: z.enum(["personnel", "entreprise", "cpf", "opco"]),
  statut: z.enum(["brouillon", "emise", "payee", "partiel", "impayee", "annulee"]),
  date_emission: z.string().optional(),
  date_echeance: z.string().optional(),
  commentaires: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface FactureFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facture?: Facture | null;
  defaultContactId?: string;
}

const financementOptions: { value: FinancementType; label: string }[] = [
  { value: "personnel", label: "Personnel" },
  { value: "entreprise", label: "Entreprise" },
  { value: "cpf", label: "CPF" },
  { value: "opco", label: "OPCO" },
];

const statutOptions: { value: FactureStatut; label: string }[] = [
  { value: "brouillon", label: "Brouillon" },
  { value: "emise", label: "Émise" },
  { value: "payee", label: "Payée" },
  { value: "partiel", label: "Partiel" },
  { value: "impayee", label: "Impayée" },
  { value: "annulee", label: "Annulée" },
];

export function FactureFormDialog({
  open,
  onOpenChange,
  facture,
  defaultContactId,
}: FactureFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: contacts = [] } = useContacts();
  const { data: nextNumero } = useGenerateNumeroFacture();
  const createFacture = useCreateFacture();
  const updateFacture = useUpdateFacture();

  const isEditing = !!facture;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contact_id: defaultContactId || "",
      montant_total: 0,
      type_financement: "personnel",
      statut: "brouillon",
      date_emission: "",
      date_echeance: "",
      commentaires: "",
    },
  });

  useEffect(() => {
    if (facture) {
      form.reset({
        contact_id: facture.contact_id,
        montant_total: Number(facture.montant_total),
        type_financement: facture.type_financement,
        statut: facture.statut,
        date_emission: facture.date_emission || "",
        date_echeance: facture.date_echeance || "",
        commentaires: facture.commentaires || "",
      });
    } else {
      form.reset({
        contact_id: defaultContactId || "",
        montant_total: 0,
        type_financement: "personnel",
        statut: "brouillon",
        date_emission: "",
        date_echeance: "",
        commentaires: "",
      });
    }
  }, [facture, defaultContactId, form]);

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      if (isEditing && facture) {
        await updateFacture.mutateAsync({
          id: facture.id,
          contact_id: values.contact_id,
          montant_total: values.montant_total,
          type_financement: values.type_financement,
          statut: values.statut,
          date_emission: values.date_emission || null,
          date_echeance: values.date_echeance || null,
          commentaires: values.commentaires || null,
        });
        toast.success("Facture mise à jour");
      } else {
        await createFacture.mutateAsync({
          contact_id: values.contact_id,
          numero_facture: nextNumero || `FAC-${Date.now()}`,
          montant_total: values.montant_total,
          type_financement: values.type_financement,
          statut: values.statut,
          date_emission: values.date_emission || null,
          date_echeance: values.date_echeance || null,
          commentaires: values.commentaires || null,
        });
        toast.success("Facture créée");
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving facture:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier la facture" : "Nouvelle facture"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!isEditing && nextNumero && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Numéro de facture</p>
                <p className="font-mono font-semibold">{nextNumero}</p>
              </div>
            )}

            <FormField
              control={form.control}
              name="contact_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un contact" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.prenom} {contact.nom}
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
              name="montant_total"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Montant total (€) *</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type_financement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Financement</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {financementOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
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
                    <FormLabel>Statut</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statutOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
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
                name="date_emission"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date d'émission</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date_echeance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date d'échéance</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="commentaires"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Commentaires</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? "Enregistrer" : "Créer"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
