import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import {
  CATEGORY_LABELS,
  REQUALIFICATION_CATEGORIES,
} from "@/lib/requalification/categories";

export interface RequalificationFilterState {
  search: string;
  category: string; // 'all' | RequalificationCategory
  formation: string; // 'all' | 'TAXI' | 'VTC' | 'VMDTR' | 'continue'
  importSmartof: "all" | "yes" | "no";
  hasInscription: "all" | "yes" | "no";
  hasFacture: "all" | "yes" | "no";
  hasPaiement: "all" | "yes" | "no";
  hasDocument: "all" | "yes" | "no";
  hasExamen: "all" | "yes" | "no";
  noProof: boolean;
  toVerify: boolean;
}

export const DEFAULT_FILTERS: RequalificationFilterState = {
  search: "",
  category: "all",
  formation: "all",
  importSmartof: "all",
  hasInscription: "all",
  hasFacture: "all",
  hasPaiement: "all",
  hasDocument: "all",
  hasExamen: "all",
  noProof: false,
  toVerify: false,
};

export function RequalificationFilters({
  value,
  onChange,
}: {
  value: RequalificationFilterState;
  onChange: (v: RequalificationFilterState) => void;
}) {
  const set = <K extends keyof RequalificationFilterState>(k: K, v: RequalificationFilterState[K]) =>
    onChange({ ...value, [k]: v });

  const tri = (k: keyof RequalificationFilterState, label: string) => (
    <Select value={value[k] as string} onValueChange={(v) => set(k as any, v as any)}>
      <SelectTrigger className="h-9 w-[140px] text-xs"><SelectValue placeholder={label} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{label} : tous</SelectItem>
        <SelectItem value="yes">{label} : oui</SelectItem>
        <SelectItem value="no">{label} : non</SelectItem>
      </SelectContent>
    </Select>
  );

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher nom, prénom, email…"
            value={value.search}
            onChange={(e) => set("search", e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <Select value={value.category} onValueChange={(v) => set("category", v)}>
          <SelectTrigger className="h-9 w-[200px] text-xs"><SelectValue placeholder="Catégorie" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {REQUALIFICATION_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={value.formation} onValueChange={(v) => set("formation", v)}>
          <SelectTrigger className="h-9 w-[140px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes formations</SelectItem>
            <SelectItem value="TAXI">Taxi</SelectItem>
            <SelectItem value="VTC">VTC</SelectItem>
            <SelectItem value="VMDTR">VMDTR</SelectItem>
            <SelectItem value="continue">Formation continue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Select value={value.importSmartof} onValueChange={(v) => set("importSmartof", v as any)}>
          <SelectTrigger className="h-9 w-[160px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Import SmartOF : tous</SelectItem>
            <SelectItem value="yes">Import SmartOF : oui</SelectItem>
            <SelectItem value="no">Import SmartOF : non</SelectItem>
          </SelectContent>
        </Select>
        {tri("hasInscription", "Inscription")}
        {tri("hasFacture", "Facture")}
        {tri("hasPaiement", "Paiement")}
        {tri("hasDocument", "Document")}
        {tri("hasExamen", "Examen")}

        <Button
          variant={value.noProof ? "default" : "outline"}
          size="sm"
          className="h-9 text-xs"
          onClick={() => set("noProof", !value.noProof)}
        >
          Sans preuve de formation
        </Button>
        <Button
          variant={value.toVerify ? "default" : "outline"}
          size="sm"
          className="h-9 text-xs"
          onClick={() => set("toVerify", !value.toVerify)}
        >
          À vérifier manuellement
        </Button>
      </div>
    </div>
  );
}
