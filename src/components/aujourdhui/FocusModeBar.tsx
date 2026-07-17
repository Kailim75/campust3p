import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Focus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type FocusBlocKey =
  | "session_prep"
  | "qualite_crm"
  | "cma"
  | "rdv"
  | "relances"
  | "critiques"
  | "parcours"
  | "reprogrammer"
  | "carte_pro"
  | "qualiopi";

export const FOCUS_BLOC_LABELS: Record<FocusBlocKey, string> = {
  session_prep: "Préparation de session",
  qualite_crm: "Qualité CRM",
  cma: "Dossiers CMA",
  rdv: "Rendez-vous du jour",
  relances: "Relances à faire",
  critiques: "Sessions critiques",
  parcours: "Parcours d'examen",
  reprogrammer: "À reprogrammer",
  carte_pro: "Carte Pro",
  qualiopi: "Conformité Qualiopi",
};

interface FocusModeBarProps {
  focus: FocusBlocKey | null;
  onChange: (focus: FocusBlocKey | null) => void;
  counts: Partial<Record<FocusBlocKey, number>>;
}

export function FocusModeBar({ focus, onChange, counts }: FocusModeBarProps) {
  const entries = (Object.keys(FOCUS_BLOC_LABELS) as FocusBlocKey[]);

  return (
    <div className={cn(
      "flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors",
      focus ? "bg-primary/5 border-primary/30" : "bg-muted/30 border-border"
    )}>
      <Focus className={cn("h-4 w-4", focus ? "text-primary" : "text-muted-foreground")} />
      <span className="text-xs font-medium text-muted-foreground">
        {focus ? "Mode focus actif" : "Mode focus"}
      </span>
      <Select
        value={focus ?? "none"}
        onValueChange={(value) => onChange(value === "none" ? null : (value as FocusBlocKey))}
      >
        <SelectTrigger className="h-7 text-xs w-[220px]">
          <SelectValue placeholder="Choisir un bloc à focaliser…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Tous les blocs</SelectItem>
          {entries.map((key) => {
            const count = counts[key] ?? 0;
            return (
              <SelectItem key={key} value={key}>
                {FOCUS_BLOC_LABELS[key]}{count > 0 ? ` (${count})` : ""}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      {focus && (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-[11px] gap-1 ml-auto"
          onClick={() => onChange(null)}
        >
          <X className="h-3 w-3" />
          Quitter
        </Button>
      )}
    </div>
  );
}
