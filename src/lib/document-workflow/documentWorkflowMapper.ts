// ═══════════════════════════════════════════════════════════════
// Document Workflow Mapper — Unify multi-table data into
// DocumentWorkflowItem[]
// ═══════════════════════════════════════════════════════════════

import type {
  DocumentWorkflowItem,
  DocumentHistoryEntry,
  DocumentSourceSystem,
} from "./types";
import { getDocumentTypeConfig, getVisibleConfigs } from "./documentBlockConfig";
import { computeBusinessStatus, type StatusInput } from "./documentBusinessStatus";
import {
  checkDocumentEligibility,
  type EligibilityContact,
  type EligibilitySession,
} from "./documentEligibility";
import {
  isDocumentVisibleForTrack,
  getTrackRequiredOverride,
} from "./documentTrackRules";
import {
  filterContractDocuments,
  getContractBlockingReason,
  type ContractContext,
} from "./contractDocumentFilter";
import type { FormationTrack } from "@/lib/formation-track";

// ── Raw row shapes from Supabase queries ──

export interface RawGeneratedDocV2 {
  id: string;
  centre_id: string;
  contact_id: string | null;
  session_id: string | null;
  template_id: string;
  template_version_id: string | null;
  inscription_id: string | null;
  pack_id: string | null;
  file_path: string | null;
  file_name: string | null;
  file_type: string | null;
  status: string | null; // queued | generated | failed
  error_message: string | null;
  created_at: string | null;
  created_by: string | null;
  deleted_at: string | null;
  variables_snapshot: Record<string, unknown> | null;
  // Joined template data
  template?: {
    id: string;
    name: string;
    type: string;
    category: string | null;
  } | null;
}

export interface RawDocumentEnvoi {
  id: string;
  contact_id: string | null;
  session_id: string | null;
  document_type: string;
  document_name: string;
  document_path: string | null;
  statut: string;
  date_envoi: string;
  envoi_type: string;
  envoyé_par: string | null;
}

export interface RawSignatureRequest {
  id: string;
  contact_id: string;
  type_document: string;
  statut: string; // brouillon | envoye | signe | refuse | expire
  document_url: string | null;
  date_envoi: string | null;
  date_signature: string | null;
  session_inscription_id: string | null;
  created_at: string;
}

// ── Mapping functions ──

/**
 * Map a generated_documents_v2 row to a DocumentWorkflowItem.
 */
export function mapGeneratedDocV2(
  doc: RawGeneratedDocV2,
  envois: RawDocumentEnvoi[],
  signatures: RawSignatureRequest[],
  contact: EligibilityContact | null,
  session: EligibilitySession | null
): DocumentWorkflowItem {
  const docType = doc.template?.type ?? "autre";
  const config = getDocumentTypeConfig(docType);

  // Find matching envois (by contact + document_type)
  const relatedEnvois = envois.filter(
    e => e.contact_id === doc.contact_id && e.document_type === docType
  );
  const latestEnvoi = relatedEnvois[0] ?? null; // already sorted desc

  // Find matching signature
  const relatedSig = signatures.find(
    s => s.contact_id === doc.contact_id && s.type_document === docType
  ) ?? null;

  // Eligibility
  const eligibility = contact
    ? checkDocumentEligibility(docType, contact, session)
    : { eligible: true, missingFields: [] as string[], message: null };

  // Build history
  const history: DocumentHistoryEntry[] = [];
  if (doc.created_at) {
    history.push({ action: "generated", at: doc.created_at, by: doc.created_by });
  }
  if (doc.status === "failed") {
    history.push({ action: "failed", at: doc.created_at ?? new Date().toISOString(), by: null, details: doc.error_message ?? undefined });
  }
  for (const e of relatedEnvois) {
    history.push({ action: "sent", at: e.date_envoi, by: e.envoyé_par });
  }
  if (relatedSig?.date_signature) {
    history.push({ action: "signed", at: relatedSig.date_signature, by: null });
  }
  history.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const sigStatus = mapSignatureStatus(relatedSig?.statut ?? null);

  const statusInput: StatusInput = {
    isRequired: config.requiredByDefault,
    technicalStatus: doc.status,
    hasFile: !!doc.file_path,
    hasSend: !!latestEnvoi,
    sendFailed: latestEnvoi?.statut === "echec",
    signatureStatus: sigStatus,
    isArchived: !!doc.deleted_at,
    isBlocked: !eligibility.eligible,
  };

  return {
    id: doc.id,
    contactId: doc.contact_id,
    sessionId: doc.session_id,
    centreId: doc.centre_id,
    templateId: doc.template_id,
    templateName: doc.template?.name ?? config.label,
    templateVersionId: doc.template_version_id,
    documentType: docType,
    documentBlock: config.block,
    sourceSystem: "v2",
    fileUrl: doc.file_path ? buildStorageUrl(doc.file_path) : null,
    storagePath: doc.file_path,
    generatedAt: doc.created_at,
    generatedBy: doc.created_by,
    technicalStatus: doc.status,
    sendStatus: latestEnvoi ? (latestEnvoi.statut === "echec" ? "failed" : "sent") : "not_sent",
    sentAt: latestEnvoi?.date_envoi ?? null,
    signatureStatus: sigStatus,
    signedAt: relatedSig?.date_signature ?? null,
    businessStatus: computeBusinessStatus(statusInput),
    isRequired: config.requiredByDefault,
    isBlocked: !eligibility.eligible,
    missingRequiredFields: eligibility.missingFields,
    lastActionAt: history[0]?.at ?? doc.created_at,
    historySummary: history,
    packId: doc.pack_id,
    inscriptionId: doc.inscription_id,
  };
}

/**
 * Create placeholder items for expected documents that haven't been generated yet.
 * Uses the block config to determine which documents are expected.
 */
export function createExpectedPlaceholders(
  existingTypes: Set<string>,
  contact: EligibilityContact,
  session: EligibilitySession | null,
  centreId: string,
  context: "apprenant" | "session",
  track?: FormationTrack | null,
  contractContext?: ContractContext | null
): DocumentWorkflowItem[] {
  let configs = getVisibleConfigs(context);

  // Contract-aware filtering: hide irrelevant contrat/convention
  if (contractContext) {
    configs = filterContractDocuments(configs, contractContext);
  }

  const placeholders: DocumentWorkflowItem[] = [];

  for (const config of configs) {
    if (existingTypes.has(config.type)) continue;

    // Track-aware visibility: skip documents not relevant for this track
    if (!isDocumentVisibleForTrack(config.type, track ?? null)) continue;

    // Track-aware required override
    const trackOverride = getTrackRequiredOverride(config.type, track ?? null);
    const isRequired = trackOverride ?? config.requiredByDefault;
    if (!isRequired) continue; // Only show required placeholders

    const eligibility = checkDocumentEligibility(config.type, contact, session);

    // Contract blocking: if a_qualifier, block contrat/convention generation
    const contractBlocking = getContractBlockingReason(config.type, contractContext ?? null);
    const isContractBlocked = !!contractBlocking;
    const allMissing = [
      ...eligibility.missingFields,
      ...(contractBlocking ? [contractBlocking] : []),
    ];

    const statusInput: StatusInput = {
      isRequired: true,
      technicalStatus: null,
      hasFile: false,
      hasSend: false,
      sendFailed: false,
      signatureStatus: null,
      isArchived: false,
      isBlocked: !eligibility.eligible || isContractBlocked,
    };

    placeholders.push({
      id: `placeholder-${config.type}-${contact.id}`,
      contactId: contact.id,
      sessionId: session?.id ?? null,
      centreId,
      templateId: null,
      templateName: config.label,
      templateVersionId: null,
      documentType: config.type,
      documentBlock: config.block,
      sourceSystem: "v2",
      fileUrl: null,
      storagePath: null,
      generatedAt: null,
      generatedBy: null,
      technicalStatus: null,
      sendStatus: null,
      sentAt: null,
      signatureStatus: null,
      signedAt: null,
      businessStatus: computeBusinessStatus(statusInput),
      isRequired: true,
      isBlocked: !eligibility.eligible,
      missingRequiredFields: eligibility.missingFields,
      lastActionAt: null,
      historySummary: [],
      packId: null,
      inscriptionId: null,
    });
  }

  return placeholders;
}

// ── Helpers ──

function mapSignatureStatus(raw: string | null): DocumentWorkflowItem["signatureStatus"] {
  switch (raw) {
    case "brouillon": return "pending";
    case "envoye": return "sent";
    case "signe": return "signed";
    case "refuse": return "refused";
    default: return "none";
  }
}

function buildStorageUrl(filePath: string): string {
  // Storage paths are bucket-relative; the actual URL construction
  // should use supabase.storage but we keep the mapper pure.
  // The hook layer will resolve full URLs.
  return filePath;
}
