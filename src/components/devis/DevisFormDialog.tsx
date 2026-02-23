import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useContacts } from "@/hooks/useContacts";
import { useCatalogueFormations } from "@/hooks/useCatalogueFormations";
import {
  useCreateDevis,
  useUpdateDevis,
  useAddDevisLignes,
  useDeleteDevisLignes,
  generateNumeroDevis,
  type Devis,
  type FinancementType,
} from "@/hooks/useDevis";
import { format, addDays } from "date-fns";

interface DevisFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  devis: Devis | null;
}

interface LigneForm {
  id: string;
  catalogue_formation_id: string | null;
  description: string;
  quantite: number;
  prix_unitaire_ht: number;
  tva_percent: number;
  remise_percent: number;
}

export function DevisFormDialog({ open, onOpenChange, devis }: DevisFormDialogProps) {
  const [numeroDevis, setNumeroDevis] = useState("");
  const [contactId, setContactId] = useState("");
  const [typeFinancement, setTypeFinancement] = useState<FinancementType>("personnel");
  const [dateEmission, setDateEmission] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dateValidite, setDateValidite] = useState(format(addDays(new Date(), 30), "yyyy-MM-dd"));
  const [commentaires, setCommentaires] = useState("");
  const [lignes, setLignes] = useState<LigneForm[]>([]);
  const [isGeneratingNumero, setIsGeneratingNumero] = useState(false);

  const { data: contacts = [] } = useContacts();
  const { data: catalogue = [] } = useCatalogueFormations(true);
  const createDevis = useCreateDevis();
  const updateDevis = useUpdateDevis();
  const addLignes = useAddDevisLignes();
  const deleteLignes = useDeleteDevisLignes();

  const isEditing = !!devis?.id;

  useEffect(() => {
    if (open) {
      if (devis) {
        setNumeroDevis(devis.numero_devis);
        setContactId(devis.contact_id);
        setTypeFinancement(devis.type_financement);
        setDateEmission(devis.date_emission || format(new Date(), "yyyy-MM-dd"));
        setDateValidite(devis.date_validite || format(addDays(new Date(), 30), "yyyy-MM-dd"));
        setCommentaires(devis.commentaires || "");
        setLignes(
          devis.lignes?.map((l) => ({
            id: l.id,
            catalogue_formation_id: l.catalogue_formation_id,
            description: l.description,
            quantite: l.quantite,
            prix_unitaire_ht: Number(l.prix_unitaire_ht),
            tva_percent: Number(l.tva_percent),
            remise_percent: Number(l.remise_percent),
          })) || []
        );
      } else {
        resetForm();
        generateNewNumero();
      }
    }
  }, [devis, open]);

  const resetForm = () => {
    setNumeroDevis("");
    setContactId("");
    setTypeFinancement("personnel");
    setDateEmission(format(new Date(), "yyyy-MM-dd"));
    setDateValidite(format(addDays(new Date(), 30), "yyyy-MM-dd"));
    setCommentaires("");
    setLignes([]);
  };

  const generateNewNumero = async () => {
    setIsGeneratingNumero(true);
    try {
      const numero = await generateNumeroDevis();
      setNumeroDevis(numero);
    } catch (error) {
      console.error("Error generating numero:", error);
    } finally {
      setIsGeneratingNumero(false);
    }
  };

  const addLigne = () => {
    setLignes([
      ...lignes,
      {
        id: crypto.randomUUID(),
        catalogue_formation_id: null,
        description: "",
        quantite: 1,
        prix_unitaire_ht: 0,
        tva_percent: 0,
        remise_percent: 0,
      },
    ]);
  };

  const removeLigne = (id: string) => {
    setLignes(lignes.filter((l) => l.id !== id));
  };

  const updateLigne = (id: string, field: keyof LigneForm, value: any) => {
    setLignes(
      lignes.map((l) => (l.id === id ? { ...l, [field]: value } : l))
    );
  };

  const selectCatalogueItem = (ligneId: string, catalogueId: string) => {
    const item = catalogue.find((c) => c.id === catalogueId);
    if (item) {
      const prixApresRemise = item.prix_ht * (1 - (item.remise_percent || 0) / 100);
      setLignes(
        lignes.map((l) =>
          l.id === ligneId
            ? {
                ...l,
                catalogue_formation_id: catalogueId,
                description: item.intitule,
                prix_unitaire_ht: prixApresRemise,
                tva_percent: item.tva_percent,
                remise_percent: 0, // La remise catalogue est déjà appliquée au prix
              }
            : l
        )
      );
    }
  };

  const calculateLigneTotal = (ligne: LigneForm) => {
    const total = ligne.quantite * ligne.prix_unitaire_ht * (1 - ligne.remise_percent / 100);
    return { ht: total, ttc: total };
  };

  const totaux = lignes.reduce(
    (acc, ligne) => {
      const { ht, ttc } = calculateLigneTotal(ligne);
      return { ht: acc.ht + ht, ttc: acc.ttc + ttc };
    },
    { ht: 0, ttc: 0 }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isEditing) {
        await updateDevis.mutateAsync({
          id: devis.id,
          contact_id: contactId,
          type_financement: typeFinancement,
          montant_total: totaux.ttc,
          date_emission: dateEmission,
          date_validite: dateValidite,
          commentaires: commentaires || null,
        });

        // Supprimer et recréer les lignes
        await deleteLignes.mutateAsync(devis.id);
        if (lignes.length > 0) {
          await addLignes.mutateAsync(
            lignes.map((l, index) => ({
              devis_id: devis.id,
              catalogue_formation_id: l.catalogue_formation_id,
              description: l.description,
              quantite: l.quantite,
              prix_unitaire_ht: l.prix_unitaire_ht,
              tva_percent: l.tva_percent,
              remise_percent: l.remise_percent,
              ordre: index,
            }))
          );
        }
      } else {
        const newDevis = await createDevis.mutateAsync({
          numero_devis: numeroDevis,
          contact_id: contactId,
          type_financement: typeFinancement,
          montant_total: totaux.ttc,
          date_emission: dateEmission,
          date_validite: dateValidite,
          commentaires: commentaires || null,
        });

        if (lignes.length > 0) {
          await addLignes.mutateAsync(
            lignes.map((l, index) => ({
              devis_id: newDevis.id,
              catalogue_formation_id: l.catalogue_formation_id,
              description: l.description,
              quantite: l.quantite,
              prix_unitaire_ht: l.prix_unitaire_ht,
              tva_percent: l.tva_percent,
              remise_percent: l.remise_percent,
              ordre: index,
            }))
          );
        }
      }

      onOpenChange(false);
    } catch (error) {
      console.error("Error saving devis:", error);
    }
  };

  const isPending = createDevis.isPending || updateDevis.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Modifier le devis" : "Nouveau devis"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Modifiez les informations du devis" : "Créez un devis pour un client"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Infos générales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>N° Devis</Label>
              <div className="h-10 px-3 py-2 rounded-md border bg-muted text-sm font-mono">
                {isGeneratingNumero ? <Loader2 className="h-4 w-4 animate-spin" /> : numeroDevis}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact">Client *</Label>
              <Select value={contactId} onValueChange={setContactId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.prenom} {contact.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="financement">Financement</Label>
              <Select
                value={typeFinancement}
                onValueChange={(v) => setTypeFinancement(v as FinancementType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personnel">Personnel</SelectItem>
                  <SelectItem value="entreprise">Entreprise</SelectItem>
                  <SelectItem value="cpf">CPF</SelectItem>
                  <SelectItem value="opco">OPCO</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateValidite">Validité jusqu'au</Label>
              <Input
                id="dateValidite"
                type="date"
                value={dateValidite}
                onChange={(e) => setDateValidite(e.target.value)}
              />
            </div>
          </div>

          {/* Lignes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base">Lignes du devis</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLigne}>
                <Plus className="h-4 w-4 mr-1" />
                Ajouter une ligne
              </Button>
            </div>

            {/* Quick add from catalogue */}
            {catalogue.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {catalogue.slice(0, 6).map((item) => (
                  <Button
                    key={item.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      const newId = crypto.randomUUID();
                      const prixApresRemise = item.prix_ht * (1 - (item.remise_percent || 0) / 100);
                      setLignes([
                        ...lignes,
                        {
                          id: newId,
                          catalogue_formation_id: item.id,
                          description: item.intitule,
                          quantite: 1,
                          prix_unitaire_ht: prixApresRemise,
                          tva_percent: item.tva_percent,
                          remise_percent: 0,
                        },
                      ]);
                    }}
                  >
                    + {item.code}
                  </Button>
                ))}
              </div>
            )}

            {lignes.length === 0 ? (
              <div className="border rounded-lg p-8 text-center text-muted-foreground">
                Aucune ligne. Cliquez sur "Ajouter une ligne" ou sélectionnez un article du catalogue.
              </div>
            ) : (
              <div className="border rounded-lg divide-y">
                {lignes.map((ligne, index) => {
                  const { ht, ttc } = calculateLigneTotal(ligne);
                  return (
                    <div key={ligne.id} className="p-4 space-y-3">
                      <div className="flex items-start gap-4">
                        <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-7 gap-3">
                          <div className="md:col-span-2">
                            <Label className="text-xs">Description</Label>
                            <Input
                              value={ligne.description}
                              onChange={(e) => updateLigne(ligne.id, "description", e.target.value)}
                              placeholder="Description..."
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Qté</Label>
                            <Input
                              type="number"
                              min="1"
                              value={ligne.quantite}
                              onChange={(e) =>
                                updateLigne(ligne.id, "quantite", parseInt(e.target.value) || 1)
                              }
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Prix unitaire</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={ligne.prix_unitaire_ht}
                              onChange={(e) =>
                                updateLigne(ligne.id, "prix_unitaire_ht", parseFloat(e.target.value) || 0)
                              }
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Remise %</Label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              value={ligne.remise_percent}
                              onChange={(e) =>
                                updateLigne(ligne.id, "remise_percent", parseFloat(e.target.value) || 0)
                              }
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Total</Label>
                            <div className="h-10 px-3 py-2 rounded-md border bg-muted text-sm font-medium">
                              {ht.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€
                            </div>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => removeLigne(ligne.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Totaux */}
            {lignes.length > 0 && (
              <div className="flex justify-end">
                <div className="w-64 space-y-2 p-4 bg-muted/50 rounded-lg">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">
                      {totaux.ht.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">TVA non applicable — art. 293 B du CGI</p>
                </div>
              </div>
            )}
          </div>

          {/* Commentaires */}
          <div className="space-y-2">
            <Label htmlFor="commentaires">Commentaires</Label>
            <Textarea
              id="commentaires"
              value={commentaires}
              onChange={(e) => setCommentaires(e.target.value)}
              placeholder="Notes internes ou conditions particulières..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending || !contactId || lignes.length === 0}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isEditing ? "Mise à jour..." : "Création..."}
                </>
              ) : isEditing ? (
                "Enregistrer"
              ) : (
                "Créer le devis"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
