import { differenceInDays } from "date-fns";

// ─── Configurable threshold (localStorage-backed) ───
const STORAGE_KEY = "apprenant_recent_days";
const DEFAULT_RECENT_DAYS = 30;

export function getRecentDaysThreshold(): number {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && [30, 60, 90].includes(Number(v))) return Number(v);
  } catch {}
  return DEFAULT_RECENT_DAYS;
}

export function setRecentDaysThreshold(days: 30 | 60 | 90) {
  try { localStorage.setItem(STORAGE_KEY, String(days)); } catch {}
}

// ─── Official statut_apprenant type ───
export type StatutApprenant = "actif" | "diplome" | "abandon" | "archive";
export type StatutCMA = "docs_manquants" | "en_cours" | "valide" | "rejete";

const STATUT_APPRENANT_LABELS: Record<StatutApprenant, string> = {
  actif: "Actif",
  diplome: "Diplômé",
  abandon: "Abandon",
  archive: "Archivé",
};

export function getStatutApprenantLabel(s: StatutApprenant): string {
  return STATUT_APPRENANT_LABELS[s] ?? s;
}

const STATUT_CMA_LABELS: Record<StatutCMA, string> = {
  docs_manquants: "Docs manquants",
  en_cours: "En cours",
  valide: "Validé",
  rejete: "Rejeté",
};

export function getStatutCMALabel(s: StatutCMA): string {
  return STATUT_CMA_LABELS[s] ?? s;
}

/**
 * Check if a contact should be considered "terminated" (excluded from active lists)
 */
export function isTerminated(contact: { statut_apprenant?: string | null }): boolean {
  const s = contact.statut_apprenant as StatutApprenant | null | undefined;
  return s === "diplome" || s === "abandon" || s === "archive";
}

export type ActiveReason =
  | "session_future"
  | "docs_manquants"
  | "paiement_en_cours"
  | "activite_recente";

const REASON_LABELS: Record<ActiveReason, string> = {
  session_future: "Session future",
  docs_manquants: "Docs manquants",
  paiement_en_cours: "Paiement en cours",
  activite_recente: "Activité récente",
};

export function getActiveReasonLabel(r: ActiveReason): string {
  return REASON_LABELS[r];
}

interface ActiveInput {
  statut_apprenant?: string | null;
  sessionDateDebut?: string | null;
  documentsManquants?: number;
  paymentStatus?: string;
  totalFacture?: number;
  updated_at?: string;
}

/**
 * Returns the list of reasons why this apprenant is considered active.
 * If statut_apprenant is set to diplome/abandon/archive → always inactive.
 * Otherwise fallback to heuristic (backward compatible).
 */
export function getActiveReasons(contact: ActiveInput, recentDays?: number): ActiveReason[] {
  // Official status takes precedence
  if (isTerminated(contact)) return [];

  const threshold = recentDays ?? getRecentDaysThreshold();
  const reasons: ActiveReason[] = [];

  if (contact.sessionDateDebut) {
    const sessionDate = new Date(contact.sessionDateDebut);
    if (sessionDate >= new Date(new Date().toDateString())) {
      reasons.push("session_future");
    }
  }

  if (contact.documentsManquants && contact.documentsManquants > 0) {
    reasons.push("docs_manquants");
  }

  if (
    contact.totalFacture &&
    contact.totalFacture > 0 &&
    contact.paymentStatus &&
    ["retard", "partiel", "attente"].includes(contact.paymentStatus)
  ) {
    reasons.push("paiement_en_cours");
  }

  if (contact.updated_at) {
    const daysSince = differenceInDays(new Date(), new Date(contact.updated_at));
    if (daysSince <= threshold) {
      reasons.push("activite_recente");
    }
  }

  return reasons;
}

/**
 * Simple boolean check — backward compatible.
 */
export function isActiveApprenant(contact: ActiveInput, recentDays?: number): boolean {
  return getActiveReasons(contact, recentDays).length > 0;
}
