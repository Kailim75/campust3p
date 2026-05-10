import { isBefore } from "date-fns";

export type PriorityLevel = "high" | "medium" | "low" | "none";

export interface ProspectPriority {
  level: PriorityLevel;
  label: string;
  dotClass: string;
}

interface PriorityInput {
  next_action_at?: string | null;
  statut?: string | null;
}

/**
 * Returns visual priority for a prospect based on its next action date and status.
 * - high: overdue
 * - medium: within next 24h
 * - low: future or no action
 * - none: terminal status (converti / perdu)
 */
export function getProspectPriority(prospect: PriorityInput): ProspectPriority {
  if (prospect.statut === "converti" || prospect.statut === "perdu") {
    return { level: "none", label: "—", dotClass: "bg-muted" };
  }
  if (!prospect.next_action_at) {
    return { level: "low", label: "Sans prochaine action", dotClass: "bg-muted-foreground/40" };
  }
  const d = new Date(prospect.next_action_at);
  const now = new Date();
  if (isBefore(d, now)) {
    return { level: "high", label: "En retard", dotClass: "bg-destructive" };
  }
  const diffH = (d.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (diffH <= 24) {
    return { level: "medium", label: "Dans les 24h", dotClass: "bg-warning" };
  }
  return { level: "low", label: "À venir", dotClass: "bg-success" };
}
