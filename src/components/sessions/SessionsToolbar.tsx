import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Plus, List, CalendarDays, Download, Kanban, Archive, TrendingUp, Link2, RotateCcw } from "lucide-react";
import { SessionsAdvancedFilters } from "./SessionsAdvancedFilters";
import type { SessionFilters } from "@/hooks/useSessionsFilters";
import type { Formateur } from "@/hooks/useFormateurs";

interface SessionsToolbarProps {
  viewMode: string;
  onViewModeChange: (mode: "list" | "calendar" | "kanban") => void;
  filters: SessionFilters;
  onFiltersChange: (filters: SessionFilters) => void;
  formateurs: Formateur[];
  lieux: string[];
  formationTypes: string[];
  showProfitability: boolean;
  onShowProfitabilityChange: (v: boolean) => void;
  onExport: (format: "xlsx" | "csv") => void;
  onReconcile: () => void;
  isReconciling: boolean;
  onArchiveOpen: () => void;
  onAddNew: () => void;
  totalCount: number;
  filteredCount: number;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  summaryLine: string;
}

export function SessionsToolbar({
  viewMode,
  onViewModeChange,
  filters,
  onFiltersChange,
  formateurs,
  lieux,
  formationTypes,
  showProfitability,
  onShowProfitabilityChange,
  onExport,
  onReconcile,
  isReconciling,
  onArchiveOpen,
  onAddNew,
  totalCount,
  filteredCount,
  hasActiveFilters,
  onResetFilters,
  summaryLine,
}: SessionsToolbarProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{summaryLine}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-[11px]">
            Vue {viewMode === "list" ? "liste" : viewMode === "kanban" ? "kanban" : "calendrier"}
          </Badge>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={onResetFilters} className="gap-1">
              <RotateCcw className="h-3.5 w-3.5" />
              Réinitialiser les filtres
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <Tabs value={viewMode} onValueChange={(v) => onViewModeChange(v as "list" | "calendar" | "kanban")}>
          <TabsList>
            <TabsTrigger value="list" className="gap-2">
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Liste</span>
            </TabsTrigger>
            <TabsTrigger value="kanban" className="gap-2">
              <Kanban className="h-4 w-4" />
              <span className="hidden sm:inline">Kanban</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">Calendrier</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une session..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-9 input-focus"
          />
        </div>

        <div className="flex items-center gap-2">
          <SessionsAdvancedFilters
            filters={filters}
            onFiltersChange={onFiltersChange}
            formateurs={formateurs}
            lieux={lieux}
            formationTypes={formationTypes}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0">
                <Download className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onExport("xlsx")}>Export Excel (.xlsx)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport("csv")}>Export CSV</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={onReconcile}
                  disabled={isReconciling}
                >
                  <Link2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Réconcilier les factures orphelines avec leurs sessions</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button variant="outline" size="icon" className="shrink-0" onClick={onArchiveOpen}>
            <Archive className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2 px-2">
            <Switch
              id="profitability-toggle"
              checked={showProfitability}
              onCheckedChange={onShowProfitabilityChange}
              className="data-[state=checked]:bg-success"
            />
            <Label htmlFor="profitability-toggle" className="text-xs cursor-pointer whitespace-nowrap">
              <TrendingUp className="h-3.5 w-3.5 inline mr-1" />
              Rentabilité
            </Label>
          </div>

          <Button onClick={onAddNew} className="shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Nouvelle session</span>
            <span className="sm:hidden">Nouveau</span>
          </Button>
        </div>
      </div>

      {/* Result count */}
      <div className="text-sm text-muted-foreground">
        {filteredCount} session{filteredCount > 1 ? "s" : ""} affichée{filteredCount > 1 ? "s" : ""}
        {hasActiveFilters ? ` sur ${totalCount}` : ""}
      </div>
    </div>
  );
}
