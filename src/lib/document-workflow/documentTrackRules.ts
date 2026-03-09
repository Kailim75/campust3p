// ═══════════════════════════════════════════════════════════════
// Document Track Rules — Formation track-aware document requirements
// ═══════════════════════════════════════════════════════════════

import type { FormationTrack } from "@/lib/formation-track";

/**
 * Document types that are ONLY required for a specific track.
 * If a type is not listed here, it follows the default from documentBlockConfig.
 */
const TRACK_ONLY_REQUIRED: Record<string, FormationTrack[]> = {
  // Attestation de fin de formation: required for both tracks
  attestation: ["initial", "continuing"],
  // Certificat de réalisation: required for both (Qualiopi)
  certificat_realisation: ["initial", "continuing"],
  // Evaluation à froid: recommended for both, but especially initial
  evaluation_froid: ["initial"],
  // Programme: always required
  programme: ["initial", "continuing"],
};

/**
 * Document types that should be excluded for a specific track.
 * These documents are not relevant and should not appear as required.
 */
const TRACK_EXCLUDED: Record<string, FormationTrack[]> = {
  // Chef d'oeuvre: only relevant for initial long formations
  chef_oeuvre: ["continuing"],
  // Bulletin d'inscription: primarily initial
  bulletin_inscription: ["continuing"],
};

/**
 * Override document 'required' status based on formation track.
 * Returns undefined if no track-specific override applies (use default).
 */
export function getTrackRequiredOverride(
  documentType: string,
  track: FormationTrack | null
): boolean | undefined {
  if (!track) return undefined;

  // Check exclusions first
  const excluded = TRACK_EXCLUDED[documentType];
  if (excluded?.includes(track)) return false;

  // Check specific requirements
  const required = TRACK_ONLY_REQUIRED[documentType];
  if (required) {
    return required.includes(track);
  }

  return undefined; // No override, use default
}

/**
 * Whether a document type should be visible for a given track.
 * Unlike required, this controls whether the document even shows up.
 */
export function isDocumentVisibleForTrack(
  documentType: string,
  track: FormationTrack | null
): boolean {
  if (!track) return true; // Show all if track unknown
  const excluded = TRACK_EXCLUDED[documentType];
  return !excluded?.includes(track);
}

// ── Convention / Contrat Disambiguation ──

/** Financing context for convention/contrat determination */
export type FinancingContext =
  | "personnel"    // → Contrat de formation (personne physique)
  | "entreprise"   // → Convention de formation (entreprise)
  | "cpf"          // → Convention de formation (financeur public)
  | "opco"         // → Convention de formation (financeur OPCO)
  | "pole_emploi"  // → Convention de formation (Pôle emploi)
  | "unknown";     // → À qualifier

export interface ContractDisambiguationResult {
  /** The recommended document type */
  recommendedType: "contrat" | "convention";
  /** Whether the recommendation is certain or needs admin qualification */
  certainty: "certain" | "a_qualifier";
  /** Human-readable explanation */
  reason: string;
  /** Legal basis reference */
  legalBasis: string;
}

/**
 * Determine whether a Convention or Contrat should be generated.
 * 
 * Legal rule:
 * - Art. L6353-3 Code du travail: Contrat de formation professionnelle
 *   → when a natural person finances their own training
 * - Art. L6353-1 Code du travail: Convention de formation professionnelle
 *   → when an employer, OPCO, or other organization finances the training
 *
 * If the financing type is unknown, returns "a_qualifier" to force
 * admin verification before generation.
 */
export function disambiguateContractType(
  financingType: FinancingContext | null
): ContractDisambiguationResult {
  switch (financingType) {
    case "personnel":
      return {
        recommendedType: "contrat",
        certainty: "certain",
        reason: "Financement personnel → Contrat de formation professionnelle (personne physique)",
        legalBasis: "Art. L6353-3 Code du travail",
      };

    case "entreprise":
      return {
        recommendedType: "convention",
        certainty: "certain",
        reason: "Financement entreprise → Convention de formation professionnelle",
        legalBasis: "Art. L6353-1 Code du travail",
      };

    case "cpf":
      return {
        recommendedType: "convention",
        certainty: "certain",
        reason: "Financement CPF → Convention de formation",
        legalBasis: "Art. L6353-1 Code du travail",
      };

    case "opco":
      return {
        recommendedType: "convention",
        certainty: "certain",
        reason: "Financement OPCO → Convention de formation",
        legalBasis: "Art. L6353-1 Code du travail",
      };

    case "pole_emploi":
      return {
        recommendedType: "convention",
        certainty: "certain",
        reason: "Financement Pôle emploi → Convention de formation",
        legalBasis: "Art. L6353-1 Code du travail",
      };

    case "unknown":
    case null:
    default:
      return {
        recommendedType: "contrat",
        certainty: "a_qualifier",
        reason: "Type de financement non qualifié — à déterminer par l'administration",
        legalBasis: "Art. L6353-1 / L6353-3 Code du travail",
      };
  }
}

/**
 * Map the CRM financement_type enum to our FinancingContext.
 */
export function mapCrmFinancingType(crmType: string | null): FinancingContext {
  switch (crmType) {
    case "personnel": return "personnel";
    case "entreprise": return "entreprise";
    case "cpf": return "cpf";
    case "opco": return "opco";
    case "pole_emploi": return "pole_emploi";
    default: return "unknown";
  }
}

// ── Continuing Formation Specifics ──

export interface ContinuingFormationRequirements {
  /** Whether carte pro validity needs checking */
  requiresCarteProCheck: boolean;
  /** Whether an attestation de renouvellement is needed */
  requiresRenewalAttestation: boolean;
  /** Programme duration in hours (continuing is shorter) */
  expectedDurationHours: number;
  /** Key regulatory reference */
  regulatoryRef: string;
}

/**
 * Get specific requirements for continuing formation documents.
 * Taxi/VTC/VMDTR continuing formations have different rules.
 */
export function getContinuingFormationRequirements(
  formationType: string | null
): ContinuingFormationRequirements {
  const lower = (formationType ?? "").toLowerCase();
  
  const isTaxi = /taxi/i.test(lower);
  const isVtc = /vtc/i.test(lower);
  const isVmdtr = /vmdtr/i.test(lower);
  const isT3P = isTaxi || isVtc || isVmdtr;

  return {
    requiresCarteProCheck: isT3P,
    requiresRenewalAttestation: isT3P,
    expectedDurationHours: isT3P ? 14 : 0, // FC T3P = 14h
    regulatoryRef: isT3P
      ? "Décret n°2017-483 du 6 avril 2017 - Formation continue T3P"
      : "Art. L6313-1 Code du travail",
  };
}
