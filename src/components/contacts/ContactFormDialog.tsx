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
import { useCreateContact, useUpdateContact, type Contact, type ContactInsert } from "@/hooks/useContacts";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Constants } from "@/integrations/supabase/types";

const formationTypes = Constants.public.Enums.formation_type;
const statutTypes = Constants.public.Enums.contact_statut;

const contactSchema = z.object({
  civilite: z.enum(["Monsieur", "Madame"]).nullable().optional(),
  nom: z.string().min(1, "Le nom est requis").max(100),
  prenom: z.string().min(1, "Le prénom est requis").max(100),
  email: z.string().email("Email invalide").max(255).or(z.literal("")).optional(),
  telephone: z.string().max(20).optional(),
  rue: z.string().max(255).optional(),
  code_postal: z.string().max(10).optional(),
  ville: z.string().max(100).optional(),
  date_naissance: z.string().optional(),
  ville_naissance: z.string().max(100).optional(),
  pays_naissance: z.string().max(100).optional(),
  formation: z.enum(formationTypes).nullable().optional(),
  statut: z.enum(statutTypes).nullable().optional(),
  source: z.string().max(100).optional(),
  commentaires: z.string().max(1000).optional(),
});

type ContactFormValues = z.infer<typeof contactSchema>;

interface ContactFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact | null;
}

export function ContactFormDialog({ open, onOpenChange, contact }: ContactFormDialogProps) {
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const isEditing = !!contact;

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      civilite: null,
      nom: "",
      prenom: "",
      email: "",
      telephone: "",
      rue: "",
      code_postal: "",
      ville: "",
      date_naissance: "",
      ville_naissance: "",
      pays_naissance: "",
      formation: null,
      statut: "En attente de validation",
      source: "",
      commentaires: "",
    },
  });

  useEffect(() => {
    if (contact) {
      form.reset({
        civilite: contact.civilite,
        nom: contact.nom,
        prenom: contact.prenom,
        email: contact.email || "",
        telephone: contact.telephone || "",
        rue: contact.rue || "",
        code_postal: contact.code_postal || "",
        ville: contact.ville || "",
        date_naissance: contact.date_naissance || "",
        ville_naissance: contact.ville_naissance || "",
        pays_naissance: contact.pays_naissance || "",
        formation: contact.formation,
        statut: contact.statut,
        source: contact.source || "",
        commentaires: contact.commentaires || "",
      });
    } else {
      form.reset({
        civilite: null,
        nom: "",
        prenom: "",
        email: "",
        telephone: "",
        rue: "",
        code_postal: "",
        ville: "",
        date_naissance: "",
        ville_naissance: "",
        pays_naissance: "",
        formation: null,
        statut: "En attente de validation",
        source: "",
        commentaires: "",
      });
    }
  }, [contact, form]);

  const onSubmit = async (values: ContactFormValues) => {
    try {
      const contactData: ContactInsert = {
        nom: values.nom,
        prenom: values.prenom,
        civilite: values.civilite ?? null,
        email: values.email || null,
        telephone: values.telephone || null,
        rue: values.rue || null,
        code_postal: values.code_postal || null,
        ville: values.ville || null,
        date_naissance: values.date_naissance || null,
        ville_naissance: values.ville_naissance || null,
        pays_naissance: values.pays_naissance || null,
        formation: values.formation ?? null,
        statut: values.statut ?? null,
        source: values.source || null,
        commentaires: values.commentaires || null,
      };

      if (isEditing && contact) {
        await updateContact.mutateAsync({ id: contact.id, updates: contactData });
        toast.success("Contact mis à jour avec succès");
      } else {
        await createContact.mutateAsync(contactData);
        toast.success("Contact créé avec succès");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(isEditing ? "Erreur lors de la mise à jour" : "Erreur lors de la création");
    }
  };

  const isLoading = createContact.isPending || updateContact.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier le contact" : "Ajouter un apprenant"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Identité */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Identité
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="civilite"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Civilité</FormLabel>
                      <Select
                        value={field.value || ""}
                        onValueChange={(value) => field.onChange(value || null)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choisir" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Monsieur">Monsieur</SelectItem>
                          <SelectItem value="Madame">Madame</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="prenom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prénom *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Prénom" />
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
                        <Input {...field} placeholder="Nom" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="email@exemple.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="telephone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Téléphone</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="06 12 34 56 78" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Adresse */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Adresse
              </h3>
              <FormField
                control={form.control}
                name="rue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rue</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Adresse" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="code_postal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code postal</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="75001" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ville"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ville</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Paris" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Naissance */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Naissance
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="date_naissance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date de naissance</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ville_naissance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ville de naissance</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ville" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pays_naissance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pays de naissance</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="France" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Formation & Statut */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Formation
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="formation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type de formation</FormLabel>
                      <Select
                        value={field.value || ""}
                        onValueChange={(value) => field.onChange(value || null)}
                      >
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
                      <FormLabel>Statut</FormLabel>
                      <Select
                        value={field.value || ""}
                        onValueChange={(value) => field.onChange(value || null)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choisir" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {statutTypes.map((statut) => (
                            <SelectItem key={statut} value={statut}>
                              {statut}
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
                      <FormControl>
                        <Input {...field} placeholder="Google, CPF, etc." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Commentaires */}
            <FormField
              control={form.control}
              name="commentaires"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Commentaires</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Notes sur le contact..." rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Mettre à jour" : "Créer le contact"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
