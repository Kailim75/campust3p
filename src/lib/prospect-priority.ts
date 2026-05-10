import { isBefore, isToday, parseISO } from "date-fns";

export type PriorityLevel = "high" | "medium" | "low" | "none";

export interface ProspectPriority {
  level: PriorityLevel;
  label: string;
  dotClass: string;
}

interface PriorityInput {
  next_action_at?: string | null;
  date_prochaine_relance?: string | null;
  statut?: string | null;
  priorite?: string | null;
  created_at?: string | null;
}

/**
 * Returns visual priority for a prospect based on its next action date and status.
 * - high: overdue or manually urgent
 * - medium: within next 24h
 * - low: future or no action
 * - none: terminal status (converti / perdu)
 */
export function getProspectPriority(prospect: PriorityInput): ProspectPriority {
  if (prospect.statut === "converti" || prospect.statut === "perdu") {
    return { level: "none", label: "—", dotClass: "bg-muted" };
  }

  const d = getActionDate(prospect);
  const now = new Date();

  if (d && isBefore(d, now) && !isToday(d)) {
    return { level: "high", label: "En retard", dotClass: "bg-destructive" };
  }

  if (prospect.priorite === "urgente") {
    return { level: "high", label: "Priorité urgente", dotClass: "bg-destructive" };
  }

  if (d && isToday(d)) {
    return { level: "medium", label: "Aujourd'hui", dotClass: "bg-warning" };
  }

  if (prospect.priorite === "haute") {
    return { level: "medium", label: "Priorité haute", dotClass: "bg-warning" };
  }

  if (!d) {
    return { level: "low", label: "Sans prochaine action", dotClass: "bg-muted-foreground/40" };
  }

  const diffH = (d.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (diffH <= 24) {
    return { level: "medium", label: "Dans les 24h", dotClass: "bg-warning" };
  }

  return { level: "low", label: "À venir", dotClass: "bg-success" };
}

export function getProspectPrioritySortValue(prospect: PriorityInput): number {
  const levelWeight: Record<PriorityLevel, number> = {
    high: 0,
    medium: 1,
    low: 2,
    none: 3,
  };
  const manualWeight = getManualPriorityWeight(prospect.priorite);
  const date = getActionDate(prospect);
  const dateWeight = date?.getTime() ?? 9_000_000_000_000;

  return levelWeight[getProspectPriority(prospect).level] * 10_000_000_000_000 + manualWeight * 1_000_000_000_000 + dateWeight;
}

function getActionDate(prospect: PriorityInput): Date | null {
  const raw = prospect.next_action_at || prospect.date_prochaine_relance;
  if (!raw) return null;
  const date = parseISO(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function getManualPriorityWeight(priorite?: string | null): number {
  if (priorite === "urgente") return 0;
  if (priorite === "haute") return 1;
  if (priorite === "normale") return 2;
  if (priorite === "basse") return 3;
  return 2;
}
