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
import { MapPin } from "lucide-react";
import {
  useCreateExamenT3P,
  useUpdateExamenT3P,
  examenT3PStatutConfig,
  examenT3PResultatConfig,
  centresExamenT3P,
  type ExamenT3P,
  type ExamenT3PStatut,
  type ExamenT3PResultat,
} from "@/hooks/useExamensT3P";

// Départements principaux pour l'inscription T3P
const DEPARTEMENTS_PRINCIPAUX = [
  { code: "75", label: "75 - Paris" },
  { code: "92", label: "92 - Hauts-de-Seine" },
  { code: "93", label: "93 - Seine-Saint-Denis" },
  { code: "94", label: "94 - Val-de-Marne" },
];

interface ExamenT3PFormDialogProps {
  contactId: string;
  formationType: string;
  examen?: ExamenT3P | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tentativeNumber: number;
}

export function ExamenT3PFormDialog({
  contactId,
  formationType,
  examen,
  open,
  onOpenChange,
  tentativeNumber,
}: ExamenT3PFormDialogProps) {
  const [formData, setFormData] = useState({
    type_formation: examen?.type_formation || formationType,
    date_examen: examen?.date_examen || "",
    heure_examen: examen?.heure_examen || "",
    centre_examen: examen?.centre_examen || "",
    departement: examen?.departement || "",
    numero_convocation: examen?.numero_convocation || "",
    numero_dossier: examen?.numero_dossier || "",
    statut: (examen?.statut || "planifie") as ExamenT3PStatut,
    resultat: (examen?.resultat || "") as ExamenT3PResultat | "",
    score: examen?.score ?? null,
    date_reussite: examen?.date_reussite || "",
    observations: examen?.observations || "",
  });

  // Track if "Autre" is selected for manual input
  const [isAutreDepartement, setIsAutreDepartement] = useState(false);
  const [autreDepartementValue, setAutreDepartementValue] = useState("");

  useEffect(() => {
    if (examen) {
      const isPrincipal = DEPARTEMENTS_PRINCIPAUX.some(d => d.code === examen.departement);
      setIsAutreDepartement(!isPrincipal && !!examen.departement);
      setAutreDepartementValue(!isPrincipal && examen.departement ? examen.departement : "");
      
      setFormData({
        type_formation: examen.type_formation,
        date_examen: examen.date_examen,
        heure_examen: examen.heure_examen || "",
        centre_examen: examen.centre_examen || "",
        departement: examen.departement || "",
        numero_convocation: examen.numero_convocation || "",
        numero_dossier: examen.numero_dossier || "",
        statut: examen.statut as ExamenT3PStatut,
        resultat: (examen.resultat || "") as ExamenT3PResultat | "",
        score: examen.score,
        date_reussite: examen.date_reussite || "",
        observations: examen.observations || "",
      });
    } else {
      setIsAutreDepartement(false);
      setAutreDepartementValue("");
      setFormData({
        type_formation: formationType,
        date_examen: "",
        heure_examen: "",
        centre_examen: "",
        departement: "",
        numero_convocation: "",
        numero_dossier: "",
        statut: "planifie",
        resultat: "",
        score: null,
        date_reussite: "",
        observations: "",
      });
    }
  }, [examen, formationType, open]);

  const createMutation = useCreateExamenT3P();
  const updateMutation = useUpdateExamenT3P();
  const isEditing = !!examen;

  const handleDepartementChange = (value: string) => {
    if (value === "autre") {
      setIsAutreDepartement(true);
      setFormData((prev) => ({ ...prev, departement: "" }));
    } else {
      setIsAutreDepartement(false);
      setAutreDepartementValue("");
      setFormData((prev) => ({ ...prev, departement: value }));
    }
  };

  const handleAutreDepartementChange = (value: string) => {
    // Only allow numbers and max 3 characters
    const cleaned = value.replace(/\D/g, "").slice(0, 3);
    setAutreDepartementValue(cleaned);
    setFormData((prev) => ({ ...prev, departement: cleaned }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.date_examen) {
      return;
    }

    try {
      const payload = {
        type_formation: formData.type_formation,
        date_examen: formData.date_examen,
        heure_examen: formData.heure_examen || null,
        centre_examen: formData.centre_examen || null,
        departement: formData.departement || null,
        numero_convocation: formData.numero_convocation || null,
        statut: formData.statut,
        resultat: formData.resultat || null,
        score: formData.score,
        date_reussite: formData.date_reussite || null,
        date_expiration: null,
        observations: formData.observations || null,
        document_resultat_path: null,
        numero_tentative: tentativeNumber,
        numero_dossier: formData.numero_dossier || null,
      };

      if (isEditing && examen) {
        await updateMutation.mutateAsync({
          id: examen.id,
          contactId,
          ...payload,
        });
      } else {
        await createMutation.mutateAsync({
          contact_id: contactId,
          ...payload,
        });
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  // Auto-fill date_reussite when status changes to reussi
  useEffect(() => {
    if (formData.statut === "reussi" && !formData.date_reussite) {
      setFormData((prev) => ({
        ...prev,
        date_reussite: formData.date_examen,
        resultat: "admis",
      }));
    }
  }, [formData.statut, formData.date_examen]);

  // Determine current select value
  const getSelectValue = () => {
    if (isAutreDepartement) return "autre";
    if (DEPARTEMENTS_PRINCIPAUX.some(d => d.code === formData.departement)) {
      return formData.departement;
    }
    return "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier l'examen T3P" : "Planifier un examen T3P"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="type_formation">Type de formation</Label>
              <Select
                value={formData.type_formation}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, type_formation: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TAXI">TAXI</SelectItem>
                  <SelectItem value="VTC">VTC</SelectItem>
                  <SelectItem value="VMDTR">VMDTR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="statut">Statut</Label>
              <Select
                value={formData.statut}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, statut: value as ExamenT3PStatut }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(examenT3PStatutConfig).map(([key, config]) => (
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
              <Label htmlFor="date_examen">Date d'examen *</Label>
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
            <Label htmlFor="centre_examen">Centre d'examen</Label>
            <Select
              value={formData.centre_examen}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, centre_examen: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un centre..." />
              </SelectTrigger>
              <SelectContent>
                {centresExamenT3P.map((centre) => (
                  <SelectItem key={centre} value={centre}>
                    {centre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                Département d'inscription
              </Label>
              <Select
                value={getSelectValue()}
                onValueChange={handleDepartementChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTEMENTS_PRINCIPAUX.map((dept) => (
                    <SelectItem key={dept.code} value={dept.code}>
                      {dept.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="autre">Autre département...</SelectItem>
                </SelectContent>
              </Select>
              {isAutreDepartement && (
                <Input
                  placeholder="N° département (ex: 69)"
                  value={autreDepartementValue}
                  onChange={(e) => handleAutreDepartementChange(e.target.value)}
                  maxLength={3}
                  className="mt-2"
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="numero_convocation">N° Convocation</Label>
              <Input
                id="numero_convocation"
                value={formData.numero_convocation}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, numero_convocation: e.target.value }))
                }
                placeholder="Numéro de convocation"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="numero_dossier">N° Dossier</Label>
            <Input
              id="numero_dossier"
              value={formData.numero_dossier}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, numero_dossier: e.target.value }))
              }
              placeholder="Ex: T3P-2025-001"
            />
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
                      setFormData((prev) => ({ ...prev, resultat: value as ExamenT3PResultat }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(examenT3PResultatConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="score">Score (/20)</Label>
                  <Input
                    id="score"
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={formData.score ?? ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        score: e.target.value ? parseFloat(e.target.value) : null,
                      }))
                    }
                    placeholder="Note sur 20"
                  />
                </div>
              </div>
              {formData.statut === "reussi" && (
                <div className="space-y-2">
                  <Label htmlFor="date_reussite">Date de réussite</Label>
                  <Input
                    id="date_reussite"
                    type="date"
                    value={formData.date_reussite}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, date_reussite: e.target.value }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Le T3P sera valide 5 ans à partir de cette date.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="observations">Observations</Label>
            <Textarea
              id="observations"
              value={formData.observations}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, observations: e.target.value }))
              }
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
