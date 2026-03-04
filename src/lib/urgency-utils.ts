import { CMA_REQUIRED_DOCS } from "@/lib/cma-constants";

export type UrgencyLevel = "elevee" | "moyenne" | "faible";

export interface UrgencyInfo {
  level: UrgencyLevel;
  label: string;
  className: string;
  dotClassName: string;
}

const URGENCY_MAP: Record<UrgencyLevel, UrgencyInfo> = {
  elevee: {
    level: "elevee",
    label: "Élevé",
    className: "bg-destructive/10 text-destructive border-destructive/20",
    dotClassName: "bg-destructive",
  },
  moyenne: {
    level: "moyenne",
    label: "Moyen",
    className: "bg-warning/10 text-warning border-warning/20",
    dotClassName: "bg-warning",
  },
  faible: {
    level: "faible",
    label: "Faible",
    className: "bg-success/10 text-success border-success/20",
    dotClassName: "bg-success",
  },
};

/**
 * Compute urgency for a contact/apprenant based on simple rules:
 * - session < 14j + dossier incomplet = Élevé
 * - paiement en retard = Élevé
 * - CMA rejeté = Élevé
 * - docs CMA manquants = Moyen
 * - sinon = Faible
 */
export function computeContactUrgency(params: {
  missingCMACount: number;
  hasLatePayment: boolean;
  hasSessionSoon?: boolean; // session < 14j
  cmaRejected?: boolean;
}): UrgencyInfo {
  const { missingCMACount, hasLatePayment, hasSessionSoon, cmaRejected } = params;

  if (cmaRejected) return URGENCY_MAP.elevee;
  if (hasLatePayment) return URGENCY_MAP.elevee;
  if (hasSessionSoon && missingCMACount > 0) return URGENCY_MAP.elevee;
  if (missingCMACount > 0) return URGENCY_MAP.moyenne;
  return URGENCY_MAP.faible;
}

/**
 * Compute urgency for a prospect based on simple rules:
 * - overdue > 7j = Élevé
 * - overdue = Moyen
 * - sinon = Faible
 */
export function computeProspectUrgency(params: {
  daysLate: number;
  isRdv?: boolean;
}): UrgencyInfo {
  const { daysLate, isRdv } = params;
  if (daysLate > 7) return URGENCY_MAP.elevee;
  if (daysLate > 0) return URGENCY_MAP.moyenne;
  if (isRdv) return URGENCY_MAP.moyenne; // RDV today = medium priority
  return URGENCY_MAP.faible;
}

export function getUrgencyInfo(level: UrgencyLevel): UrgencyInfo {
  return URGENCY_MAP[level];
}
