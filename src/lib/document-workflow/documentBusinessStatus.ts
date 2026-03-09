// ═══════════════════════════════════════════════════════════════
// Document Business Status — Pure computation logic
// ═══════════════════════════════════════════════════════════════

import type { DocumentBusinessStatus } from "./types";

/**
 * Input data used to compute the consolidated business status.
 * All fields come from the raw database rows.
 */
export interface StatusInput {
  /** Is this document required for the learner/session? */
  isRequired: boolean;
  /** Technical generation status (queued | generated | failed | null) */
  technicalStatus: string | null;
  /** Does a file exist? */
  hasFile: boolean;
  /** Has the document been sent via email? */
  hasSend: boolean;
  /** Send status if sent */
  sendFailed: boolean;
  /** Signature status (none | pending | sent | signed | refused) */
  signatureStatus: string | null;
  /** Is the document soft-deleted / archived? */
  isArchived: boolean;
  /** Are there missing required fields blocking generation? */
  isBlocked: boolean;
}

/**
 * Compute the consolidated business status from raw data signals.
 * 
 * Priority order (highest wins):
 * 1. archive → archive
 * 2. erreur → generation failed
 * 3. signe → signature completed
 * 4. envoye → sent (email or signature request sent)
 * 5. a_verifier → signature pending/refused
 * 6. genere → file exists
 * 7. incomplet → blocked by missing data
 * 8. a_generer → required but not generated
 * 9. non_requis → not required
 */
export function computeBusinessStatus(input: StatusInput): DocumentBusinessStatus {
  // Archived takes precedence
  if (input.isArchived) return "archive";

  // Technical error
  if (input.technicalStatus === "failed") return "erreur";

  // Signature completed
  if (input.signatureStatus === "signed") return "signe";

  // Sent (email or signature link)
  if (input.hasSend && !input.sendFailed) return "envoye";
  if (input.signatureStatus === "sent") return "envoye";

  // Signature pending / refused → needs verification
  if (input.signatureStatus === "pending") return "a_verifier";
  if (input.signatureStatus === "refused") return "a_verifier";

  // File generated successfully
  if (input.hasFile && input.technicalStatus === "generated") return "genere";

  // Still queued
  if (input.technicalStatus === "queued") return "a_generer";

  // Blocked by missing data
  if (input.isBlocked && input.isRequired) return "incomplet";

  // Required but no generation attempted
  if (input.isRequired && !input.hasFile) return "a_generer";

  // Not required and no file
  if (!input.isRequired && !input.hasFile) return "non_requis";

  // Fallback: generated file exists
  if (input.hasFile) return "genere";

  return "non_requis";
}

/** Human-readable labels for business statuses */
export const BUSINESS_STATUS_META: Record<DocumentBusinessStatus, {
  label: string;
  color: string; // Tailwind semantic class
  icon: string;
}> = {
  non_requis: { label: "Non requis",     color: "text-muted-foreground", icon: "Minus" },
  a_generer:  { label: "À générer",      color: "text-amber-600",        icon: "FilePlus" },
  incomplet:  { label: "Incomplet",       color: "text-orange-600",       icon: "AlertTriangle" },
  genere:     { label: "Généré",          color: "text-blue-600",         icon: "FileCheck" },
  a_verifier: { label: "À vérifier",     color: "text-yellow-600",       icon: "Eye" },
  envoye:     { label: "Envoyé",          color: "text-indigo-600",       icon: "Send" },
  consulte:   { label: "Consulté",        color: "text-teal-600",         icon: "BookOpen" },
  signe:      { label: "Signé",           color: "text-green-600",        icon: "CheckCircle" },
  archive:    { label: "Archivé",         color: "text-muted-foreground", icon: "Archive" },
  erreur:     { label: "Erreur",          color: "text-destructive",      icon: "XCircle" },
};
