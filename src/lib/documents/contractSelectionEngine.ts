// ═══════════════════════════════════════════════════════════════
// Contract Selection Engine — Clear Contrat vs Convention logic
// Centralized decision engine for contract document type selection
// ═══════════════════════════════════════════════════════════════

/**
 * Financing context for contract type determination.
 * Maps CRM financing types to legal categories.
 */
export type ContractFinancingContext =
  | "personnel"     // Personne physique finançant à ses frais
  | "entreprise"    // Entreprise / employeur
  | "cpf"           // Compte Personnel de Formation
  | "opco"          // Opérateur de compétences
  | "pole_emploi"   // France Travail (ex Pôle emploi)
  | "region"        // Conseil régional
  | "agefiph"       // AGEFIPH / Cap emploi
  | "unknown";      // Indéterminé

export type ContractDocumentRegime = "contrat" | "convention" | "a_qualifier";

export interface ContractSelectionResult {
  /** Régime documentaire sélectionné */
  regime: ContractDocumentRegime;
  /** Niveau de certitude */
  certainty: "certain" | "probable" | "indetermine";
  /** Raison lisible */
  reason: string;
  /** Base légale */
  legalBasis: string;
  /** Si bloquant pour la génération automatique */
  blockGeneration: boolean;
  /** Message de blocage si applicable */
  blockingMessage: string | null;
}

/**
 * RÈGLE DE SÉLECTION PRINCIPALE
 * 
 * 1. CONTRAT (Art. L6353-3 Code du travail)
 *    → Personne physique finançant elle-même sa formation
 * 
 * 2. CONVENTION (Art. L6353-1 Code du travail)
 *    → Acheteur/employeur/financeur distinct du stagiaire
 * 
 * 3. À QUALIFIER
 *    → Données insuffisantes ou contradictoires
 */
export function selectContractRegime(
  financingType: ContractFinancingContext | null,
  manualOverride?: ContractDocumentRegime | null
): ContractSelectionResult {
  // Priority 1: Manual admin override (always respected)
  if (manualOverride === "contrat" || manualOverride === "convention") {
    return {
      regime: manualOverride,
      certainty: "certain",
      reason: `Qualification manuelle par l'administration : ${manualOverride === "contrat" ? "Contrat de formation" : "Convention de formation"}`,
      legalBasis: manualOverride === "contrat"
        ? "Art. L6353-3 Code du travail"
        : "Art. L6353-1 Code du travail",
      blockGeneration: false,
      blockingMessage: null,
    };
  }

  // Priority 2: Auto-detection from financing type
  if (!financingType || financingType === "unknown") {
    return {
      regime: "a_qualifier",
      certainty: "indetermine",
      reason: "Type de financement non renseigné — impossible de déterminer le régime documentaire applicable",
      legalBasis: "Art. L6353-1 / L6353-3 Code du travail",
      blockGeneration: true,
      blockingMessage: "Cadre contractuel non qualifié. Veuillez qualifier le dossier (Contrat ou Convention) avant de générer le document.",
    };
  }

  switch (financingType) {
    case "personnel":
      return {
        regime: "contrat",
        certainty: "certain",
        reason: "Financement personnel par le stagiaire (personne physique à titre individuel et à ses frais)",
        legalBasis: "Art. L6353-3 à L6353-7 Code du travail",
        blockGeneration: false,
        blockingMessage: null,
      };

    case "entreprise":
      return {
        regime: "convention",
        certainty: "certain",
        reason: "Financement par l'employeur / entreprise → Convention de formation tripartite",
        legalBasis: "Art. L6353-1 et L6353-2 Code du travail",
        blockGeneration: false,
        blockingMessage: null,
      };

    case "cpf":
      return {
        regime: "convention",
        certainty: "certain",
        reason: "Financement CPF → Convention de formation avec financeur public",
        legalBasis: "Art. L6353-1 Code du travail, Art. L6323-1 et suivants",
        blockGeneration: false,
        blockingMessage: null,
      };

    case "opco":
      return {
        regime: "convention",
        certainty: "certain",
        reason: "Financement OPCO → Convention de formation avec opérateur de compétences",
        legalBasis: "Art. L6353-1 Code du travail, Art. L6332-1",
        blockGeneration: false,
        blockingMessage: null,
      };

    case "pole_emploi":
      return {
        regime: "convention",
        certainty: "certain",
        reason: "Financement France Travail (ex Pôle emploi) → Convention de formation",
        legalBasis: "Art. L6353-1 Code du travail",
        blockGeneration: false,
        blockingMessage: null,
      };

    case "region":
      return {
        regime: "convention",
        certainty: "certain",
        reason: "Financement Conseil régional → Convention de formation",
        legalBasis: "Art. L6353-1 Code du travail",
        blockGeneration: false,
        blockingMessage: null,
      };

    case "agefiph":
      return {
        regime: "convention",
        certainty: "certain",
        reason: "Financement AGEFIPH → Convention de formation",
        legalBasis: "Art. L6353-1 Code du travail",
        blockGeneration: false,
        blockingMessage: null,
      };

    default:
      return {
        regime: "a_qualifier",
        certainty: "indetermine",
        reason: `Type de financement "${financingType}" non reconnu — qualification manuelle requise`,
        legalBasis: "Art. L6353-1 / L6353-3 Code du travail",
        blockGeneration: true,
        blockingMessage: "Type de financement non reconnu. Veuillez qualifier manuellement le cadre contractuel.",
      };
  }
}

/**
 * Map CRM financement_type enum to ContractFinancingContext.
 */
export function mapFinancingType(crmType: string | null | undefined): ContractFinancingContext {
  if (!crmType) return "unknown";
  switch (crmType.toLowerCase()) {
    case "personnel": return "personnel";
    case "entreprise": return "entreprise";
    case "cpf": return "cpf";
    case "opco": return "opco";
    case "pole_emploi": return "pole_emploi";
    case "region": return "region";
    case "agefiph": return "agefiph";
    default: return "unknown";
  }
}

/**
 * Returns a human-readable label for the financing type.
 */
export function getFinancingLabel(financingType: ContractFinancingContext): string {
  const labels: Record<ContractFinancingContext, string> = {
    personnel: "Personnel (stagiaire)",
    entreprise: "Entreprise / Employeur",
    cpf: "CPF",
    opco: "OPCO",
    pole_emploi: "France Travail",
    region: "Conseil régional",
    agefiph: "AGEFIPH",
    unknown: "Non renseigné",
  };
  return labels[financingType] || "Non renseigné";
}

/**
 * Returns the regime label for display.
 */
export function getRegimeLabel(regime: ContractDocumentRegime): string {
  switch (regime) {
    case "contrat": return "Contrat de formation professionnelle";
    case "convention": return "Convention de formation professionnelle";
    case "a_qualifier": return "À qualifier";
  }
}
