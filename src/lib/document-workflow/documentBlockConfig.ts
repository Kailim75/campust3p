// ═══════════════════════════════════════════════════════════════
// Document Block Config — Centralized mapping
// ═══════════════════════════════════════════════════════════════

import type { DocumentBlock, DocumentVisibility } from "./types";

/** Configuration for a single document type */
export interface DocumentTypeConfig {
  /** Document type key (matches template_type enum / template.type) */
  type: string;
  /** Human label */
  label: string;
  /** Business block */
  block: DocumentBlock;
  /** Required by default (can be overridden by pack config) */
  requiredByDefault: boolean;
  /** Where it should appear */
  visibility: DocumentVisibility;
  /** Sort order within block */
  sortOrder: number;
  /** Whether this supports bulk generation from session view */
  supportsBulk: boolean;
  /** Whether this requires signature workflow */
  requiresSignature: boolean;
}

/**
 * Central registry of all known document types mapped to business blocks.
 * Adding a new document type = adding one entry here. No other file changes needed.
 */
export const DOCUMENT_TYPE_REGISTRY: readonly DocumentTypeConfig[] = [
  // ── Bloc ENTRÉE ──
  { type: "convention",           label: "Convention de formation",      block: "entree",    requiredByDefault: true,  visibility: "both",      sortOrder: 1,  supportsBulk: true,  requiresSignature: true },
  { type: "contrat",              label: "Contrat de formation",         block: "entree",    requiredByDefault: true,  visibility: "both",      sortOrder: 2,  supportsBulk: true,  requiresSignature: true },
  { type: "programme",            label: "Programme de formation",       block: "entree",    requiredByDefault: true,  visibility: "both",      sortOrder: 3,  supportsBulk: true,  requiresSignature: false },
  { type: "convocation",          label: "Convocation",                  block: "entree",    requiredByDefault: true,  visibility: "both",      sortOrder: 4,  supportsBulk: true,  requiresSignature: false },
  { type: "reglement_interieur",  label: "Règlement intérieur",          block: "entree",    requiredByDefault: true,  visibility: "both",      sortOrder: 5,  supportsBulk: true,  requiresSignature: true },
  { type: "bulletin_inscription", label: "Bulletin d'inscription",       block: "entree",    requiredByDefault: false, visibility: "apprenant", sortOrder: 6,  supportsBulk: false, requiresSignature: false },
  { type: "devis",                label: "Devis",                        block: "entree",    requiredByDefault: false, visibility: "apprenant", sortOrder: 7,  supportsBulk: false, requiresSignature: false },

  // ── Bloc SUIVI ──
  { type: "emargement",           label: "Feuille d'émargement",         block: "suivi",     requiredByDefault: true,  visibility: "session",   sortOrder: 1,  supportsBulk: false, requiresSignature: false },
  { type: "feuille_emargement",   label: "Feuille d'émargement (alt)",   block: "suivi",     requiredByDefault: false, visibility: "session",   sortOrder: 2,  supportsBulk: false, requiresSignature: false },
  { type: "evaluation",           label: "Évaluation",                   block: "suivi",     requiredByDefault: false, visibility: "both",      sortOrder: 3,  supportsBulk: false, requiresSignature: false },
  { type: "evaluation_chaud",     label: "Évaluation à chaud",           block: "suivi",     requiredByDefault: true,  visibility: "both",      sortOrder: 4,  supportsBulk: true,  requiresSignature: false },
  { type: "positionnement",       label: "Test de positionnement",       block: "suivi",     requiredByDefault: false, visibility: "apprenant", sortOrder: 5,  supportsBulk: false, requiresSignature: false },
  { type: "test_positionnement",  label: "Test de positionnement (alt)", block: "suivi",     requiredByDefault: false, visibility: "apprenant", sortOrder: 6,  supportsBulk: false, requiresSignature: false },

  // ── Bloc FIN ──
  { type: "attestation",             label: "Attestation de fin de formation",  block: "fin",    requiredByDefault: true,  visibility: "both",      sortOrder: 1,  supportsBulk: true,  requiresSignature: false },
  { type: "certificat_realisation",  label: "Certificat de réalisation",        block: "fin",    requiredByDefault: true,  visibility: "both",      sortOrder: 2,  supportsBulk: true,  requiresSignature: false },
  { type: "evaluation_froid",        label: "Évaluation à froid (J+30)",        block: "fin",    requiredByDefault: false, visibility: "both",      sortOrder: 3,  supportsBulk: true,  requiresSignature: false },
  { type: "chef_oeuvre",             label: "Chef d'œuvre",                      block: "fin",    requiredByDefault: false, visibility: "apprenant", sortOrder: 4,  supportsBulk: false, requiresSignature: false },

  // ── Bloc FINANCES ──
  { type: "invoice",              label: "Facture",                      block: "finances",  requiredByDefault: true,  visibility: "apprenant", sortOrder: 1,  supportsBulk: false, requiresSignature: false },

  // ── Bloc SPÉCIFIQUES ──
  { type: "procedure_reclamation",label: "Procédure de réclamation",     block: "specifiques", requiredByDefault: false, visibility: "both",    sortOrder: 1,  supportsBulk: false, requiresSignature: false },
  { type: "email",                label: "Email",                        block: "specifiques", requiredByDefault: false, visibility: "both",    sortOrder: 2,  supportsBulk: false, requiresSignature: false },
  { type: "autre",                label: "Autre",                        block: "specifiques", requiredByDefault: false, visibility: "both",    sortOrder: 3,  supportsBulk: false, requiresSignature: false },
] as const;

/** Block metadata for UI rendering */
export const DOCUMENT_BLOCKS: Record<DocumentBlock, { label: string; icon: string; sortOrder: number }> = {
  entree:      { label: "Entrée en formation", icon: "LogIn",       sortOrder: 1 },
  suivi:       { label: "Suivi pédagogique",   icon: "ClipboardList", sortOrder: 2 },
  fin:         { label: "Fin de parcours",     icon: "GraduationCap", sortOrder: 3 },
  finances:    { label: "Administratif / Financier", icon: "Receipt", sortOrder: 4 },
  specifiques: { label: "Documents spécifiques", icon: "FolderOpen", sortOrder: 5 },
};

// ── Lookup helpers (pure, no DB) ──

const typeMap = new Map(DOCUMENT_TYPE_REGISTRY.map(c => [c.type, c]));

/** Get config for a document type. Falls back to 'specifiques' block for unknown types. */
export function getDocumentTypeConfig(type: string): DocumentTypeConfig {
  return typeMap.get(type) ?? {
    type,
    label: type,
    block: "specifiques",
    requiredByDefault: false,
    visibility: "both",
    sortOrder: 99,
    supportsBulk: false,
    requiresSignature: false,
  };
}

/** Get all document types for a given block */
export function getTypesForBlock(block: DocumentBlock): DocumentTypeConfig[] {
  return DOCUMENT_TYPE_REGISTRY.filter(c => c.block === block);
}

/** Get all required document types (default) */
export function getRequiredDocumentTypes(): DocumentTypeConfig[] {
  return DOCUMENT_TYPE_REGISTRY.filter(c => c.requiredByDefault);
}

/** Get configs visible for a given context */
export function getVisibleConfigs(context: "apprenant" | "session"): DocumentTypeConfig[] {
  return DOCUMENT_TYPE_REGISTRY.filter(
    c => c.visibility === "both" || c.visibility === context
  );
}
