export type UrgencyLevel = "elevee" | "moyenne" | "faible";

export interface UrgencyInfo {
  level: UrgencyLevel;
  label: string;
  reasons: string[];
  className: string;
  dotClassName: string;
}

const URGENCY_BASE: Record<UrgencyLevel, Omit<UrgencyInfo, "reasons">> = {
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

function makeUrgency(level: UrgencyLevel, reasons: string[]): UrgencyInfo {
  return { ...URGENCY_BASE[level], reasons };
}

/**
 * Compute urgency for a contact/apprenant with reasons.
 */
export function computeContactUrgency(params: {
  missingCMACount: number;
  hasLatePayment: boolean;
  hasSessionSoon?: boolean;
  cmaRejected?: boolean;
}): UrgencyInfo {
  const { missingCMACount, hasLatePayment, hasSessionSoon, cmaRejected } = params;
  const reasons: string[] = [];

  if (cmaRejected) reasons.push("CMA rejeté");
  if (hasLatePayment) reasons.push("Paiement en retard");
  if (hasSessionSoon && missingCMACount > 0) reasons.push("Session < 14j + dossier incomplet");
  if (missingCMACount > 0 && !reasons.some(r => r.includes("dossier"))) reasons.push(`${missingCMACount} doc${missingCMACount > 1 ? "s" : ""} CMA manquant${missingCMACount > 1 ? "s" : ""}`);

  if (cmaRejected || hasLatePayment || (hasSessionSoon && missingCMACount > 0)) {
    return makeUrgency("elevee", reasons);
  }
  if (missingCMACount > 0) return makeUrgency("moyenne", reasons);
  return makeUrgency("faible", ["Dossier à jour"]);
}

/**
 * Compute urgency for a prospect with reasons.
 */
export function computeProspectUrgency(params: {
  daysLate: number;
  isRdv?: boolean;
}): UrgencyInfo {
  const { daysLate, isRdv } = params;
  if (daysLate > 7) return makeUrgency("elevee", [`Retard de ${daysLate} jours`]);
  if (daysLate > 0) return makeUrgency("moyenne", [`Retard de ${daysLate} jour${daysLate > 1 ? "s" : ""}`]);
  if (isRdv) return makeUrgency("moyenne", ["RDV aujourd'hui"]);
  return makeUrgency("faible", ["Suivi normal"]);
}

export function getUrgencyInfo(level: UrgencyLevel): UrgencyInfo {
  return makeUrgency(level, []);
}
