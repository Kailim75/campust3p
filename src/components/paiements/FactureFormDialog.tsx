import { useState, useEffect, useRef } from "react";
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
import { Badge } from "@/components/ui/badge";

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
import { useCatalogueFormations, type CatalogueFormation } from "@/hooks/useCatalogueFormations";
import { useCreateFactureLignes, useDeleteFactureLignesByFacture, useFactureLignes } from "@/hooks/useFactureLignes";
import { Loader2, Plus, Trash2, Package } from "lucide-react";

/** Intitulés officiels pour les factures selon la catégorie */
const INTITULE_FACTURE: Record<string, string> = {
  "VTC": "Habilitation pour l'accès à la profession de conducteur de voiture de transport avec chauffeur (VTC)",
  "Taxi": "Habilitation pour l'accès à la profession de conducteur de taxi",
  "VMDTR": "Habilitation pour l'accès à la profession de conducteur de véhicule motorisé à deux ou trois roues (VMDTR)",
};

/** Retourne l'intitulé officiel pour la facture si la catégorie correspond */
const getDescriptionFacture = (item: CatalogueFormation): string => {
  return INTITULE_FACTURE[item.categorie] || item.intitule;
};

interface LigneFacture {
  id: string;
  catalogue_formation_id: string | null;
  description: string;
  quantite: number;
  prix_unitaire_ht: number;
  tva_percent: number;
  remise_percent: number;
}

const formSchema = z.object({
  contact_id: z.string().min(1, "Veuillez sélectionner un contact"),
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
  const [lignes, setLignes] = useState<LigneFacture[]>([]);
  const [showAllCatalogue, setShowAllCatalogue] = useState(false);
  
  const { data: contacts = [] } = useContacts();
  const { data: catalogue = [] } = useCatalogueFormations(true);
  const { data: nextNumero } = useGenerateNumeroFacture();
  const { data: existingLignes = [], isLoading: lignesLoading } = useFactureLignes(facture?.id || null);
  const createFacture = useCreateFacture();
  const updateFacture = useUpdateFacture();
  const createLignes = useCreateFactureLignes();
  const deleteLignes = useDeleteFactureLignesByFacture();

  const isEditing = !!facture;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contact_id: defaultContactId || "",
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
        type_financement: facture.type_financement,
        statut: facture.statut,
        date_emission: facture.date_emission || "",
        date_echeance: facture.date_echeance || "",
        commentaires: facture.commentaires || "",
      });
    } else {
      form.reset({
        contact_id: defaultContactId || "",
        type_financement: "personnel",
        statut: "brouillon",
        date_emission: "",
        date_echeance: "",
        commentaires: "",
      });
      setLignes([]);
    }
  }, [facture, defaultContactId, form, open]);

  // Charger les lignes existantes en mode édition - utiliser une ref pour éviter les boucles infinies
  const existingLignesLoadedRef = useRef(false);
  
  useEffect(() => {
    // Reset le flag quand on ferme/ouvre ou change de facture
    if (!open) {
      existingLignesLoadedRef.current = false;
      return;
    }
    
    if (isEditing && existingLignes.length > 0 && !existingLignesLoadedRef.current) {
      existingLignesLoadedRef.current = true;
      setLignes(existingLignes.map(l => ({
        id: l.id,
        catalogue_formation_id: l.catalogue_formation_id,
        description: l.description,
        quantite: l.quantite,
        prix_unitaire_ht: l.prix_unitaire_ht,
        tva_percent: l.tva_percent,
        remise_percent: 0,
      })));
    } else if (!isEditing && !existingLignesLoadedRef.current) {
      existingLignesLoadedRef.current = true;
      setLignes([]);
    }
  }, [isEditing, existingLignes, open]);

  const addLigne = (item?: CatalogueFormation) => {
    const prixApresRemiseCatalogue = item ? item.prix_ht * (1 - (item.remise_percent || 0) / 100) : 0;
    const newLigne: LigneFacture = {
      id: crypto.randomUUID(),
      catalogue_formation_id: item?.id || null,
      description: item ? getDescriptionFacture(item) : "",
      quantite: 1,
      prix_unitaire_ht: prixApresRemiseCatalogue,
      tva_percent: item?.tva_percent || 0,
      remise_percent: 0,
    };
    setLignes([...lignes, newLigne]);
  };

  const updateLigne = (id: string, field: keyof LigneFacture, value: any) => {
    setLignes(lignes.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const removeLigne = (id: string) => {
    setLignes(lignes.filter(l => l.id !== id));
  };

  const selectCatalogueItem = (ligneId: string, catalogueId: string) => {
    const item = catalogue.find(c => c.id === catalogueId);
    if (item) {
      const prixApresRemiseCatalogue = item.prix_ht * (1 - (item.remise_percent || 0) / 100);
      setLignes(lignes.map(l => l.id === ligneId ? {
        ...l,
        catalogue_formation_id: item.id,
        description: getDescriptionFacture(item),
        prix_unitaire_ht: prixApresRemiseCatalogue,
        tva_percent: item.tva_percent,
        remise_percent: 0,
      } : l));
    }
  };

  const calculateLigneTotal = (l: LigneFacture) => Math.round(l.quantite * l.prix_unitaire_ht * (1 - l.remise_percent / 100));
  const totalMontant = lignes.reduce((acc, l) => acc + calculateLigneTotal(l), 0);

  const onSubmit = async (values: FormValues) => {
    if (lignes.length === 0) {
      toast.error("Ajoutez au moins un article à la facture");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && facture) {
        // Mise à jour facture
        await updateFacture.mutateAsync({
          id: facture.id,
          contact_id: values.contact_id,
          montant_total: totalMontant,
          type_financement: values.type_financement,
          statut: values.statut,
          date_emission: values.date_emission || null,
          date_echeance: values.date_echeance || null,
          commentaires: values.commentaires || null,
        });
        
        // Supprimer anciennes lignes et créer nouvelles
        await deleteLignes.mutateAsync(facture.id);
        await createLignes.mutateAsync(
          lignes.map((l, idx) => ({
            facture_id: facture.id,
            catalogue_formation_id: l.catalogue_formation_id,
            description: l.description,
            quantite: l.quantite,
            prix_unitaire_ht: l.prix_unitaire_ht,
            tva_percent: l.tva_percent,
            ordre: idx,
          }))
        );
        
        toast.success("Facture mise à jour");
      } else {
        // Création facture
        const newFacture = await createFacture.mutateAsync({
          contact_id: values.contact_id,
          numero_facture: nextNumero || `FAC-${Date.now()}`,
          montant_total: totalMontant,
          type_financement: values.type_financement,
          statut: values.statut,
          date_emission: values.date_emission || null,
          date_echeance: values.date_echeance || null,
          commentaires: values.commentaires || null,
        });

        // Créer les lignes
        await createLignes.mutateAsync(
          lignes.map((l, idx) => ({
            facture_id: newFacture.id,
            catalogue_formation_id: l.catalogue_formation_id,
            description: l.description,
            quantite: l.quantite,
            prix_unitaire_ht: l.prix_unitaire_ht,
            tva_percent: l.tva_percent,
            ordre: idx,
          }))
        );

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

  const formatPrix = (prix: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(prix);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier la facture" : "Nouvelle facture"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-4">
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

                {/* Lignes de facture */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <FormLabel>Articles / Formations</FormLabel>
                    <Button type="button" variant="outline" size="sm" onClick={() => addLigne()}>
                      <Plus className="h-3 w-3 mr-1" />
                      Ligne libre
                    </Button>
                  </div>

                  {/* Catalogue rapide */}
                  <div className="flex flex-wrap gap-1">
                    {(showAllCatalogue ? catalogue : catalogue.slice(0, 8)).map((item) => (
                      <Button
                        key={item.id}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => addLigne(item)}
                      >
                        <Package className="h-3 w-3 mr-1" />
                        {item.code}
                      </Button>
                    ))}
                    {catalogue.length > 8 && !showAllCatalogue && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => setShowAllCatalogue(true)}
                      >
                        +{catalogue.length - 8} articles
                      </Button>
                    )}
                    {showAllCatalogue && catalogue.length > 8 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => setShowAllCatalogue(false)}
                      >
                        Réduire
                      </Button>
                    )}
                  </div>

                  {/* Liste des lignes */}
                  {lignes.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground border rounded-lg border-dashed">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Ajoutez des articles depuis le catalogue</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {lignes.map((ligne, idx) => (
                        <div key={ligne.id} className="flex gap-2 items-start p-2 border rounded-lg bg-muted/30">
                          <div className="flex-1 space-y-2">
                            <div className="flex gap-2">
                              <Select 
                                value={ligne.catalogue_formation_id || ""} 
                                onValueChange={(v) => selectCatalogueItem(ligne.id, v)}
                              >
                                <SelectTrigger className="w-[200px]">
                                  <SelectValue placeholder="Choisir article..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {catalogue.map((item) => (
                                    <SelectItem key={item.id} value={item.id}>
                                      {item.code} - {item.intitule}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input
                                className="flex-1"
                                value={ligne.description}
                                onChange={(e) => updateLigne(ligne.id, "description", e.target.value)}
                                placeholder="Description"
                              />
                            </div>
                            <div className="flex gap-2 items-center flex-wrap">
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  min="1"
                                  className="w-16"
                                  value={ligne.quantite}
                                  onChange={(e) => updateLigne(ligne.id, "quantite", parseInt(e.target.value) || 1)}
                                />
                                <span className="text-xs text-muted-foreground">×</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  step="0.01"
                                  className="w-24"
                                  value={ligne.prix_unitaire_ht}
                                  onChange={(e) => updateLigne(ligne.id, "prix_unitaire_ht", parseFloat(e.target.value) || 0)}
                                />
                                <span className="text-xs text-muted-foreground">€</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="any"
                                  className="w-16"
                                  value={ligne.remise_percent}
                                  onChange={(e) => updateLigne(ligne.id, "remise_percent", parseFloat(e.target.value) || 0)}
                                  placeholder="0"
                                />
                                <span className="text-xs text-muted-foreground">%</span>
                              </div>
                              <div className="flex items-center gap-1 ml-auto">
                                <span className="text-xs text-muted-foreground">=</span>
                                <Input
                                  type="number"
                                  min="0"
                                  step="1"
                                  className="w-24 font-medium"
                                  value={Math.round(calculateLigneTotal(ligne))}
                                  onChange={(e) => {
                                    const prixFinal = parseFloat(e.target.value) || 0;
                                    const prixBase = ligne.quantite * ligne.prix_unitaire_ht;
                                    if (prixBase > 0) {
                                      const newRemise = Math.round(((prixBase - prixFinal) / prixBase) * 10000) / 100;
                                      updateLigne(ligne.id, "remise_percent", Math.max(0, Math.min(100, newRemise)));
                                    }
                                  }}
                                />
                                <span className="text-xs text-muted-foreground">€</span>
                              </div>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => removeLigne(ligne.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Totaux */}
                  {lignes.length > 0 && (
                    <div className="flex justify-end">
                      <div className="w-64 space-y-1 text-sm">
                        <div className="flex justify-between font-bold text-base pt-1 border-t">
                          <span>Total</span>
                          <span className="text-primary">{formatPrix(totalMontant)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">TVA non applicable — art. 293 B du CGI</p>
                      </div>
                    </div>
                  )}
                </div>

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
                        <Textarea rows={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting || lignes.length === 0}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? "Enregistrer" : "Créer la facture"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
