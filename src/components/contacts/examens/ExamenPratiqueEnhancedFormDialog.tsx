import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { useVehicules, type Vehicule } from "@/hooks/useVehicules";

const EXAMEN_TYPE_OPTIONS = [
  { value: "taxi", label: "Taxi" },
  { value: "vtc", label: "VTC" },
  { value: "vmdtr", label: "VMDTR" },
] as const;

const STATUT_HELPERS: Record<ExamenStatut, string> = {
  planifie: "Le passage est organisé, mais pas encore réalisé.",
  passe: "Le passage a eu lieu et doit encore être qualifié.",
  reussi: "Le candidat a validé l'évaluation pratique.",
  echoue: "Le candidat n'a pas validé cette tentative.",
  absent: "Le candidat ne s'est pas présenté au passage.",
  reporte: "Le passage doit être replanifié à une autre date.",
};

type FormState = {
  type_examen: string;
  date_examen: string;
  heure_examen: string;
  centre_examen: string;
  adresse_centre: string;
  statut: ExamenStatut;
  resultat: ExamenResultat | "";
  score: number | null;
  observations: string;
  evaluateur_id: string;
  vehicule_id: string;
};

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
  const activeVehicules = vehicules.filter((vehicule) => vehicule.actif);

  const [formData, setFormData] = useState<FormState>({
    type_examen: examen?.type_examen || formationType.toLowerCase(),
    date_examen: examen?.date_examen || "",
    heure_examen: examen?.heure_examen || "",
    centre_examen: examen?.centre_examen || "",
    adresse_centre: examen?.adresse_centre || "",
    statut: (examen?.statut || "planifie") as ExamenStatut,
    resultat: (examen?.resultat || "") as ExamenResultat | "",
    score: examen?.score ?? null,
    observations: examen?.observations || "",
    evaluateur_id: examen?.evaluateur_id || "",
    vehicule_id: examen?.vehicule_id || "",
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
        evaluateur_id: examen.evaluateur_id || "",
        vehicule_id: examen.vehicule_id || "",
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
  const selectedVehicule = activeVehicules.find((vehicule) => vehicule.id === formData.vehicule_id);
  const selectedEvaluateur = formateurs.find((formateur) => formateur === formData.evaluateur_id);
  const shouldShowResults = ["passe", "reussi", "echoue"].includes(formData.statut);
  const selectedStatus = examenStatutConfig[formData.statut];
  const selectedResult = formData.resultat ? examenResultatConfig[formData.resultat] : null;
  const planningChecks = useMemo(() => {
    const checks = [
      !formData.date_examen ? "Renseigner la date du passage" : null,
      !formData.centre_examen ? "Préciser le lieu d'évaluation" : null,
      !formData.evaluateur_id ? "Assigner un évaluateur" : null,
      !formData.vehicule_id ? "Assigner un véhicule" : null,
    ].filter(Boolean) as string[];

    if (shouldShowResults && !formData.resultat) {
      checks.push("Qualifier le résultat du passage");
    }

    return checks;
  }, [
    formData.centre_examen,
    formData.date_examen,
    formData.evaluateur_id,
    formData.resultat,
    formData.vehicule_id,
    shouldShowResults,
  ]);
  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

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
        evaluateur_id: formData.evaluateur_id || null,
        vehicule_id: formData.vehicule_id || null,
        statut: formData.statut,
        resultat: formData.resultat || null,
        score: formData.score,
        observations: formData.observations || null,
        document_resultat_path: null,
        numero_tentative: tentativeNumber,
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
          <DialogDescription>
            Préparez le passage pratique, rattachez l’évaluateur et le véhicule, puis complétez le résultat quand l’évaluation est passée.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Parcours</p>
              <p className="mt-1 text-sm font-semibold text-foreground uppercase">{formData.type_examen}</p>
              <p className="mt-1 text-xs text-muted-foreground">tentative n°{tentativeNumber}</p>
            </Card>
            <Card className="p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Statut du passage</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{selectedStatus.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{STATUT_HELPERS[formData.statut]}</p>
            </Card>
            <Card className="p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Évaluateur</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{selectedEvaluateur || "À définir"}</p>
              <p className="mt-1 text-xs text-muted-foreground">utile pour l’organisation interne</p>
            </Card>
            <Card className="p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Véhicule</p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {selectedVehicule ? `${selectedVehicule.marque} ${selectedVehicule.modele}` : "À définir"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedVehicule?.immatriculation || "Aucune immatriculation choisie"}
              </p>
            </Card>
          </div>

          <Card className="space-y-3 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">Pilotage du passage</p>
                <p className="text-xs text-muted-foreground">
                  Vérifiez les éléments d’organisation avant de valider le passage pratique.
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-muted-foreground">Checklist</p>
                <p className="text-sm font-semibold text-foreground">
                  {planningChecks.length === 0 ? "Dossier prêt" : `${planningChecks.length} point${planningChecks.length > 1 ? "s" : ""} à compléter`}
                </p>
              </div>
            </div>

            {planningChecks.length > 0 ? (
              <div className="rounded-lg border border-warning/40 bg-warning/5 px-3 py-2">
                <p className="text-xs font-medium text-foreground">À compléter avant validation :</p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {planningChecks.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success-foreground">
                Les informations essentielles du passage sont renseignées.
              </div>
            )}

            {selectedResult && (
              <div className="rounded-lg border bg-muted/40 px-3 py-2">
                <p className="text-xs font-medium text-muted-foreground">Résultat enregistré</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{selectedResult.label}</p>
              </div>
            )}
          </Card>

          <Card className="space-y-4 p-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Organisation du passage</p>
              <p className="text-xs text-muted-foreground">
                Définissez le type de passage, la date et le lieu d’évaluation.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="type_examen">Type d'examen</Label>
                <Select value={formData.type_examen} onValueChange={(value) => updateField("type_examen", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXAMEN_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="statut">Statut</Label>
                <Select
                  value={formData.statut}
                  onValueChange={(value) => updateField("statut", value as ExamenStatut)}
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
                <p className="text-[11px] text-muted-foreground">{STATUT_HELPERS[formData.statut]}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date_examen">Date *</Label>
                <Input
                  id="date_examen"
                  type="date"
                  value={formData.date_examen}
                  onChange={(e) => updateField("date_examen", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="heure_examen">Heure</Label>
                <Input
                  id="heure_examen"
                  type="time"
                  value={formData.heure_examen}
                  onChange={(e) => updateField("heure_examen", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="centre_examen">Lieu d'évaluation</Label>
              <Input
                id="centre_examen"
                value={formData.centre_examen}
                onChange={(e) => updateField("centre_examen", e.target.value)}
                placeholder="Centre ou zone de pratique"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adresse_centre">Adresse</Label>
              <Input
                id="adresse_centre"
                value={formData.adresse_centre}
                onChange={(e) => updateField("adresse_centre", e.target.value)}
                placeholder="Adresse complète"
              />
            </div>
          </Card>

          <Card className="space-y-4 p-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Encadrement et moyens</p>
              <p className="text-xs text-muted-foreground">
                Associez l’évaluateur et le véhicule utilisés pour cette tentative.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="evaluateur_id">Évaluateur</Label>
                <Select value={formData.evaluateur_id} onValueChange={(value) => updateField("evaluateur_id", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {formateurs.map((formateur) => (
                      <SelectItem key={formateur} value={formateur}>
                        {formateur}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicule_id">Véhicule</Label>
                <Select value={formData.vehicule_id} onValueChange={(value) => updateField("vehicule_id", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeVehicules.map((vehicule: Vehicule) => (
                      <SelectItem key={vehicule.id} value={vehicule.id}>
                        {vehicule.marque} {vehicule.modele} - {vehicule.immatriculation}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {shouldShowResults && (
            <Card className="space-y-4 p-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Résultat du passage</p>
                <p className="text-xs text-muted-foreground">
                  Complétez cette zone seulement quand l’évaluation a réellement eu lieu.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="resultat">Résultat</Label>
                  <Select
                    value={formData.resultat}
                    onValueChange={(value) =>
                      updateField("resultat", value as ExamenResultat)
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
                      updateField("score", e.target.value ? parseFloat(e.target.value) : null)
                    }
                    placeholder="Note obtenue"
                  />
                </div>
              </div>
            </Card>
          )}

          <Card className="space-y-3 p-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Observations</p>
              <p className="text-xs text-muted-foreground">
                Notez ici les points d’attention utiles pour le suivi pédagogique ou une nouvelle tentative.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="observations">Observations de l'examinateur</Label>
              <Textarea
                id="observations"
                value={formData.observations}
                onChange={(e) => updateField("observations", e.target.value)}
                rows={3}
                placeholder="Notes, remarques, points à améliorer..."
              />
            </div>
          </Card>

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
