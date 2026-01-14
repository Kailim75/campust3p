import { useState } from "react";
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
import { useCreateFichePratique, useUpdateFichePratique, fichePratiqueStatutConfig, type FichePratique, type FichePratiqueStatut } from "@/hooks/useFichesPratique";

const formationTypes = ["TAXI", "VTC", "VMDTR"];

interface FichePratiqueFormDialogProps {
  contactId: string;
  fiche?: FichePratique | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FichePratiqueFormDialog({ 
  contactId, 
  fiche, 
  open, 
  onOpenChange 
}: FichePratiqueFormDialogProps) {
  const [formData, setFormData] = useState({
    formation_type: fiche?.formation_type || "",
    heures_prevues: fiche?.heures_prevues || 0,
    date_debut: fiche?.date_debut || "",
    date_fin_prevue: fiche?.date_fin_prevue || "",
    statut: (fiche?.statut || "non_commencee") as FichePratiqueStatut,
    notes: fiche?.notes || "",
  });

  const createMutation = useCreateFichePratique();
  const updateMutation = useUpdateFichePratique();
  const isEditing = !!fiche;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.formation_type) {
      return;
    }

    try {
      if (isEditing && fiche) {
        await updateMutation.mutateAsync({
          id: fiche.id,
          contactId,
          ...formData,
          date_debut: formData.date_debut || null,
          date_fin_prevue: formData.date_fin_prevue || null,
          notes: formData.notes || null,
        });
      } else {
        await createMutation.mutateAsync({
          contact_id: contactId,
          ...formData,
          date_debut: formData.date_debut || null,
          date_fin_prevue: formData.date_fin_prevue || null,
          notes: formData.notes || null,
        });
      }
      onOpenChange(false);
      resetForm();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const resetForm = () => {
    setFormData({
      formation_type: "",
      heures_prevues: 0,
      date_debut: "",
      date_fin_prevue: "",
      statut: "non_commencee",
      notes: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier la fiche pratique" : "Nouvelle fiche pratique"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="formation_type">Type de formation *</Label>
            <Select
              value={formData.formation_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, formation_type: value }))}
              disabled={isEditing}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                {formationTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="heures_prevues">Heures prévues</Label>
              <Input
                id="heures_prevues"
                type="number"
                min="0"
                value={formData.heures_prevues}
                onChange={(e) => setFormData(prev => ({ ...prev, heures_prevues: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="statut">Statut</Label>
              <Select
                value={formData.statut}
                onValueChange={(value) => setFormData(prev => ({ ...prev, statut: value as FichePratiqueStatut }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(fichePratiqueStatutConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date_debut">Date de début</Label>
              <Input
                id="date_debut"
                type="date"
                value={formData.date_debut}
                onChange={(e) => setFormData(prev => ({ ...prev, date_debut: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_fin_prevue">Date fin prévue</Label>
              <Input
                id="date_fin_prevue"
                type="date"
                value={formData.date_fin_prevue}
                onChange={(e) => setFormData(prev => ({ ...prev, date_fin_prevue: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              placeholder="Commentaires, objectifs..."
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
              {isEditing ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
