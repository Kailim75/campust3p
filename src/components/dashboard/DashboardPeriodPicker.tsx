import { Calendar } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDashboardPeriodV2, PERIOD_OPTIONS, PeriodRange } from "@/hooks/useDashboardPeriodV2";

export function DashboardPeriodPicker() {
  const { period, setPeriod } = useDashboardPeriodV2();

  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <Select
        value={period.range}
        onValueChange={(v) => setPeriod(v as PeriodRange)}
      >
        <SelectTrigger className="w-[150px] h-9 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PERIOD_OPTIONS.filter(o => o.key !== "custom").map((option) => (
            <SelectItem key={option.key} value={option.key}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
