import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Filter, X, Calendar as CalendarIcon } from "lucide-react";
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

export interface ProspectFilters {
  formations: string[];
  sources: string[];
  dateRange: { from: Date | undefined; to: Date | undefined };
  showRelanceToday: boolean;
}

const FORMATION_OPTIONS = [
  "VTC",
  "TAXI",
  "VMDTR",
  "ACC VTC",
  "ACC VTC 75",
  "Formation continue VTC",
  "Formation continue Taxi",
  "Mobilité Taxi",
];

const SOURCE_OPTIONS = [
  "Site web",
  "Réseaux sociaux",
  "Bouche à oreille",
  "Parrainage",
  "Publicité",
  "Salon",
  "Autre",
];

interface ProspectsAdvancedFiltersProps {
  filters: ProspectFilters;
  onChange: (filters: ProspectFilters) => void;
}

export function ProspectsAdvancedFilters({ filters, onChange }: ProspectsAdvancedFiltersProps) {
  const [open, setOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);

  const activeFiltersCount = 
    filters.formations.length + 
    filters.sources.length + 
    (filters.dateRange.from ? 1 : 0) +
    (filters.showRelanceToday ? 1 : 0);

  const toggleFormation = (f: string) => {
    const updated = filters.formations.includes(f)
      ? filters.formations.filter((x) => x !== f)
      : [...filters.formations, f];
    onChange({ ...filters, formations: updated });
  };

  const toggleSource = (s: string) => {
    const updated = filters.sources.includes(s)
      ? filters.sources.filter((x) => x !== s)
      : [...filters.sources, s];
    onChange({ ...filters, sources: updated });
  };

  const setQuickDateRange = (days: number | "month" | "last_month") => {
    let from: Date, to: Date;
    if (days === "month") {
      from = startOfMonth(new Date());
      to = new Date();
    } else if (days === "last_month") {
      const lastMonth = subMonths(new Date(), 1);
      from = startOfMonth(lastMonth);
      to = endOfMonth(lastMonth);
    } else {
      from = subDays(new Date(), days);
      to = new Date();
    }
    onChange({ ...filters, dateRange: { from, to } });
  };

  const clearFilters = () => {
    onChange({
      formations: [],
      sources: [],
      dateRange: { from: undefined, to: undefined },
      showRelanceToday: false,
    });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filtres
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Filtres avancés</h4>
              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                  <X className="h-3 w-3 mr-1" />
                  Effacer
                </Button>
              )}
            </div>

            <Separator />

            {/* Quick filter: Relances du jour */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="relance-today"
                checked={filters.showRelanceToday}
                onCheckedChange={(checked) =>
                  onChange({ ...filters, showRelanceToday: !!checked })
                }
              />
              <Label htmlFor="relance-today" className="text-sm font-normal text-orange-600">
                🔔 À relancer aujourd'hui
              </Label>
            </div>

            <Separator />

            {/* Formations */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Formations</Label>
              <div className="flex flex-wrap gap-1">
                {FORMATION_OPTIONS.map((f) => (
                  <Badge
                    key={f}
                    variant={filters.formations.includes(f) ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => toggleFormation(f)}
                  >
                    {f}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* Sources */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Sources</Label>
              <div className="flex flex-wrap gap-1">
                {SOURCE_OPTIONS.map((s) => (
                  <Badge
                    key={s}
                    variant={filters.sources.includes(s) ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => toggleSource(s)}
                  >
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Date range filter */}
      <Popover open={dateOpen} onOpenChange={setDateOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <CalendarIcon className="h-4 w-4" />
            {filters.dateRange.from ? (
              <>
                {format(filters.dateRange.from, "dd/MM", { locale: fr })}
                {filters.dateRange.to && ` - ${format(filters.dateRange.to, "dd/MM", { locale: fr })}`}
              </>
            ) : (
              "Période"
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-2 space-y-2">
            <div className="flex flex-wrap gap-1">
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setQuickDateRange(7)}>
                7 jours
              </Button>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setQuickDateRange(30)}>
                30 jours
              </Button>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setQuickDateRange("month")}>
                Ce mois
              </Button>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setQuickDateRange("last_month")}>
                Mois dernier
              </Button>
              {filters.dateRange.from && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-destructive"
                  onClick={() => onChange({ ...filters, dateRange: { from: undefined, to: undefined } })}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
          <Calendar
            mode="range"
            selected={{ from: filters.dateRange.from, to: filters.dateRange.to }}
            onSelect={(range) =>
              onChange({ ...filters, dateRange: { from: range?.from, to: range?.to } })
            }
            numberOfMonths={1}
            locale={fr}
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>

      {/* Active filters badges */}
      {filters.showRelanceToday && (
        <Badge variant="secondary" className="gap-1">
          🔔 Relances
          <X
            className="h-3 w-3 cursor-pointer"
            onClick={() => onChange({ ...filters, showRelanceToday: false })}
          />
        </Badge>
      )}
      {filters.formations.map((f) => (
        <Badge key={f} variant="secondary" className="gap-1">
          {f}
          <X className="h-3 w-3 cursor-pointer" onClick={() => toggleFormation(f)} />
        </Badge>
      ))}
      {filters.sources.map((s) => (
        <Badge key={s} variant="secondary" className="gap-1">
          {s}
          <X className="h-3 w-3 cursor-pointer" onClick={() => toggleSource(s)} />
        </Badge>
      ))}
    </div>
  );
}
