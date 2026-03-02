import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Filter, RotateCcw } from "lucide-react";
import type { Formateur } from "@/hooks/useFormateurs";
import type { SessionFilters } from "@/hooks/useSessionsFilters";

const statusOptions = [
  { value: "all", label: "Tous les statuts" },
  { value: "a_venir", label: "À venir" },
  { value: "en_cours", label: "En cours" },
  { value: "terminee", label: "Terminée" },
  { value: "annulee", label: "Annulée" },
  { value: "complet", label: "Complet" },
];

interface SessionsAdvancedFiltersProps {
  filters: SessionFilters;
  onFiltersChange: (filters: SessionFilters) => void;
  formateurs: Formateur[];
  lieux: string[];
  formationTypes: string[];
}

export function SessionsAdvancedFilters({
  filters, onFiltersChange, formateurs, lieux, formationTypes,
}: SessionsAdvancedFiltersProps) {
  const [open, setOpen] = useState(false);

  const activeFiltersCount = [
    filters.status !== "all",
    filters.formationType !== "all",
    filters.formateurId !== "all",
    filters.lieu !== "all",
    filters.dateStart,
    filters.dateEnd,
  ].filter(Boolean).length;

  const resetFilters = () => {
    onFiltersChange({
      ...filters,
      status: "all",
      formationType: "all",
      formateurId: "all",
      lieu: "all",
      dateStart: "",
      dateEnd: "",
      criticalOnly: false,
    });
  };

  const updateFilter = (key: keyof SessionFilters, value: string | boolean) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="relative">
          <Filter className="h-4 w-4 mr-2" />
          Filtres
          {activeFiltersCount > 0 && (
            <Badge
              variant="secondary"
              className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-primary text-primary-foreground"
            >
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Filtres avancés</h4>
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <RotateCcw className="h-3 w-3 mr-1" />
                Réinitialiser
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label>Statut</Label>
            <Select value={filters.status} onValueChange={(v) => updateFilter("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Type de formation</Label>
            <Select value={filters.formationType} onValueChange={(v) => updateFilter("formationType", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les formations</SelectItem>
                {formationTypes.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Formateur</Label>
            <Select value={filters.formateurId} onValueChange={(v) => updateFilter("formateurId", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les formateurs</SelectItem>
                {formateurs.filter(f => f.actif).map((formateur) => (
                  <SelectItem key={formateur.id} value={formateur.id}>
                    {formateur.prenom} {formateur.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Lieu</Label>
            <Select value={filters.lieu} onValueChange={(v) => updateFilter("lieu", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les lieux</SelectItem>
                {lieux.map((lieu) => (
                  <SelectItem key={lieu} value={lieu}>{lieu}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Période</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" placeholder="Du" value={filters.dateStart} onChange={(e) => updateFilter("dateStart", e.target.value)} />
              <Input type="date" placeholder="Au" value={filters.dateEnd} onChange={(e) => updateFilter("dateEnd", e.target.value)} />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
