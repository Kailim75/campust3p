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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  useCreateSeanceConduite, 
  useUpdateSeanceConduite, 
  typeSeanceOptions, 
  parcoursOptions,
  type SeanceConduite 
} from "@/hooks/useSeancesConduite";
import { useActiveVehicules } from "@/hooks/useVehicules";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function useFormateursTable() {
  return useQuery({
    queryKey: ["formateurs-table"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("formateurs")
        .select("id, nom, prenom, actif")
        .eq("actif", true)
        .order("nom");
      if (error) throw error;
      return data;
    },
  });
}

interface SeanceConduiteFormDialogProps {
  ficheId: string;
  contactId: string;
  seance?: SeanceConduite | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SeanceConduiteFormDialog({ 
  ficheId, 
  contactId, 
  seance, 
  open, 
  onOpenChange 
}: SeanceConduiteFormDialogProps) {
  const { data: vehicules = [] } = useActiveVehicules();
  const { data: formateurs = [] } = useFormateursTable();

  const [formData, setFormData] = useState({
    date_seance: seance?.date_seance || new Date().toISOString().split("T")[0],
    heure_debut: seance?.heure_debut || "09:00",
    heure_fin: seance?.heure_fin || "11:00",
    type_seance: seance?.type_seance || "conduite",
    parcours: seance?.parcours || "",
    formateur_id: seance?.formateur_id || "",
    vehicule_id: seance?.vehicule_id || "",
    observations: seance?.observations || "",
    note_globale: seance?.note_globale || 0,
    validation_formateur: seance?.validation_formateur || false,
  });

  useEffect(() => {
    if (seance) {
      setFormData({
        date_seance: seance.date_seance,
        heure_debut: seance.heure_debut,
        heure_fin: seance.heure_fin,
        type_seance: seance.type_seance,
        parcours: seance.parcours || "",
        formateur_id: seance.formateur_id || "",
        vehicule_id: seance.vehicule_id || "",
        observations: seance.observations || "",
        note_globale: seance.note_globale || 0,
        validation_formateur: seance.validation_formateur,
      });
    } else {
      setFormData({
        date_seance: new Date().toISOString().split("T")[0],
        heure_debut: "09:00",
        heure_fin: "11:00",
        type_seance: "conduite",
        parcours: "",
        formateur_id: "",
        vehicule_id: "",
        observations: "",
        note_globale: 0,
        validation_formateur: false,
      });
    }
  }, [seance, open]);

  const createMutation = useCreateSeanceConduite();
  const updateMutation = useUpdateSeanceConduite();
  const isEditing = !!seance;

  // Calculate duration in minutes
  const calculateDuration = () => {
    const [startH, startM] = formData.heure_debut.split(":").map(Number);
    const [endH, endM] = formData.heure_fin.split(":").map(Number);
    return (endH * 60 + endM) - (startH * 60 + startM);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const duree = calculateDuration();
    if (duree <= 0) {
      return;
    }

    try {
      const payload = {
        ...formData,
        duree_minutes: duree,
        formateur_id: formData.formateur_id || null,
        vehicule_id: formData.vehicule_id || null,
        parcours: formData.parcours || null,
        observations: formData.observations || null,
        note_globale: formData.note_globale || null,
        date_validation: formData.validation_formateur ? new Date().toISOString() : null,
        signature_data: null,
        signature_url: null,
        competences_travaillees: null,
      };

      if (isEditing && seance) {
        await updateMutation.mutateAsync({
          id: seance.id,
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

  const duration = calculateDuration();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier la séance" : "Nouvelle séance de conduite"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="date_seance">Date *</Label>
              <Input
                id="date_seance"
                type="date"
                value={formData.date_seance}
                onChange={(e) => setFormData(prev => ({ ...prev, date_seance: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heure_debut">Début *</Label>
              <Input
                id="heure_debut"
                type="time"
                value={formData.heure_debut}
                onChange={(e) => setFormData(prev => ({ ...prev, heure_debut: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heure_fin">Fin *</Label>
              <Input
                id="heure_fin"
                type="time"
                value={formData.heure_fin}
                onChange={(e) => setFormData(prev => ({ ...prev, heure_fin: e.target.value }))}
                required
              />
            </div>
          </div>

          {duration > 0 && (
            <p className="text-sm text-muted-foreground">
              Durée : {Math.floor(duration / 60)}h{duration % 60 > 0 ? ` ${duration % 60}min` : ""}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="type_seance">Type de séance</Label>
              <Select
                value={formData.type_seance}
                onValueChange={(value) => setFormData(prev => ({ ...prev, type_seance: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {typeSeanceOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="parcours">Parcours</Label>
              <Select
                value={formData.parcours}
                onValueChange={(value) => setFormData(prev => ({ ...prev, parcours: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {parcoursOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="formateur_id">Formateur</Label>
              <Select
                value={formData.formateur_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, formateur_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {formateurs.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.prenom} {f.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicule_id">Véhicule</Label>
              <Select
                value={formData.vehicule_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, vehicule_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {vehicules.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.marque} {v.modele} ({v.immatriculation})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note_globale">Note globale (1-5)</Label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((note) => (
                <Button
                  key={note}
                  type="button"
                  variant={formData.note_globale === note ? "default" : "outline"}
                  size="sm"
                  className="w-10"
                  onClick={() => setFormData(prev => ({ ...prev, note_globale: note }))}
                >
                  {note}
                </Button>
              ))}
              {formData.note_globale > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setFormData(prev => ({ ...prev, note_globale: 0 }))}
                >
                  Effacer
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observations">Observations pédagogiques</Label>
            <Textarea
              id="observations"
              value={formData.observations}
              onChange={(e) => setFormData(prev => ({ ...prev, observations: e.target.value }))}
              rows={3}
              placeholder="Points travaillés, difficultés, progrès..."
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div>
              <Label htmlFor="validation">Validation formateur</Label>
              <p className="text-xs text-muted-foreground">Marquer la séance comme validée</p>
            </div>
            <Switch
              id="validation"
              checked={formData.validation_formateur}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, validation_formateur: checked }))}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending || updateMutation.isPending || duration <= 0}
            >
              {isEditing ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
