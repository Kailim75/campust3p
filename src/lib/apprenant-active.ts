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

/**
 * Contact importé depuis SmartOF (ou autre import historique) :
 * exclu des KPI actifs courants sans toucher au statut_apprenant officiel.
 */
export function isHistoricalImport(contact: {
  is_historical_import?: boolean | null;
  requalification_category?: string | null;
}): boolean {
  if (contact.is_historical_import === true) return true;
  return contact.requalification_category === "apprenant_historique_smartof";
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
  is_historical_import?: boolean | null;
  requalification_category?: string | null;
}

/**
 * Returns the list of reasons why this apprenant is considered active.
 * - statut_apprenant terminé (diplome/abandon/archive) → toujours inactif.
 * - import historique SmartOF (is_historical_import OU catégorie = apprenant_historique_smartof)
 *   → toujours inactif, sans toucher au statut officiel (Qualiopi préservé).
 * - Sinon fallback heuristique.
 */
export function getActiveReasons(contact: ActiveInput, recentDays?: number): ActiveReason[] {
  // Historic SmartOF imports are excluded from KPI without altering statut_apprenant
  if (isHistoricalImport(contact)) return [];
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

// ─────────────────────────────────────────────────────────────────────────────
// Règle unique « opérationnellement actif » — utilisée par tous les KPI métier.
// Ne touche jamais aux données ni à statut_apprenant.
// ─────────────────────────────────────────────────────────────────────────────

/** Statuts métier considérés comme « réellement en parcours ». */
export const STATUTS_EN_PARCOURS = [
  "En formation théorique",
  "En formation pratique",
  "Examen pratique programmé",
] as const;

export interface EstActifInput {
  deleted_at?: string | null;
  archived?: boolean | null;
  is_historical_import?: boolean | null;
  requalification_category?: string | null;
  statut_apprenant?: string | null;
  statut?: string | null;
  /** true s'il existe au moins une session_inscriptions.statut='inscrit' active (deleted_at IS NULL). */
  hasActiveInscription?: boolean;
}

export interface EstActifOptions {
  /** Par défaut false. true = inclure les imports historiques SmartOF dans le résultat. */
  inclureHistorique?: boolean;
}

/**
 * Règle unique d'apprenant opérationnellement actif.
 *
 * Conditions cumulatives :
 *  - deleted_at est null
 *  - archived est false
 *  - n'est pas un import historique SmartOF (sauf si inclureHistorique=true)
 *  - statut_apprenant ∉ { diplome, abandon, archive }
 *  - ET (inscription active OU statut métier en parcours)
 *
 * « Client » seul n'est PAS un apprenant actif opérationnel.
 */
export function estOperationnellementActif(
  contact: EstActifInput,
  options: EstActifOptions = {},
): boolean {
  if (contact.deleted_at) return false;
  if (contact.archived === true) return false;
  if (!options.inclureHistorique && isHistoricalImport(contact)) return false;
  if (isTerminated(contact)) return false;

  const hasInscription = contact.hasActiveInscription === true;
  const statutEnParcours =
    typeof contact.statut === "string" &&
    (STATUTS_EN_PARCOURS as readonly string[]).includes(contact.statut);

  return hasInscription || statutEnParcours;
}

/** Alias anglophone pour API homogène. */
export const isOperationallyActive = estOperationnellementActif;

/** Tooltip standard à afficher sur les KPI « apprenants actifs ». */
export const TOOLTIP_SMARTOF_EXCLUS =
  "Les apprenants historiques importés de SmartOF sont exclus des actifs opérationnels.";
