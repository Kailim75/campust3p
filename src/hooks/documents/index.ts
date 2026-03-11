// ═══════════════════════════════════════════════════════════════
// Document Hooks — Barrel Export (Phase 6)
// Façade légère pour le domaine documentaire
// ═══════════════════════════════════════════════════════════════

// ── Génération ──────────────────────────────────────────────────
export { useDocumentGenerator } from "../useDocumentGenerator";
export type { DocumentType } from "../useDocumentGenerator";

// ── Templates ───────────────────────────────────────────────────
export { useDocumentTemplates, replaceVariables } from "../useDocumentTemplates";
export { useDocumentTemplateFiles, useSaveGeneratedDocument } from "../useDocumentTemplateFiles";
export { usePublishedTemplate } from "../usePublishedTemplate";
export { useTemplatesV2 } from "../useTemplateStudioV2";

// ── Workflow & Orchestration ────────────────────────────────────
export { useDocumentWorkflow } from "../useDocumentWorkflow";
export { useLearnerDocumentBlocks } from "../useLearnerDocumentBlocks";
export { useSessionDocumentMatrix } from "../useSessionDocumentMatrix";

// ── Envoi & Historique ──────────────────────────────────────────
export {
  useDocumentEnvois,
  useAllDocumentEnvois,
  useCreateDocumentEnvoi,
  useBulkCreateDocumentEnvois,
  useUpdateDocumentEnvoi,
} from "../useDocumentEnvois";
export { useDocumentEnvoiHistory } from "../useDocumentEnvoiHistory";

// ── Signatures ──────────────────────────────────────────────────
export {
  useSignatureRequests,
  useSignatureRequestsByContact,
  useSignatureRequest,
  useCreateSignatureRequest,
  useSendSignatureRequest,
  useSignDocument,
  useRefuseSignature,
  useDeleteSignatureRequest,
  useSendSignatureEmail,
} from "../useSignatures";
export type { SignatureRequest, SignatureRequestInsert } from "../useSignatures";

// ── Documents Contact ───────────────────────────────────────────
export {
  useContactDocuments,
  useUploadDocument,
  useDeleteDocument,
  downloadDocument,
  documentTypes,
} from "../useContactDocuments";

// ── Documents Pédagogiques ──────────────────────────────────────
export {
  usePedagogicalDocuments,
  usePedagogicalDocumentsBySession,
  useUploadPedagogicalDocument,
  useDeletePedagogicalDocument,
  useDownloadPedagogicalDocument,
  useBatchPedagogicalDocuments,
  DOCUMENT_TYPE_LABELS,
} from "../usePedagogicalDocuments";
export type {
  PedagogicalDocument,
  PedagogicalDocumentInsert,
  PedagogicalDocumentType,
  DocumentStatus,
} from "../usePedagogicalDocuments";

// ── Attestations ────────────────────────────────────────────────
export { useAttestationCertificates, useContactCertificates } from "../useAttestationCertificates";

// ── Chevalets ───────────────────────────────────────────────────
export { useGenerateChevalet, useGenerateBatchChevalets } from "../useChevalets";

// ── Scanner ─────────────────────────────────────────────────────
export { useDocumentScanner } from "../useDocumentScanner";

// ── Legacy (à supprimer Phase 7) ────────────────────────────────
export { useStudioTemplates } from "../useTemplateStudio";
