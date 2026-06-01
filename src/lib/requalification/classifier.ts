import type { RequalificationCategory } from "./categories";

export interface ClassifierInput {
  is_historical_import: boolean;
  requalification_category: RequalificationCategory | null;
  statut_apprenant: string | null;
  formation: string | null;
  email: string | null;
  telephone: string | null;
  hasInscription: boolean;
  hasFacture: boolean;
  hasPaiement: boolean;
  hasDocument: boolean;
  hasExamen: boolean;
  hasFichePratique: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClassifierResult {
  recommended: RequalificationCategory;
  confidence: "haute" | "moyenne" | "faible";
  reason: string;
}

/**
 * Moteur de SUGGESTION uniquement — ne modifie rien.
 * Règles documentées :
 *  1. Déjà classé manuellement → on respecte (confiance haute).
 *  2. Marqué historique SmartOF → confirmé.
 *  3. Inscription + activité métier récente → apprenant_actif_reel.
 *  4. Pas d'inscription + pas de facture + pas de doc + ancien (>180j) → candidat historique SmartOF.
 *  5. Champs obligatoires manquants → fiche_incomplete.
 *  6. statut_apprenant='actif' + aucune activité métier → anomalie_a_verifier.
 *  7. Fiche pratique active sans inscription → accompagnement_pratique_en_cours.
 *  8. Historique business (facture/paiement) sans inscription active → ancien_apprenant_a_archiver.
 */
export function classify(input: ClassifierInput): ClassifierResult {
  if (input.requalification_category && input.requalification_category !== "non_classe") {
    return {
      recommended: input.requalification_category,
      confidence: "haute",
      reason: "Classement manuel existant.",
    };
  }

  if (input.is_historical_import) {
    return {
      recommended: "apprenant_historique_smartof",
      confidence: "haute",
      reason: "Marqué comme import historique.",
    };
  }

  const missingFields: string[] = [];
  if (!input.email) missingFields.push("email");
  if (!input.telephone) missingFields.push("téléphone");
  if (!input.formation) missingFields.push("formation");

  if (input.hasFichePratique && !input.hasInscription) {
    return {
      recommended: "accompagnement_pratique_en_cours",
      confidence: "moyenne",
      reason: "Fiche pratique présente sans inscription théorique.",
    };
  }

  if (input.hasInscription) {
    return {
      recommended: "apprenant_actif_reel",
      confidence: "haute",
      reason: "Inscription active dans le CRM.",
    };
  }

  const ageDays = Math.floor(
    (Date.now() - new Date(input.createdAt).getTime()) / 86400000,
  );
  const noBusiness = !input.hasFacture && !input.hasPaiement && !input.hasDocument && !input.hasExamen;

  if (noBusiness && ageDays > 180) {
    return {
      recommended: "apprenant_historique_smartof",
      confidence: "faible",
      reason: `Aucune activité métier et fiche ancienne (${ageDays} j). Candidat probable à l'import historique.`,
    };
  }

  if (missingFields.length > 0) {
    return {
      recommended: "fiche_incomplete",
      confidence: "moyenne",
      reason: `Champs manquants : ${missingFields.join(", ")}.`,
    };
  }

  if (input.statut_apprenant === "actif" && noBusiness) {
    return {
      recommended: "anomalie_a_verifier",
      confidence: "moyenne",
      reason: "Statut 'actif' sans aucune activité métier.",
    };
  }

  if (input.hasFacture || input.hasPaiement) {
    return {
      recommended: "ancien_apprenant_a_archiver",
      confidence: "moyenne",
      reason: "Historique de facturation/paiement sans inscription active.",
    };
  }

  return {
    recommended: "non_classe",
    confidence: "faible",
    reason: "Aucune règle ne s'applique avec certitude.",
  };
}
