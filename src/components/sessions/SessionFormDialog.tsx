import { useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { TRACK_BADGES } from "@/lib/formation-track";
import { generateSessionName } from "@/lib/session-naming";
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
  FormDescription,
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
import { useFormateursTable } from "@/hooks/useFormateurs";
import { useCatalogueFormations } from "@/hooks/useCatalogueFormations";
import { toast } from "sonner";
import { Loader2, BookOpen, User, MapPin, Clock, Euro } from "lucide-react";
import { Constants } from "@/integrations/supabase/types";
import { Separator } from "@/components/ui/separator";

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
  catalogue_formation_id: z.string().optional(),
  date_debut: z.string().min(1, "La date de début est requise"),
  date_fin: z.string().min(1, "La date de fin est requise"),
  horaire_type: z.enum(["jour", "soir"]).default("jour"),
  heure_debut: z.string().default("09:00"),
  heure_fin: z.string().default("17:00"),
  heure_debut_matin: z.string().default("09:00"),
  heure_fin_matin: z.string().default("12:30"),
  heure_debut_aprem: z.string().default("13:30"),
  heure_fin_aprem: z.string().default("17:00"),
  places_totales: z.coerce.number().min(1, "Au moins 1 place requise").max(100),
  formateur_id: z.string().optional(),
  adresse_rue: z.string().max(200).optional(),
  adresse_code_postal: z.string().max(10).optional(),
  adresse_ville: z.string().max(100).optional(),
  prix_ht: z.coerce.number().min(0).default(0),
  duree_heures: z.coerce.number().min(0).optional(),
  objectifs: z.string().max(2000).optional(),
  prerequis: z.string().max(1000).optional(),
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
  const { data: formateurs = [] } = useFormateursTable();
  const { data: catalogueFormations = [] } = useCatalogueFormations(true);
  const isEditing = !!session;

  const form = useForm<SessionFormValues>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      nom: "",
      formation_type: "TAXI",
      catalogue_formation_id: "",
      date_debut: "",
      date_fin: "",
      horaire_type: "jour" as const,
      heure_debut: "09:00",
      heure_fin: "17:00",
      heure_debut_matin: "09:00",
      heure_fin_matin: "12:30",
      heure_debut_aprem: "13:30",
      heure_fin_aprem: "17:00",
      places_totales: 10,
      formateur_id: "",
      adresse_rue: "",
      adresse_code_postal: "",
      adresse_ville: "",
      prix_ht: 0,
      duree_heures: 0,
      objectifs: "",
      prerequis: "",
      description: "",
      statut: "a_venir",
    },
  });

  const watchPrix = form.watch("prix_ht");
  const watchCatalogueId = form.watch("catalogue_formation_id");
  const watchFormationType = form.watch("formation_type");
  const watchDateDebut = form.watch("date_debut");
  const watchHoraireType = form.watch("horaire_type");

  // RM-2: Auto-generate session name from formation type + date + horaire
  useEffect(() => {
    if (!isEditing && watchFormationType && watchDateDebut) {
      const selectedFormation = watchCatalogueId
        ? catalogueFormations.find(f => f.id === watchCatalogueId)
        : null;
      const suggestedName = generateSessionName(
        watchFormationType,
        watchDateDebut,
        watchHoraireType || "jour",
        selectedFormation?.intitule,
      );
      form.setValue("nom", suggestedName);
    }
  }, [watchFormationType, watchDateDebut, watchHoraireType, watchCatalogueId, isEditing, catalogueFormations, form]);

  // Auto-fill from catalogue when selected
  useEffect(() => {
    if (watchCatalogueId && !isEditing) {
      const selectedFormation = catalogueFormations.find(f => f.id === watchCatalogueId);
      if (selectedFormation) {
        form.setValue("prix_ht", Number(selectedFormation.prix_ht) || 0);
        form.setValue("duree_heures", selectedFormation.duree_heures || 0);
        form.setValue("objectifs", selectedFormation.objectifs || "");
        form.setValue("prerequis", selectedFormation.prerequis || "");
        form.setValue("description", selectedFormation.description || "");
        
        // Map category to formation_type if possible
        const categoryToType: Record<string, string> = {
          "TAXI": "TAXI",
          "VTC": "VTC",
          "VMDTR": "VMDTR",
          "T3P": "T3P",
        };
        const matchedType = categoryToType[selectedFormation.categorie];
        if (matchedType && formationTypes.includes(matchedType as typeof formationTypes[number])) {
          form.setValue("formation_type", matchedType as typeof formationTypes[number]);
        }
      }
    }
  }, [watchCatalogueId, catalogueFormations, form, isEditing]);

  useEffect(() => {
    if (session) {
      form.reset({
        nom: session.nom,
        formation_type: session.formation_type,
        catalogue_formation_id: (session as any).catalogue_formation_id || "",
        date_debut: session.date_debut,
        date_fin: session.date_fin,
        horaire_type: ((session as any).horaire_type || "jour") as "jour" | "soir",
        heure_debut: (session as any).heure_debut?.slice(0, 5) || "09:00",
        heure_fin: (session as any).heure_fin?.slice(0, 5) || "17:00",
        heure_debut_matin: (session as any).heure_debut_matin?.slice(0, 5) || "09:00",
        heure_fin_matin: (session as any).heure_fin_matin?.slice(0, 5) || "12:30",
        heure_debut_aprem: (session as any).heure_debut_aprem?.slice(0, 5) || "13:30",
        heure_fin_aprem: (session as any).heure_fin_aprem?.slice(0, 5) || "17:00",
        places_totales: session.places_totales,
        formateur_id: (session as any).formateur_id || "",
        adresse_rue: (session as any).adresse_rue || "",
        adresse_code_postal: (session as any).adresse_code_postal || "",
        adresse_ville: (session as any).adresse_ville || "",
        prix_ht: Number((session as any).prix_ht) || 0,
        duree_heures: (session as any).duree_heures || 0,
        objectifs: (session as any).objectifs || "",
        prerequis: (session as any).prerequis || "",
        description: session.description || "",
        statut: session.statut,
      });
    } else {
      form.reset({
        nom: "",
        formation_type: "TAXI",
        catalogue_formation_id: "",
        date_debut: "",
        date_fin: "",
        heure_debut: "09:00",
        heure_fin: "17:00",
        horaire_type: "jour" as const,
        heure_debut_matin: "09:00",
        heure_fin_matin: "12:30",
        heure_debut_aprem: "13:30",
        heure_fin_aprem: "17:00",
        places_totales: 10,
        formateur_id: "",
        adresse_rue: "",
        adresse_code_postal: "",
        adresse_ville: "",
        prix_ht: 0,
        duree_heures: 0,
        objectifs: "",
        prerequis: "",
        description: "",
        statut: "a_venir",
      });
    }
  }, [session, form]);

  const onSubmit = async (values: SessionFormValues) => {
    try {
      const sessionData: Omit<SessionInsert, 'centre_id'> = {
        nom: values.nom,
        formation_type: values.formation_type,
        date_debut: values.date_debut,
        date_fin: values.date_fin,
        places_totales: values.places_totales,
        description: values.description || null,
        statut: values.statut,
        // New fields - keep legacy fields for backwards compatibility
        lieu: [values.adresse_rue, values.adresse_code_postal, values.adresse_ville].filter(Boolean).join(", ") || null,
        formateur: formateurs.find(f => f.id === values.formateur_id)?.nom || null,
        prix: Number(values.prix_ht) || null,
        // Extended fields (will be added via spread to avoid type issues with current types)
      };

      // Add extended fields using spread
      const extendedData = {
        ...sessionData,
        catalogue_formation_id: values.catalogue_formation_id || null,
        formateur_id: values.formateur_id || null,
        horaire_type: values.horaire_type || "jour",
        heure_debut: values.horaire_type === "soir" ? (values.heure_debut || "18:00") : (values.heure_debut || "09:00"),
        heure_fin: values.horaire_type === "soir" ? (values.heure_fin || "21:30") : (values.heure_fin || "17:00"),
        heure_debut_matin: values.horaire_type === "soir" ? null : (values.heure_debut_matin || "09:00"),
        heure_fin_matin: values.horaire_type === "soir" ? null : (values.heure_fin_matin || "12:30"),
        heure_debut_aprem: values.horaire_type === "soir" ? null : (values.heure_debut_aprem || "13:30"),
        heure_fin_aprem: values.horaire_type === "soir" ? null : (values.heure_fin_aprem || "17:00"),
        adresse_rue: values.adresse_rue || null,
        adresse_code_postal: values.adresse_code_postal || null,
        adresse_ville: values.adresse_ville || null,
        prix_ht: values.prix_ht || 0,
        tva_percent: 0,
        duree_heures: values.duree_heures || null,
        objectifs: values.objectifs || null,
        prerequis: values.prerequis || null,
      };

      if (isEditing && session) {
        await updateSession.mutateAsync({ id: session.id, updates: extendedData as any });
        toast.success("Session mise à jour avec succès");
      } else {
        await createSession.mutateAsync(extendedData as any);
        toast.success("Session créée avec succès");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(isEditing ? "Erreur lors de la mise à jour" : "Erreur lors de la création");
    }
  };

  const isLoading = createSession.isPending || updateSession.isPending;
  const activeFormateurs = formateurs.filter(f => f.actif);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto sm:max-w-3xl max-sm:!max-w-[100vw] max-sm:!h-[100dvh] max-sm:!max-h-[100dvh] max-sm:!rounded-none max-sm:!top-0 max-sm:!translate-y-0">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier la session" : "Créer une session"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Lien au catalogue */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                <BookOpen className="h-4 w-4" />
                Catalogue de formations
              </div>
              
              <FormField
                control={form.control}
                name="catalogue_formation_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Formation du catalogue</FormLabel>
                    <Select value={field.value || "__none__"} onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une formation (optionnel)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">-- Aucune --</SelectItem>
                        {catalogueFormations.map((formation) => (
                          <SelectItem key={formation.id} value={formation.id}>
                            {formation.code} - {formation.intitule}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Sélectionner une formation pré-remplira automatiquement les informations
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Read-only track indicator */}
              {watchCatalogueId && (() => {
                const sel = catalogueFormations.find(f => f.id === watchCatalogueId);
                const t = (sel as any)?.track || "initial";
                const badge = TRACK_BADGES[t as keyof typeof TRACK_BADGES];
                return badge ? (
                  <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/30">
                    <span className="text-xs text-muted-foreground">Parcours :</span>
                    <Badge variant="outline" className={`text-xs ${badge.className}`}>
                      {badge.label} ({badge.sublabel})
                    </Badge>
                    <span className="text-[10px] text-muted-foreground ml-auto">Hérité du catalogue</span>
                  </div>
                ) : null;
              })()}
            </div>

            <Separator />

            {/* Informations générales */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Informations générales
              </div>
              
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

            <Separator />

            {/* Formateur */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                <User className="h-4 w-4" />
                Formateur
              </div>
              
              <FormField
                control={form.control}
                name="formateur_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Formateur assigné</FormLabel>
                    <Select value={field.value || "__none__"} onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un formateur" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">-- Aucun --</SelectItem>
                        {activeFormateurs.map((formateur) => (
                          <SelectItem key={formateur.id} value={formateur.id}>
                            {formateur.prenom} {formateur.nom}
                            {formateur.specialites?.length > 0 && (
                              <span className="text-muted-foreground ml-2">
                                ({formateur.specialites.join(", ")})
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Planning */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                <Clock className="h-4 w-4" />
                Planning
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
                  name="horaire_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type d'horaire</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="jour">Journée (Matin + Après-midi)</SelectItem>
                          <SelectItem value="soir">Soir uniquement</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {form.watch("horaire_type") === "soir" ? (
                  <>
                    <FormField
                      control={form.control}
                      name="heure_debut"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Heure début soir</FormLabel>
                          <FormControl>
                            <Input {...field} type="time" defaultValue="18:00" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="heure_fin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Heure fin soir</FormLabel>
                          <FormControl>
                            <Input {...field} type="time" defaultValue="21:30" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                ) : (
                  <>
                    <FormField
                      control={form.control}
                      name="heure_debut_matin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Début matin</FormLabel>
                          <FormControl>
                            <Input {...field} type="time" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="heure_fin_matin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fin matin</FormLabel>
                          <FormControl>
                            <Input {...field} type="time" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="heure_debut_aprem"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Début après-midi</FormLabel>
                          <FormControl>
                            <Input {...field} type="time" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="heure_fin_aprem"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fin après-midi</FormLabel>
                          <FormControl>
                            <Input {...field} type="time" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="duree_heures"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Durée totale (heures)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min={0} placeholder="14" />
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

            <Separator />

            {/* Lieu */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                <MapPin className="h-4 w-4" />
                Lieu de formation
              </div>
              
              <FormField
                control={form.control}
                name="adresse_rue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="123 rue de la Formation" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="adresse_code_postal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code postal</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="75001" maxLength={10} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="adresse_ville"
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

            <Separator />

            {/* Tarification */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                <Euro className="h-4 w-4" />
                Tarification
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="prix_ht"
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

                <div className="flex items-end">
                  <p className="text-xs text-muted-foreground pb-3">TVA non applicable — art. 293 B du CGI</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Contenu pédagogique */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Contenu pédagogique
              </div>
              
              <FormField
                control={form.control}
                name="objectifs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Objectifs de la formation</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Décrire les objectifs pédagogiques..." rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="prerequis"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prérequis</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Lister les prérequis pour cette formation..." rows={2} />
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
                    <FormLabel>Description / Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Description complémentaire..." rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 sticky bottom-0 bg-background pb-2 sm:pb-0 sm:static border-t sm:border-t-0 mt-4 sm:mt-0 -mx-6 px-6 sm:mx-0 sm:px-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-10 sm:h-9">
                Annuler
              </Button>
              <Button type="submit" disabled={isLoading} className="h-10 sm:h-9">
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
