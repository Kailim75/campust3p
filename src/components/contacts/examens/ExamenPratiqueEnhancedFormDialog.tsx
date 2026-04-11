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
import {
  useCreateExamenPratique,
  useUpdateExamenPratique,
  examenStatutConfig,
  examenResultatConfig,
  type ExamenPratique,
  type ExamenStatut,
  type ExamenResultat,
} from "@/hooks/useExamensPratique";
import { useFormateurs } from "@/hooks/useFormateurs";
import { useVehicules } from "@/hooks/useVehicules";

interface ExamenPratiqueEnhancedFormDialogProps {
  ficheId: string;
  contactId: string;
  formationType: string;
  examen?: ExamenPratique | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tentativeNumber: number;
}

export function ExamenPratiqueEnhancedFormDialog({
  ficheId,
  contactId,
  formationType,
  examen,
  open,
  onOpenChange,
  tentativeNumber,
}: ExamenPratiqueEnhancedFormDialogProps) {
  const { data: formateurs = [] } = useFormateurs();
  const { data: vehicules = [] } = useVehicules();

  const [formData, setFormData] = useState({
    type_examen: examen?.type_examen || formationType.toLowerCase(),
    date_examen: examen?.date_examen || "",
    heure_examen: examen?.heure_examen || "",
    centre_examen: examen?.centre_examen || "",
    adresse_centre: examen?.adresse_centre || "",
    statut: (examen?.statut || "planifie") as ExamenStatut,
    resultat: (examen?.resultat || "") as ExamenResultat | "",
    score: examen?.score ?? null,
    observations: examen?.observations || "",
    evaluateur_id: (examen as any)?.evaluateur_id || "",
    vehicule_id: (examen as any)?.vehicule_id || "",
  });

  useEffect(() => {
    if (examen) {
      setFormData({
        type_examen: examen.type_examen,
        date_examen: examen.date_examen,
        heure_examen: examen.heure_examen || "",
        centre_examen: examen.centre_examen || "",
        adresse_centre: examen.adresse_centre || "",
        statut: examen.statut,
        resultat: examen.resultat || "",
        score: examen.score,
        observations: examen.observations || "",
        evaluateur_id: (examen as any)?.evaluateur_id || "",
        vehicule_id: (examen as any)?.vehicule_id || "",
      });
    } else {
      setFormData({
        type_examen: formationType.toLowerCase(),
        date_examen: "",
        heure_examen: "",
        centre_examen: "",
        adresse_centre: "",
        statut: "planifie",
        resultat: "",
        score: null,
        observations: "",
        evaluateur_id: "",
        vehicule_id: "",
      });
    }
  }, [examen, formationType, open]);

  const createMutation = useCreateExamenPratique();
  const updateMutation = useUpdateExamenPratique();
  const isEditing = !!examen;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.date_examen) {
      return;
    }

    try {
      const payload = {
        type_examen: formData.type_examen,
        date_examen: formData.date_examen,
        heure_examen: formData.heure_examen || null,
        centre_examen: formData.centre_examen || null,
        adresse_centre: formData.adresse_centre || null,
        statut: formData.statut,
        resultat: formData.resultat || null,
        score: formData.score,
        observations: formData.observations || null,
        document_resultat_path: null,
      };

      if (isEditing && examen) {
        await updateMutation.mutateAsync({
          id: examen.id,
          fichePratiqueId: ficheId,
          contactId,
          ...payload,
        });
      } else {
        await createMutation.mutateAsync({
          fiche_pratique_id: ficheId,
          contact_id: contactId,
          ...payload,
        });
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier l'examen pratique" : "Planifier un examen pratique"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="type_examen">Type d'examen</Label>
              <Select
                value={formData.type_examen}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, type_examen: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="taxi">Taxi</SelectItem>
                  <SelectItem value="vtc">VTC</SelectItem>
                  <SelectItem value="vmdtr">VMDTR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="statut">Statut</Label>
              <Select
                value={formData.statut}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, statut: value as ExamenStatut }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(examenStatutConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="date_examen">Date *</Label>
              <Input
                id="date_examen"
                type="date"
                value={formData.date_examen}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, date_examen: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heure_examen">Heure</Label>
              <Input
                id="heure_examen"
                type="time"
                value={formData.heure_examen}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, heure_examen: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="centre_examen">Lieu d'évaluation</Label>
            <Input
              id="centre_examen"
              value={formData.centre_examen}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, centre_examen: e.target.value }))
              }
              placeholder="Centre ou zone de pratique"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adresse_centre">Adresse</Label>
            <Input
              id="adresse_centre"
              value={formData.adresse_centre}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, adresse_centre: e.target.value }))
              }
              placeholder="Adresse complète"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="evaluateur_id">Évaluateur</Label>
              <Select
                value={formData.evaluateur_id}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, evaluateur_id: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {formateurs
                    .filter((f: any) => f.actif)
                    .map((formateur: any) => (
                      <SelectItem key={formateur.id} value={formateur.id}>
                        {formateur.prenom} {formateur.nom}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicule_id">Véhicule</Label>
              <Select
                value={formData.vehicule_id}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, vehicule_id: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {vehicules
                    .filter((v) => v.actif)
                    .map((vehicule) => (
                      <SelectItem key={vehicule.id} value={vehicule.id}>
                        {vehicule.marque} {vehicule.modele} - {vehicule.immatriculation}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Results section */}
          {["passe", "reussi", "echoue"].includes(formData.statut) && (
            <div className="border-t pt-4 space-y-3">
              <h4 className="text-sm font-medium">Résultats</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="resultat">Résultat</Label>
                  <Select
                    value={formData.resultat}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, resultat: value as ExamenResultat }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(examenResultatConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="score">Score</Label>
                  <Input
                    id="score"
                    type="number"
                    step="0.1"
                    value={formData.score ?? ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        score: e.target.value ? parseFloat(e.target.value) : null,
                      }))
                    }
                    placeholder="Note obtenue"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="observations">Observations de l'examinateur</Label>
            <Textarea
              id="observations"
              value={formData.observations}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, observations: e.target.value }))
              }
              rows={3}
              placeholder="Notes, remarques, points à améliorer..."
            />
          </div>

          <div className="text-xs text-muted-foreground">
            Tentative n°{tentativeNumber}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {isEditing ? "Enregistrer" : "Planifier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
