import { differenceInDays } from "date-fns";

const RECENT_DAYS = 30;

/**
 * Determines if an apprenant is "active" based on existing data signals.
 * No new DB fields — purely UI logic.
 */
export function isActiveApprenant(contact: {
  sessionDateDebut?: string | null;
  documentsManquants?: number;
  paymentStatus?: string;
  totalFacture?: number;
  updated_at?: string;
}): boolean {
  // 1. Inscrit à une session future ou en cours
  if (contact.sessionDateDebut) {
    const sessionDate = new Date(contact.sessionDateDebut);
    if (sessionDate >= new Date(new Date().toDateString())) return true;
  }

  // 2. Documents CMA manquants / dossier incomplet
  if (contact.documentsManquants && contact.documentsManquants > 0) return true;

  // 3. Paiement/facture en attente ou en retard
  if (
    contact.totalFacture &&
    contact.totalFacture > 0 &&
    contact.paymentStatus &&
    ["retard", "partiel", "attente"].includes(contact.paymentStatus)
  ) return true;

  // 4. updated_at récent (< 30 jours)
  if (contact.updated_at) {
    const daysSince = differenceInDays(new Date(), new Date(contact.updated_at));
    if (daysSince <= RECENT_DAYS) return true;
  }

  return false;
}
