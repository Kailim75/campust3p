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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { departementsExamenT3P, departementsPopulaires } from "@/constants/departements";

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
    statut: (examen?.statut || "planifie") as ExamenT3PStatut,
    resultat: (examen?.resultat || "") as ExamenT3PResultat | "",
    score: examen?.score ?? null,
    date_reussite: examen?.date_reussite || "",
    observations: examen?.observations || "",
  });

  useEffect(() => {
    if (examen) {
      setFormData({
        type_formation: examen.type_formation,
        date_examen: examen.date_examen,
        heure_examen: examen.heure_examen || "",
        centre_examen: examen.centre_examen || "",
        departement: examen.departement || "",
        numero_convocation: examen.numero_convocation || "",
        statut: examen.statut as ExamenT3PStatut,
        resultat: (examen.resultat || "") as ExamenT3PResultat | "",
        score: examen.score,
        date_reussite: examen.date_reussite || "",
        observations: examen.observations || "",
      });
    } else {
      setFormData({
        type_formation: formationType,
        date_examen: "",
        heure_examen: "",
        centre_examen: "",
        departement: "",
        numero_convocation: "",
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
              <Label>Département d'inscription *</Label>
              <DepartementCombobox
                value={formData.departement}
                onChange={(value) => setFormData((prev) => ({ ...prev, departement: value }))}
              />
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

// Combobox for department selection with search
function DepartementCombobox({ 
  value, 
  onChange 
}: { 
  value: string; 
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  // Sort: popular departments first, then alphabetically
  const sortedDepartements = [...departementsExamenT3P].sort((a, b) => {
    const aPopular = departementsPopulaires.includes(a.code);
    const bPopular = departementsPopulaires.includes(b.code);
    if (aPopular && !bPopular) return -1;
    if (!aPopular && bPopular) return 1;
    return a.code.localeCompare(b.code);
  });

  const selectedDept = departementsExamenT3P.find(d => d.code === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selectedDept ? (
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              {selectedDept.label}
            </span>
          ) : (
            <span className="text-muted-foreground">Sélectionner un département...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Rechercher un département..." />
          <CommandList>
            <CommandEmpty>Aucun département trouvé.</CommandEmpty>
            <CommandGroup heading="Départements fréquents">
              {sortedDepartements
                .filter(d => departementsPopulaires.includes(d.code))
                .map((dept) => (
                  <CommandItem
                    key={dept.code}
                    value={dept.label}
                    onSelect={() => {
                      onChange(dept.code);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === dept.code ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {dept.label}
                  </CommandItem>
                ))}
            </CommandGroup>
            <CommandGroup heading="Tous les départements">
              {sortedDepartements
                .filter(d => !departementsPopulaires.includes(d.code))
                .map((dept) => (
                  <CommandItem
                    key={dept.code}
                    value={dept.label}
                    onSelect={() => {
                      onChange(dept.code);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === dept.code ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {dept.label}
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
