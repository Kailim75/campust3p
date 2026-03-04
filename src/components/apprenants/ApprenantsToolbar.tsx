import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Flame, ToggleLeft, ToggleRight, Copy } from "lucide-react";

interface ApprenantsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  formationFilter: string;
  onFormationFilterChange: (value: string) => void;
  quickFilter: string;
  onQuickFilterChange: (value: string) => void;
  activityFilter: "actifs" | "tous" | "inactifs";
  onActivityFilterChange: (value: "actifs" | "tous" | "inactifs") => void;
  activityCounts: { actifs: number; inactifs: number; tous: number };
  expertMode: boolean;
  onExpertModeToggle: () => void;
  filteredCount: number;
  criticalCount: number;
  onOpenDuplicates?: () => void;
}

export function ApprenantsToolbar({
  search,
  onSearchChange,
  formationFilter,
  onFormationFilterChange,
  quickFilter,
  onQuickFilterChange,
  activityFilter,
  onActivityFilterChange,
  activityCounts,
  expertMode,
  onExpertModeToggle,
  filteredCount,
  criticalCount,
  onOpenDuplicates,
}: ApprenantsToolbarProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un apprenant..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-10 rounded-xl border-border bg-card"
          />
        </div>
        <Select value={formationFilter} onValueChange={onFormationFilterChange}>
          <SelectTrigger className="w-[140px] h-10 rounded-xl">
            <SelectValue placeholder="Formation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="TAXI">Taxi</SelectItem>
            <SelectItem value="VTC">VTC</SelectItem>
            <SelectItem value="VMDTR">VMDTR</SelectItem>
          </SelectContent>
        </Select>

        {/* Duplicates button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenDuplicates}
          className="h-10 rounded-xl gap-2"
        >
          <Copy className="h-4 w-4" />
          Doublons
        </Button>

        {/* Expert mode toggle */}
        <Button
          variant={expertMode ? "default" : "outline"}
          size="sm"
          onClick={onExpertModeToggle}
          className="h-10 rounded-xl gap-2"
        >
          {expertMode ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
          Expert
        </Button>
      </div>

      {/* Activity filter row */}
      <div className="flex items-center gap-2 flex-wrap">
        {([
          { value: "actifs" as const, label: "Actifs", count: activityCounts.actifs },
          { value: "tous" as const, label: "Tous", count: activityCounts.tous },
          { value: "inactifs" as const, label: "Inactifs", count: activityCounts.inactifs },
        ]).map((f) => (
          <Button
            key={f.value}
            variant={activityFilter === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => onActivityFilterChange(f.value)}
            className="h-8 rounded-lg text-xs gap-1.5"
          >
            {f.label}
            <Badge variant="secondary" className="h-5 min-w-5 text-[10px] px-1.5">
              {f.count}
            </Badge>
          </Button>
        ))}

        <div className="w-px h-5 bg-border mx-1" />

        {[
          { value: "all", label: "Tous statuts" },
          { value: "retard", label: "Paiement en retard" },
          { value: "dossier", label: "Dossier incomplet" },
          { value: "session14", label: "Session < 14j" },
        ].map((f) => (
          <Button
            key={f.value}
            variant={quickFilter === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => onQuickFilterChange(f.value)}
            className="h-8 rounded-lg text-xs"
          >
            {f.label}
          </Button>
        ))}

        <Button
          variant={quickFilter === "critical" ? "destructive" : "outline"}
          size="sm"
          onClick={() => onQuickFilterChange(quickFilter === "critical" ? "all" : "critical")}
          className="h-8 rounded-lg text-xs gap-1.5"
        >
          <Flame className="h-3.5 w-3.5" />
          Élèves critiques
          {criticalCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 min-w-5 text-[10px] px-1.5">
              {criticalCount}
            </Badge>
          )}
        </Button>

        <span className="ml-auto text-xs text-muted-foreground">
          {filteredCount} apprenant{filteredCount > 1 ? "s" : ""} affiché{filteredCount > 1 ? "s" : ""}
        </span>

        {expertMode && (
          <Badge className="bg-primary/15 text-primary border-primary/20 text-[10px]">
            Mode Expert actif
          </Badge>
        )}
      </div>
    </div>
  );
}
