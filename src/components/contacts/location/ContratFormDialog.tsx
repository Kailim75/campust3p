import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  FileSignature, 
  Trash2, 
  Car, 
  Calendar, 
  Clock,
  Send,
  CheckCircle,
  XCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useCreateContratLocation,
  useUpdateContratLocation,
  useDeleteContratLocation,
  useContratHistorique,
  contratTypeLabels,
  contratStatutConfig,
  modalitePaiementOptions,
  type ContratLocation,
  type ContratLocationType,
  type ContratLocationStatut,
} from "@/hooks/useContratsLocation";
import { useActiveVehicules } from "@/hooks/useVehicules";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface ContratFormDialogProps {
  contactId: string;
  contrat?: ContratLocation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContratFormDialog({
  contactId,
  contrat,
  open,
  onOpenChange,
}: ContratFormDialogProps) {
  const { data: vehicules = [] } = useActiveVehicules();
  const { data: historique = [] } = useContratHistorique(contrat?.id || null);

  const createContrat = useCreateContratLocation();
  const updateContrat = useUpdateContratLocation();
  const deleteContrat = useDeleteContratLocation();

  const [formData, setFormData] = useState({
    type_contrat: contrat?.type_contrat || ("vehicule" as ContratLocationType),
    vehicule_id: contrat?.vehicule_id || "",
    objet_location: contrat?.objet_location || "",
    date_debut: contrat?.date_debut || new Date().toISOString().split("T")[0],
    date_fin: contrat?.date_fin || "",
    montant_mensuel: contrat?.montant_mensuel?.toString() || "",
    montant_caution: contrat?.montant_caution?.toString() || "",
    modalite_paiement: contrat?.modalite_paiement || "mensuel",
    conditions_particulieres: contrat?.conditions_particulieres || "",
    notes: contrat?.notes || "",
    statut: contrat?.statut || ("brouillon" as ContratLocationStatut),
  });

  useEffect(() => {
    if (contrat) {
      setFormData({
        type_contrat: contrat.type_contrat,
        vehicule_id: contrat.vehicule_id || "",
        objet_location: contrat.objet_location,
        date_debut: contrat.date_debut,
        date_fin: contrat.date_fin,
        montant_mensuel: contrat.montant_mensuel.toString(),
        montant_caution: contrat.montant_caution?.toString() || "",
        modalite_paiement: contrat.modalite_paiement || "mensuel",
        conditions_particulieres: contrat.conditions_particulieres || "",
        notes: contrat.notes || "",
        statut: contrat.statut,
      });
    }
  }, [contrat]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.objet_location || !formData.date_debut || !formData.date_fin || !formData.montant_mensuel) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    try {
      if (contrat) {
        await updateContrat.mutateAsync({
          id: contrat.id,
          contactId,
          type_contrat: formData.type_contrat,
          vehicule_id: formData.vehicule_id || null,
          objet_location: formData.objet_location,
          date_debut: formData.date_debut,
          date_fin: formData.date_fin,
          montant_mensuel: parseFloat(formData.montant_mensuel),
          montant_caution: formData.montant_caution ? parseFloat(formData.montant_caution) : null,
          modalite_paiement: formData.modalite_paiement,
          conditions_particulieres: formData.conditions_particulieres || null,
          notes: formData.notes || null,
          statut: formData.statut,
        });
      } else {
        await createContrat.mutateAsync({
          contact_id: contactId,
          type_contrat: formData.type_contrat,
          vehicule_id: formData.vehicule_id || null,
          objet_location: formData.objet_location,
          date_debut: formData.date_debut,
          date_fin: formData.date_fin,
          montant_mensuel: parseFloat(formData.montant_mensuel),
          montant_caution: formData.montant_caution ? parseFloat(formData.montant_caution) : null,
          modalite_paiement: formData.modalite_paiement,
          conditions_particulieres: formData.conditions_particulieres || null,
          notes: formData.notes || null,
          statut: formData.statut,
        });
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving contrat:", error);
    }
  };

  const handleDelete = async () => {
    if (!contrat) return;
    try {
      await deleteContrat.mutateAsync({ id: contrat.id, contactId });
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting contrat:", error);
    }
  };

  const handleStatusChange = async (newStatut: ContratLocationStatut) => {
    if (!contrat) return;
    try {
      await updateContrat.mutateAsync({
        id: contrat.id,
        contactId,
        statut: newStatut,
      });
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const isEditing = !!contrat;
  const isPending = createContrat.isPending || updateContrat.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-primary" />
            <DialogTitle>
              {isEditing ? `Contrat ${contrat.numero_contrat}` : "Nouveau contrat de location"}
            </DialogTitle>
          </div>
          {isEditing && (
            <Badge variant="outline" className={cn("w-fit", contratStatutConfig[contrat.statut].class)}>
              {contratStatutConfig[contrat.statut].label}
            </Badge>
          )}
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Détails</TabsTrigger>
            {isEditing && <TabsTrigger value="historique">Historique</TabsTrigger>}
          </TabsList>

          <TabsContent value="details">
            <ScrollArea className="h-[500px] pr-4">
              <form onSubmit={handleSubmit} className="space-y-4 py-2">
                {/* Type de contrat */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type de contrat *</Label>
                    <Select
                      value={formData.type_contrat}
                      onValueChange={(value: ContratLocationType) =>
                        setFormData({ ...formData, type_contrat: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(contratTypeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.type_contrat === "vehicule" && (
                    <div className="space-y-2">
                      <Label>Véhicule</Label>
                      <Select
                        value={formData.vehicule_id}
                        onValueChange={(value) =>
                          setFormData({ ...formData, vehicule_id: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                        <SelectContent>
                          {vehicules.map((v) => (
                            <SelectItem key={v.id} value={v.id}>
                              <span className="flex items-center gap-2">
                                <Car className="h-3 w-3" />
                                {v.marque} {v.modele} - {v.immatriculation}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Objet */}
                <div className="space-y-2">
                  <Label>Objet de la location *</Label>
                  <Input
                    value={formData.objet_location}
                    onChange={(e) =>
                      setFormData({ ...formData, objet_location: e.target.value })
                    }
                    placeholder="Description de l'objet loué"
                  />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date de début *</Label>
                    <Input
                      type="date"
                      value={formData.date_debut}
                      onChange={(e) =>
                        setFormData({ ...formData, date_debut: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date de fin *</Label>
                    <Input
                      type="date"
                      value={formData.date_fin}
                      onChange={(e) =>
                        setFormData({ ...formData, date_fin: e.target.value })
                      }
                    />
                  </div>
                </div>

                {/* Montants */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Montant mensuel (€) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.montant_mensuel}
                      onChange={(e) =>
                        setFormData({ ...formData, montant_mensuel: e.target.value })
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Caution (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.montant_caution}
                      onChange={(e) =>
                        setFormData({ ...formData, montant_caution: e.target.value })
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Modalité paiement</Label>
                    <Select
                      value={formData.modalite_paiement}
                      onValueChange={(value) =>
                        setFormData({ ...formData, modalite_paiement: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {modalitePaiementOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Statut (only for editing) */}
                {isEditing && (
                  <div className="space-y-2">
                    <Label>Statut</Label>
                    <Select
                      value={formData.statut}
                      onValueChange={(value: ContratLocationStatut) =>
                        setFormData({ ...formData, statut: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(contratStatutConfig).map(([value, config]) => (
                          <SelectItem key={value} value={value}>
                            <span className={cn("px-2 py-0.5 rounded text-xs", config.class)}>
                              {config.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Conditions particulières */}
                <div className="space-y-2">
                  <Label>Conditions particulières</Label>
                  <Textarea
                    value={formData.conditions_particulieres}
                    onChange={(e) =>
                      setFormData({ ...formData, conditions_particulieres: e.target.value })
                    }
                    placeholder="Conditions spécifiques du contrat..."
                    rows={3}
                  />
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Notes internes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Notes..."
                    rows={2}
                  />
                </div>

                <DialogFooter className="pt-4 flex-col sm:flex-row gap-2">
                  {isEditing && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button type="button" variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4 mr-1" />
                          Supprimer
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer ce contrat ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Cette action est irréversible. Le contrat sera définitivement supprimé.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDelete}>
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  <div className="flex-1" />
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Enregistrement..." : isEditing ? "Mettre à jour" : "Créer"}
                  </Button>
                </DialogFooter>
              </form>
            </ScrollArea>
          </TabsContent>

          {isEditing && (
            <TabsContent value="historique">
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3 py-2">
                  {/* Quick actions */}
                  <div className="flex gap-2 flex-wrap">
                    {contrat.statut === "brouillon" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange("envoye")}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Marquer envoyé
                      </Button>
                    )}
                    {contrat.statut === "envoye" && (
                      <>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleStatusChange("signe")}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Marquer signé
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleStatusChange("refuse")}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Refusé
                        </Button>
                      </>
                    )}
                  </div>

                  <Separator />

                  {/* Historique list */}
                  {historique.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Aucun historique</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {historique.map((h) => (
                        <div key={h.id} className="p-3 border rounded-lg text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{h.action}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(h.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                            </span>
                          </div>
                          {h.ancien_statut && h.nouveau_statut && (
                            <p className="text-xs text-muted-foreground">
                              {h.ancien_statut} → {h.nouveau_statut}
                            </p>
                          )}
                          {h.details && (
                            <p className="text-xs text-muted-foreground mt-1">{h.details}</p>
                          )}
                          {h.user_email && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Par: {h.user_email}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
