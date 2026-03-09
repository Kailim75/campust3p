// ═══════════════════════════════════════════════════════════════
// Document Workflow — Unified Types
// ═══════════════════════════════════════════════════════════════

/** Business blocks for document lifecycle grouping */
export type DocumentBlock = "entree" | "suivi" | "fin" | "finances" | "specifiques";

/** Consolidated business status (distinct from technical generation status) */
export type DocumentBusinessStatus =
  | "non_requis"
  | "a_generer"
  | "incomplet"
  | "genere"
  | "a_verifier"
  | "envoye"
  | "consulte"
  | "signe"
  | "archive"
  | "erreur";

/** Origin system of the document */
export type DocumentSourceSystem = "v1" | "v2" | "upload" | "signature";

/** Where this document type can be displayed */
export type DocumentVisibility = "apprenant" | "session" | "both";

/** Unified document workflow item — the single business model exposed to UI */
export interface DocumentWorkflowItem {
  /** Unique ID (from source table) */
  id: string;
  /** Contact / learner ID */
  contactId: string | null;
  /** Session ID */
  sessionId: string | null;
  /** Centre ID (for multi-tenant isolation) */
  centreId: string;
  /** Template Studio template ID (V2) or null for V1/uploads */
  templateId: string | null;
  /** Human-readable template/document name */
  templateName: string;
  /** Template version ID at generation time */
  templateVersionId: string | null;
  /** Document type key (e.g. "convention", "contrat", "facture") */
  documentType: string;
  /** Business block this document belongs to */
  documentBlock: DocumentBlock;
  /** Origin system */
  sourceSystem: DocumentSourceSystem;
  /** File URL or storage path */
  fileUrl: string | null;
  /** Storage path (bucket-relative) */
  storagePath: string | null;
  /** When the document was generated */
  generatedAt: string | null;
  /** User ID who generated */
  generatedBy: string | null;
  /** Technical generation status from source */
  technicalStatus: string | null;
  /** Whether an email send exists */
  sendStatus: "not_sent" | "sent" | "failed" | null;
  /** When the document was sent */
  sentAt: string | null;
  /** Signature status from signature_requests */
  signatureStatus: "none" | "pending" | "sent" | "signed" | "refused" | null;
  /** When the document was signed */
  signedAt: string | null;
  /** Computed consolidated business status */
  businessStatus: DocumentBusinessStatus;
  /** Whether this document is required for this learner/session */
  isRequired: boolean;
  /** Whether generation is blocked due to missing data */
  isBlocked: boolean;
  /** List of missing required fields preventing generation */
  missingRequiredFields: string[];
  /** Most recent action timestamp */
  lastActionAt: string | null;
  /** Chronological history summary entries */
  historySummary: DocumentHistoryEntry[];
  /** Pack ID if generated as part of a document pack */
  packId: string | null;
  /** Inscription ID if linked */
  inscriptionId: string | null;
}

/** A single history entry for audit trail */
export interface DocumentHistoryEntry {
  action: "generated" | "sent" | "signed" | "refused" | "failed" | "archived" | "viewed" | "shared_whatsapp";
  at: string;
  by: string | null;
  details?: string;
}

/** Block summary for UI rendering */
export interface DocumentBlockSummary {
  block: DocumentBlock;
  label: string;
  icon: string;
  items: DocumentWorkflowItem[];
  totalExpected: number;
  generated: number;
  sent: number;
  signed: number;
  missing: number;
  blocked: number;
  errors: number;
}

/** Contract frame status for session matrix display */
export type ContractFrameDisplay = "contrat" | "convention" | "a_qualifier" | null;
export type ContractFrameSource = "manual" | "auto" | null;

/** Session-level matrix row (one per learner) */
export interface SessionDocumentMatrixRow {
  contactId: string;
  contactName: string;
  contactEmail: string | null;
  blocks: DocumentBlockSummary[];
  overallStatus: "complete" | "incomplete" | "blocked" | "empty";
  totalDocuments: number;
  generatedCount: number;
  missingCount: number;
  /** Contract frame qualification */
  contractFrame: ContractFrameDisplay;
  contractFrameSource: ContractFrameSource;
}
