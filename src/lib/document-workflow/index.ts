// ═══════════════════════════════════════════════════════════════
// Document Workflow — Public API
// ═══════════════════════════════════════════════════════════════

// Types
export type {
  DocumentBlock,
  DocumentBusinessStatus,
  DocumentSourceSystem,
  DocumentVisibility,
  DocumentWorkflowItem,
  DocumentHistoryEntry,
  DocumentBlockSummary,
  SessionDocumentMatrixRow,
} from "./types";

// Block config
export {
  DOCUMENT_TYPE_REGISTRY,
  DOCUMENT_BLOCKS,
  getDocumentTypeConfig,
  getTypesForBlock,
  getRequiredDocumentTypes,
  getVisibleConfigs,
  type DocumentTypeConfig,
} from "./documentBlockConfig";

// Business status
export {
  computeBusinessStatus,
  BUSINESS_STATUS_META,
  type StatusInput,
} from "./documentBusinessStatus";

// Eligibility
export {
  checkDocumentEligibility,
  checkBulkEligibility,
  type EligibilityContact,
  type EligibilitySession,
  type EligibilityResult,
} from "./documentEligibility";

// Mapper
export {
  mapGeneratedDocV2,
  createExpectedPlaceholders,
  type RawGeneratedDocV2,
  type RawDocumentEnvoi,
  type RawSignatureRequest,
} from "./documentWorkflowMapper";

// Audit export
export {
  buildAuditCSV,
  buildLearnerAuditCSV,
  downloadCSV,
} from "./auditExport";

// V1 Migration Registry
export {
  V1_MIGRATION_REGISTRY,
  hasV1Dependencies,
  getMigrationStatus,
  resolveSourceSystem,
  getMigrationPriorities,
  isV1TableRequired,
  getDeprecationWarnings,
  getMigrationSummary,
  type V1MigrationEntry,
} from "./v1MigrationRegistry";

// Audit Logger
export {
  logDocumentAudit,
  logBulkGeneration,
  logBulkEmail,
  logExportAudit,
  type AuditAction,
} from "./documentAuditLogger";
