// ═══════════════════════════════════════════════════════════════
// Document Eligibility — Pre-generation guard logic
// ═══════════════════════════════════════════════════════════════

/**
 * Minimal contact data needed for eligibility checks.
 * Keep lightweight — only fields actually checked.
 */
export interface EligibilityContact {
  id: string;
  nom: string | null;
  prenom: string | null;
  email: string | null;
  date_naissance: string | null;
  ville_naissance: string | null;
}

export interface EligibilitySession {
  id: string;
  nom: string | null;
  date_debut: string | null;
  date_fin: string | null;
  formation_type: string | null;
  lieu: string | null;
  duree_heures: number | null;
  prix_total: number | null;
}

export interface EligibilityResult {
  /** Can the document be generated? */
  eligible: boolean;
  /** Missing fields blocking generation */
  missingFields: string[];
  /** Human-readable blocking message */
  message: string | null;
}

type RuleSet = Record<string, (contact: EligibilityContact, session: EligibilitySession | null) => string[]>;

/**
 * Per-document-type validation rules.
 * Each rule returns an array of missing field labels (empty = OK).
 */
const RULES: RuleSet = {
  convention: (c, s) => {
    const missing: string[] = [];
    if (!c.nom || !c.prenom) missing.push("Identité apprenant (nom/prénom)");
    if (!c.email) missing.push("Email apprenant");
    if (!s) missing.push("Session liée");
    if (s && !s.date_debut) missing.push("Date de début de session");
    if (s && !s.date_fin) missing.push("Date de fin de session");
    if (s && (s.prix_total == null || s.prix_total <= 0)) missing.push("Prix de la formation");
    if (s && !s.nom) missing.push("Nom de la formation");
    return missing;
  },

  contrat: (c, s) => {
    const missing: string[] = [];
    if (!c.nom || !c.prenom) missing.push("Identité apprenant");
    if (!c.date_naissance) missing.push("Date de naissance");
    if (!c.email) missing.push("Email apprenant");
    if (!s) missing.push("Session liée");
    if (s && !s.date_debut) missing.push("Date de début");
    if (s && !s.date_fin) missing.push("Date de fin");
    if (s && (s.prix_total == null || s.prix_total <= 0)) missing.push("Prix de la formation");
    return missing;
  },

  convocation: (c, s) => {
    const missing: string[] = [];
    if (!c.nom || !c.prenom) missing.push("Identité apprenant");
    if (!s) missing.push("Session liée");
    if (s && !s.date_debut) missing.push("Date de début de session");
    if (s && !s.lieu) missing.push("Lieu de formation");
    return missing;
  },

  programme: (_c, s) => {
    const missing: string[] = [];
    if (!s) missing.push("Session liée");
    if (s && !s.nom) missing.push("Nom de la formation");
    if (s && !s.duree_heures) missing.push("Durée en heures");
    return missing;
  },

  attestation: (c, s) => {
    const missing: string[] = [];
    if (!c.nom || !c.prenom) missing.push("Identité apprenant");
    if (!c.date_naissance) missing.push("Date de naissance");
    if (!s) missing.push("Session liée");
    if (s && !s.date_debut) missing.push("Date de début");
    if (s && !s.date_fin) missing.push("Date de fin");
    if (s && !s.duree_heures) missing.push("Volume horaire");
    return missing;
  },

  invoice: (c, s) => {
    const missing: string[] = [];
    if (!c.nom || !c.prenom) missing.push("Identité apprenant");
    if (!c.email) missing.push("Email apprenant");
    if (s && (s.prix_total == null || s.prix_total <= 0)) missing.push("Prix de la formation");
    return missing;
  },

  reglement_interieur: () => [],
  bulletin_inscription: (c) => {
    return (!c.nom || !c.prenom) ? ["Identité apprenant"] : [];
  },

  emargement: (_c, s) => {
    const missing: string[] = [];
    if (!s) missing.push("Session liée");
    if (s && !s.date_debut) missing.push("Date de début de session");
    return missing;
  },

  evaluation_chaud: (_c, s) => {
    return !s ? ["Session liée"] : [];
  },

  evaluation_froid: (c, s) => {
    const missing: string[] = [];
    if (!c.email) missing.push("Email apprenant");
    if (!s) missing.push("Session liée");
    if (s && !s.date_fin) missing.push("Date de fin de session");
    return missing;
  },
};

/**
 * Check if a document of the given type can be generated for this contact/session.
 * Pure function — no DB calls.
 */
export function checkDocumentEligibility(
  documentType: string,
  contact: EligibilityContact,
  session: EligibilitySession | null
): EligibilityResult {
  const ruleFn = RULES[documentType];

  // No specific rules → always eligible
  if (!ruleFn) {
    return { eligible: true, missingFields: [], message: null };
  }

  const missingFields = ruleFn(contact, session);

  if (missingFields.length === 0) {
    return { eligible: true, missingFields: [], message: null };
  }

  return {
    eligible: false,
    missingFields,
    message: `Données manquantes : ${missingFields.join(", ")}`,
  };
}

/**
 * Batch eligibility check for multiple document types.
 * Returns a map of documentType → EligibilityResult.
 */
export function checkBulkEligibility(
  documentTypes: string[],
  contact: EligibilityContact,
  session: EligibilitySession | null
): Record<string, EligibilityResult> {
  const results: Record<string, EligibilityResult> = {};
  for (const type of documentTypes) {
    results[type] = checkDocumentEligibility(type, contact, session);
  }
  return results;
}
