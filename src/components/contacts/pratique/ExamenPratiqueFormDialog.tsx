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
  type ExamenResultat
} from "@/hooks/useExamensPratique";

interface ExamenPratiqueFormDialogProps {
  ficheId: string;
  contactId: string;
  formationType: string;
  examen?: ExamenPratique | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExamenPratiqueFormDialog({ 
  ficheId, 
  contactId,
  formationType,
  examen, 
  open, 
  onOpenChange 
}: ExamenPratiqueFormDialogProps) {
  const [formData, setFormData] = useState({
    type_examen: examen?.type_examen || formationType.toLowerCase(),
    date_examen: examen?.date_examen || "",
    heure_examen: examen?.heure_examen || "",
    centre_examen: examen?.centre_examen || "",
    adresse_centre: examen?.adresse_centre || "",
    statut: (examen?.statut || "planifie") as ExamenStatut,
    resultat: (examen?.resultat || "") as ExamenResultat | "",
    score: examen?.score || null,
    observations: examen?.observations || "",
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
        ...formData,
        heure_examen: formData.heure_examen || null,
        centre_examen: formData.centre_examen || null,
        adresse_centre: formData.adresse_centre || null,
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier l'examen" : "Planifier un examen"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="type_examen">Type d'examen</Label>
              <Select
                value={formData.type_examen}
                onValueChange={(value) => setFormData(prev => ({ ...prev, type_examen: value }))}
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
                onValueChange={(value) => setFormData(prev => ({ ...prev, statut: value as ExamenStatut }))}
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
                onChange={(e) => setFormData(prev => ({ ...prev, date_examen: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heure_examen">Heure</Label>
              <Input
                id="heure_examen"
                type="time"
                value={formData.heure_examen}
                onChange={(e) => setFormData(prev => ({ ...prev, heure_examen: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="centre_examen">Centre d'examen</Label>
            <Input
              id="centre_examen"
              value={formData.centre_examen}
              onChange={(e) => setFormData(prev => ({ ...prev, centre_examen: e.target.value }))}
              placeholder="Nom du centre"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adresse_centre">Adresse du centre</Label>
            <Input
              id="adresse_centre"
              value={formData.adresse_centre}
              onChange={(e) => setFormData(prev => ({ ...prev, adresse_centre: e.target.value }))}
              placeholder="Adresse complète"
            />
          </div>

          {/* Results section - show only for certain statuses */}
          {["passe", "reussi", "echoue"].includes(formData.statut) && (
            <>
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-3">Résultats</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="resultat">Résultat</Label>
                    <Select
                      value={formData.resultat}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, resultat: value as ExamenResultat }))}
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
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        score: e.target.value ? parseFloat(e.target.value) : null 
                      }))}
                      placeholder="Note obtenue"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="observations">Observations</Label>
            <Textarea
              id="observations"
              value={formData.observations}
              onChange={(e) => setFormData(prev => ({ ...prev, observations: e.target.value }))}
              rows={2}
              placeholder="Notes, remarques..."
            />
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
