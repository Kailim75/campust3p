import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, Flame, ToggleLeft, ToggleRight, Copy, Settings2, X } from "lucide-react";
import { getRecentDaysThreshold, setRecentDaysThreshold } from "@/lib/apprenant-active";

interface ApprenantsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  formationFilter: string;
  onFormationFilterChange: (value: string) => void;
  quickFilter: string;
  onQuickFilterChange: (value: string) => void;
  activityFilter: "actifs" | "tous" | "inactifs" | "termines";
  onActivityFilterChange: (value: "actifs" | "tous" | "inactifs" | "termines") => void;
  activityCounts: { actifs: number; inactifs: number; tous: number; termines: number };
  expertMode: boolean;
  onExpertModeToggle: () => void;
  filteredCount: number;
  criticalCount: number;
  onOpenDuplicates?: () => void;
  summaryLine: string;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
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
  summaryLine,
  hasActiveFilters,
  onResetFilters,
}: ApprenantsToolbarProps) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Liste opérationnelle</p>
          <p className="text-sm text-muted-foreground mt-1">{summaryLine}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {expertMode && (
            <Badge className="bg-primary/15 text-primary border-primary/20 text-[10px]">
              Mode Expert actif
            </Badge>
          )}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-8 rounded-lg text-xs" onClick={onResetFilters}>
              <X className="h-3.5 w-3.5 mr-1.5" />
              Réinitialiser
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-10 rounded-xl border-border bg-card"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={formationFilter} onValueChange={onFormationFilterChange}>
            <SelectTrigger className="w-[100px] sm:w-[140px] h-10 rounded-xl">
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
            <span className="hidden sm:inline">Doublons</span>
          </Button>

          {/* Expert mode toggle */}
          <Button
            variant={expertMode ? "default" : "outline"}
            size="sm"
            onClick={onExpertModeToggle}
            className="h-10 rounded-xl gap-2"
          >
            {expertMode ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
            <span className="hidden sm:inline">Expert</span>
          </Button>
        </div>
      </div>

      {/* Activity filter row */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap overflow-x-auto scrollbar-hide">
        {([
          { value: "actifs" as const, label: "Actifs", count: activityCounts.actifs },
          { value: "tous" as const, label: "Tous", count: activityCounts.tous },
          { value: "inactifs" as const, label: "Inactifs", count: activityCounts.inactifs },
          { value: "termines" as const, label: "Terminés", count: activityCounts.termines },
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

        {/* Recent days threshold */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center">
              <Select
                value={String(getRecentDaysThreshold())}
                onValueChange={(v) => {
                  setRecentDaysThreshold(Number(v) as 30 | 60 | 90);
                  window.location.reload();
                }}
              >
                <SelectTrigger className="h-7 w-[90px] text-[10px] rounded-lg border-dashed">
                  <Settings2 className="h-3 w-3 mr-1 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 jours</SelectItem>
                  <SelectItem value="60">60 jours</SelectItem>
                  <SelectItem value="90">90 jours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TooltipTrigger>
          <TooltipContent className="text-xs">Seuil "activité récente"</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
