import { cn } from "@/lib/utils";
import type { SessionPeriode } from "@/hooks/useSessionsFilters";

/**
 * Fenêtre temporelle de la liste (refonte du 23/07/2026). Sans cet onglet,
 * la page s'ouvrait sur 45 sessions terminées pour 11 actives : l'équipe
 * devait chercher ce qui restait à faire dans du passé.
 */
interface SessionsPeriodTabsProps {
  value: SessionPeriode;
  onChange: (periode: SessionPeriode) => void;
  counts: { actives: number; terminees: number; toutes: number };
}

const ONGLETS: { value: SessionPeriode; label: string; countKey: keyof SessionsPeriodTabsProps["counts"] }[] = [
  { value: "actives", label: "En cours & à venir", countKey: "actives" },
  { value: "terminees", label: "Terminées", countKey: "terminees" },
  { value: "toutes", label: "Toutes", countKey: "toutes" },
];

export function SessionsPeriodTabs({ value, onChange, counts }: SessionsPeriodTabsProps) {
  return (
    <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
      {ONGLETS.map((onglet) => (
        <button
          key={onglet.value}
          onClick={() => onChange(onglet.value)}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            value === onglet.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {onglet.label}
          <span className="ml-1.5 text-xs opacity-60">({counts[onglet.countKey]})</span>
        </button>
      ))}
    </div>
  );
}
