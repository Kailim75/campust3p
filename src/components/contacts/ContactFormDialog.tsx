import { useEffect, useState, useCallback, useRef } from "react";
import { SourceSelect } from "@/components/ui/source-select";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { useDuplicateCheck } from "@/hooks/useDuplicateCheck";
import { DuplicateAlert } from "./DuplicateAlert";
import { toast } from "sonner";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Constants } from "@/integrations/supabase/types";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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
  numero_permis: z.string().max(50).optional(),
  prefecture_permis: z.string().max(100).optional(),
  date_delivrance_permis: z.string().optional(),
  numero_carte_professionnelle: z.string().max(50).optional(),
  prefecture_carte: z.string().max(100).optional(),
  date_expiration_carte: z.string().optional(),
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
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const { duplicates, checkDuplicates, clearDuplicates } = useDuplicateCheck();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const isEditing = !!contact;
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");

  // Fetch available sessions (upcoming or in progress)
  const { data: availableSessions = [] } = useQuery({
    queryKey: ["available-sessions-for-inscription"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("id, nom, date_debut, date_fin, formation_type")
        .gte("date_fin", new Date().toISOString().split("T")[0])
        .eq("archived", false)
        .order("date_debut", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: open && !isEditing,
  });

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
      numero_permis: "",
      prefecture_permis: "",
      date_delivrance_permis: "",
      numero_carte_professionnelle: "",
      prefecture_carte: "",
      date_expiration_carte: "",
      formation: null,
      statut: "En attente de validation",
      source: "",
      commentaires: "",
    },
  });

  useEffect(() => {
    if (contact) {
      // In edit mode, always show complete form
      setShowCompleteForm(true);
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
        numero_permis: contact.numero_permis || "",
        prefecture_permis: contact.prefecture_permis || "",
        date_delivrance_permis: contact.date_delivrance_permis || "",
        numero_carte_professionnelle: contact.numero_carte_professionnelle || "",
        prefecture_carte: contact.prefecture_carte || "",
        date_expiration_carte: contact.date_expiration_carte || "",
        formation: contact.formation,
        statut: contact.statut,
        source: contact.source || "",
        commentaires: contact.commentaires || "",
      });
    } else {
      // In create mode, start with express form
      setShowCompleteForm(false);
      setSelectedSessionId("");
      clearDuplicates();
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
        numero_permis: "",
        prefecture_permis: "",
        date_delivrance_permis: "",
        numero_carte_professionnelle: "",
        prefecture_carte: "",
        date_expiration_carte: "",
        formation: null,
        statut: "En attente de validation",
        source: "",
        commentaires: "",
      });
    }
  }, [contact, form, open, clearDuplicates]);

  // Debounced duplicate check when key fields change
  const triggerDuplicateCheck = useCallback(() => {
    if (isEditing) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const values = form.getValues();
      if (values.nom && values.prenom) {
        checkDuplicates(
          values.nom,
          values.prenom,
          values.email || undefined,
          values.date_naissance || undefined,
        );
      }
    }, 500);
  }, [isEditing, form, checkDuplicates]);

  const onSubmit = async (values: ContactFormValues) => {
    try {
      const contactData: Omit<ContactInsert, 'centre_id'> = {
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
        numero_permis: values.numero_permis || null,
        prefecture_permis: values.prefecture_permis || null,
        date_delivrance_permis: values.date_delivrance_permis || null,
        numero_carte_professionnelle: values.numero_carte_professionnelle || null,
        prefecture_carte: values.prefecture_carte || null,
        date_expiration_carte: values.date_expiration_carte || null,
        formation: values.formation ?? null,
        statut: values.statut ?? null,
        source: values.source || null,
        commentaires: values.commentaires || null,
      };

      if (isEditing && contact) {
        await updateContact.mutateAsync({ id: contact.id, updates: contactData });
        toast.success("Contact mis à jour", {
          description: `${values.prenom} ${values.nom} a été mis à jour avec succès.`,
        });
      } else {
        const newContact = await createContact.mutateAsync(contactData);
        
        // Auto-inscribe to selected session
        if (selectedSessionId && selectedSessionId !== "none" && newContact?.id) {
          // Fetch session track for snapshot
          const { data: sessData } = await supabase.from("sessions").select("track").eq("id", selectedSessionId).single();
          const { error: inscError } = await supabase
            .from("session_inscriptions")
            .insert({
              session_id: selectedSessionId,
              contact_id: newContact.id,
              statut: "inscrit",
              track: (sessData as any)?.track || "initial",
            });
          if (inscError) {
            console.error("Erreur inscription session:", inscError);
            toast.warning("Contact créé mais l'inscription à la session a échoué.");
          } else {
            const sessionName = availableSessions.find(s => s.id === selectedSessionId)?.nom;
            toast.success("Contact créé et inscrit", {
              description: `${values.prenom} ${values.nom} a été ajouté et inscrit à ${sessionName || "la session"}.`,
            });
          }
        } else {
          toast.success("Contact créé", {
            description: `${values.prenom} ${values.nom} a été ajouté avec succès.`,
          });
        }
      }
      onOpenChange(false);
    } catch (error) {
      toast.error("Erreur", {
        description: isEditing 
          ? "Impossible de mettre à jour le contact. Veuillez réessayer."
          : "Impossible de créer le contact. Veuillez réessayer.",
      });
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
          {!isEditing && (
            <DialogDescription>
              Remplissez les informations essentielles. Les champs complémentaires sont optionnels.
            </DialogDescription>
          )}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* === SECTION ESSENTIELLE (Mode Express) === */}
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">1</span>
                Informations essentielles
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
                        <Input {...field} placeholder="Prénom" onChange={(e) => { field.onChange(e); triggerDuplicateCheck(); }} />
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
                        <Input {...field} placeholder="Nom" onChange={(e) => { field.onChange(e); triggerDuplicateCheck(); }} />
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
                        <Input {...field} type="email" placeholder="email@exemple.com" onBlur={() => triggerDuplicateCheck()} />
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

              {/* Session d'intégration */}
              {!isEditing && (
                <div className="pt-2">
                  <FormItem>
                    <FormLabel>Inscrire à une session</FormLabel>
                    <Select
                      value={selectedSessionId}
                      onValueChange={setSelectedSessionId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Aucune session (optionnel)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Aucune session</SelectItem>
                        {availableSessions.map((session) => (
                          <SelectItem key={session.id} value={session.id}>
                            {session.nom} — {session.formation_type} ({session.date_debut ? format(new Date(session.date_debut), "dd/MM/yy", { locale: fr }) : ""})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                </div>
              )}
            </div>

            {/* === ALERTE DOUBLONS === */}
            {!isEditing && <DuplicateAlert duplicates={duplicates} />}

            {/* === TOGGLE POUR FORMULAIRE COMPLET === */}
            {!isEditing && (
              <Collapsible open={showCompleteForm} onOpenChange={setShowCompleteForm}>
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between"
                  >
                    <span>
                      {showCompleteForm ? "Masquer les champs complémentaires" : "Afficher les champs complémentaires"}
                    </span>
                    {showCompleteForm ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>

                <CollapsibleContent className="space-y-6 pt-4">
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
                            <AddressAutocomplete
                              value={field.value || ""}
                              onChange={field.onChange}
                              onSelect={(addr) => {
                                form.setValue("rue", addr.rue);
                                form.setValue("code_postal", addr.code_postal);
                                form.setValue("ville", addr.ville);
                              }}
                              placeholder="Commencez à taper une adresse…"
                            />
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

                  {/* Permis de conduire */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Permis de conduire
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="numero_permis"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Numéro de permis</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="12AB34567" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="prefecture_permis"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Préfecture</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Paris" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="date_delivrance_permis"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date de délivrance</FormLabel>
                            <FormControl>
                              <Input {...field} type="date" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Carte professionnelle */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Carte professionnelle
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="numero_carte_professionnelle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Numéro de carte</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="T-75-2026-001234" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="prefecture_carte"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Préfecture</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Paris" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="date_expiration_carte"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date d'expiration</FormLabel>
                            <FormControl>
                              <Input {...field} type="date" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Formation & autres */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Formation & CRM
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="formation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Formation</FormLabel>
                            <Select
                              value={field.value || ""}
                              onValueChange={(value) => field.onChange(value || null)}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionner" />
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
                                  <SelectValue placeholder="Sélectionner" />
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
                    </div>
                    <FormField
                      control={form.control}
                      name="source"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Source</FormLabel>
                          <FormControl>
                            <SourceSelect
                              value={field.value || ""}
                              onValueChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="commentaires"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Commentaires</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Notes internes..."
                              className="resize-none"
                              rows={3}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* === FORMULAIRE COMPLET EN MODE ÉDITION === */}
            {isEditing && (
              <div className="space-y-6">
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
                          <AddressAutocomplete
                            value={field.value || ""}
                            onChange={field.onChange}
                            onSelect={(addr) => {
                              form.setValue("rue", addr.rue);
                              form.setValue("code_postal", addr.code_postal);
                              form.setValue("ville", addr.ville);
                            }}
                            placeholder="Commencez à taper une adresse…"
                          />
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

                {/* Permis de conduire */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Permis de conduire
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="numero_permis"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Numéro de permis</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="12AB34567" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="prefecture_permis"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Préfecture</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Paris" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="date_delivrance_permis"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date de délivrance</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Carte professionnelle */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Carte professionnelle
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="numero_carte_professionnelle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Numéro de carte</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="T-75-2026-001234" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="prefecture_carte"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Préfecture</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Paris" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="date_expiration_carte"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date d'expiration</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Formation & autres */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Formation & CRM
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="formation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Formation</FormLabel>
                          <Select
                            value={field.value || ""}
                            onValueChange={(value) => field.onChange(value || null)}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner" />
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
                                <SelectValue placeholder="Sélectionner" />
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
                  </div>
                  <FormField
                    control={form.control}
                    name="source"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Source</FormLabel>
                        <FormControl>
                          <SourceSelect
                            value={field.value || ""}
                            onValueChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="commentaires"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Commentaires</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Notes internes..."
                            className="resize-none"
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Submit */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Enregistrer" : "Créer l'apprenant"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
