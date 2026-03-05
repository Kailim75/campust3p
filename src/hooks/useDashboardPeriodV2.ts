import { useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { subDays, subMonths, startOfDay, startOfMonth, endOfMonth, format } from "date-fns";

export type PeriodRange = "today" | "7d" | "month" | "custom";

export interface PeriodValue {
  range: PeriodRange;
  from: Date;
  to: Date;
  label: string;
}

export const PERIOD_OPTIONS: { key: PeriodRange; label: string }[] = [
  { key: "today", label: "Aujourd'hui" },
  { key: "7d", label: "7 jours" },
  { key: "month", label: "Ce mois" },
  { key: "custom", label: "Personnalisé" },
];

function computePeriod(range: PeriodRange, customFrom?: string, customTo?: string): PeriodValue {
  const now = new Date();
  switch (range) {
    case "today":
      return { range, from: startOfDay(now), to: now, label: "Aujourd'hui" };
    case "7d":
      return { range, from: startOfDay(subDays(now, 7)), to: now, label: "7 jours" };
    case "month":
      return { range, from: startOfMonth(now), to: endOfMonth(now), label: "Ce mois" };
    case "custom":
      return {
        range,
        from: customFrom ? new Date(customFrom) : startOfDay(subDays(now, 30)),
        to: customTo ? new Date(customTo) : now,
        label: "Personnalisé",
      };
    default:
      return { range: "month", from: startOfMonth(now), to: endOfMonth(now), label: "Ce mois" };
  }
}

/** Compute the "previous period" of same duration for delta comparison */
export function getPreviousPeriod(period: PeriodValue): { from: Date; to: Date } {
  const durationMs = period.to.getTime() - period.from.getTime();
  const prevTo = new Date(period.from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - durationMs);
  return { from: prevFrom, to: prevTo };
}

export function useDashboardPeriodV2() {
  const [searchParams, setSearchParams] = useSearchParams();

  const period = useMemo(() => {
    const range = (searchParams.get("range") as PeriodRange) || "month";
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;
    return computePeriod(range, from, to);
  }, [searchParams]);

  const setPeriod = useCallback(
    (range: PeriodRange, customFrom?: Date, customTo?: Date) => {
      const next = new URLSearchParams(searchParams);
      next.set("range", range);
      if (range === "custom" && customFrom && customTo) {
        next.set("from", format(customFrom, "yyyy-MM-dd"));
        next.set("to", format(customTo, "yyyy-MM-dd"));
      } else {
        next.delete("from");
        next.delete("to");
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  return { period, setPeriod };
}
