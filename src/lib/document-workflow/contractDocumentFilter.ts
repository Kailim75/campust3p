// ═══════════════════════════════════════════════════════════════
// Contract Document Filter — Filter contrat/convention based on
// persisted qualification
// ═══════════════════════════════════════════════════════════════

import type { DocumentTypeConfig } from "./documentBlockConfig";

export type ContractDocType = "contrat" | "convention";
export type FrameStatus = "qualifie" | "a_qualifier" | "auto_detecte";

export interface ContractContext {
  contractDocumentType: ContractDocType | null;
  contractFrameStatus: FrameStatus;
}

/**
 * Filter document configs to show only the relevant contract document.
 * 
 * Rules:
 * - If qualified as "contrat": show contrat, hide convention
 * - If qualified as "convention": show convention, hide contrat
 * - If "a_qualifier": show both but mark as blocked
 * - If null/unknown: show both (backward compat)
 */
export function filterContractDocuments(
  configs: DocumentTypeConfig[],
  context: ContractContext | null
): DocumentTypeConfig[] {
  if (!context || !context.contractDocumentType) {
    // No qualification yet — keep both visible
    return configs;
  }

  const hideType = context.contractDocumentType === "contrat" ? "convention" : "contrat";

  return configs.filter(c => c.type !== hideType);
}

/**
 * Check if a specific document type is blocked by contract qualification.
 * Returns a blocking reason or null if not blocked.
 */
export function getContractBlockingReason(
  documentType: string,
  context: ContractContext | null
): string | null {
  if (!context) return null;

  const isContractType = documentType === "contrat" || documentType === "convention";
  if (!isContractType) return null;

  // If a_qualifier and this is a contract document → blocked
  if (context.contractFrameStatus === "a_qualifier") {
    return "Cadre contractuel non qualifié — veuillez qualifier le dossier (Contrat ou Convention)";
  }

  // If qualified but this is the wrong type → should not be visible
  if (context.contractDocumentType && context.contractDocumentType !== documentType) {
    return `Ce dossier relève d'un${context.contractDocumentType === "contrat" ? " contrat" : "e convention"} de formation`;
  }

  return null;
}
