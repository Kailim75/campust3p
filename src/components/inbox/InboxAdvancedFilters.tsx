import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { SlidersHorizontal, X, Calendar as CalendarIcon, Paperclip, Link2, Tag } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { InboxStatus } from "./InboxCrmPage";
import { ALL_CRM_LABELS, CrmLabelBadge } from "./CrmLabelBadge";

export interface AdvancedFilters {
  sender: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  status: InboxStatus | "all";
  assignedTo: string;
  hasAttachments: boolean | null;
  hasLinkedEntity: boolean | null;
  crmLabel: string;
}

export const EMPTY_FILTERS: AdvancedFilters = {
  sender: "",
  dateFrom: undefined,
  dateTo: undefined,
  status: "all",
  assignedTo: "all",
  hasAttachments: null,
  hasLinkedEntity: null,
  crmLabel: "all",
};

export function hasActiveAdvancedFilters(f: AdvancedFilters): boolean {
  return (
    f.sender.trim() !== "" ||
    f.dateFrom !== undefined ||
    f.dateTo !== undefined ||
    f.hasAttachments !== null ||
    f.hasLinkedEntity !== null
  );
}

export function countActiveFilters(f: AdvancedFilters): number {
  let c = 0;
  if (f.sender.trim()) c++;
  if (f.dateFrom) c++;
  if (f.dateTo) c++;
  if (f.hasAttachments !== null) c++;
  if (f.hasLinkedEntity !== null) c++;
  return c;
}

interface Props {
  filters: AdvancedFilters;
  onChange: (f: AdvancedFilters) => void;
  centreUsers: { id: string; label: string }[];
}

export function InboxAdvancedFilters({ filters, onChange, centreUsers }: Props) {
  const [open, setOpen] = useState(false);
  const activeCount = countActiveFilters(filters);

  const update = (patch: Partial<AdvancedFilters>) =>
    onChange({ ...filters, ...patch });

  const reset = () => onChange(EMPTY_FILTERS);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-7 text-xs gap-1.5 border-dashed",
            activeCount > 0 && "border-primary/50 text-primary"
          )}
        >
          <SlidersHorizontal className="h-3 w-3" />
          Filtres
          {activeCount > 0 && (
            <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center leading-none">
              {activeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start" sideOffset={6}>
        <div className="px-3 py-2.5 border-b flex items-center justify-between">
          <span className="text-xs font-semibold">Filtres avancés</span>
          {activeCount > 0 && (
            <Button variant="ghost" size="sm" className="h-6 text-[11px] text-muted-foreground" onClick={reset}>
              <X className="h-3 w-3 mr-1" />
              Réinitialiser
            </Button>
          )}
        </div>

        <div className="p-3 space-y-3">
          {/* Sender */}
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Expéditeur</Label>
            <Input
              value={filters.sender}
              onChange={(e) => update({ sender: e.target.value })}
              placeholder="email ou nom…"
              className="h-8 text-xs"
            />
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Du</Label>
              <DatePickerButton
                date={filters.dateFrom}
                onSelect={(d) => update({ dateFrom: d })}
                placeholder="Début"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Au</Label>
              <DatePickerButton
                date={filters.dateTo}
                onSelect={(d) => update({ dateTo: d })}
                placeholder="Fin"
              />
            </div>
          </div>

          {/* Toggles row */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="adv-attachments"
                checked={filters.hasAttachments === true}
                onCheckedChange={(v) => update({ hasAttachments: v ? true : null })}
                className="scale-75"
              />
              <Label htmlFor="adv-attachments" className="text-[11px] text-muted-foreground flex items-center gap-1 cursor-pointer">
                <Paperclip className="h-3 w-3" />
                Avec PJ
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="adv-linked"
                checked={filters.hasLinkedEntity === true}
                onCheckedChange={(v) => update({ hasLinkedEntity: v ? true : null })}
                className="scale-75"
              />
              <Label htmlFor="adv-linked" className="text-[11px] text-muted-foreground flex items-center gap-1 cursor-pointer">
                <Link2 className="h-3 w-3" />
                Lié CRM
              </Label>
            </div>
          </div>
        </div>

        <div className="px-3 py-2 border-t">
          <Button size="sm" className="w-full h-7 text-xs" onClick={() => setOpen(false)}>
            Appliquer
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function DatePickerButton({
  date,
  onSelect,
  placeholder,
}: {
  date: Date | undefined;
  onSelect: (d: Date | undefined) => void;
  placeholder: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 w-full justify-start text-xs font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="h-3 w-3 mr-1.5" />
          {date ? format(date, "dd/MM/yy", { locale: fr }) : placeholder}
          {date && (
            <X
              className="h-3 w-3 ml-auto text-muted-foreground hover:text-foreground"
              onClick={(e) => { e.stopPropagation(); onSelect(undefined); }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onSelect}
          locale={fr}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
