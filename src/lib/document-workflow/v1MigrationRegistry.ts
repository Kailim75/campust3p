// ═══════════════════════════════════════════════════════════════
// V1 Migration Registry — Tracks V1 dependencies and migration path
// ═══════════════════════════════════════════════════════════════

import type { DocumentSourceSystem } from "./types";

/**
 * V1 feature/table → V2 equivalent mapping
 */
export interface V1MigrationEntry {
  v1Feature: string;
  v1Table: string;
  v2Equivalent: string;
  v2Table: string;
  status: "migrated" | "partial" | "pending" | "deprecated";
  migrationNotes: string;
  breakingChange: boolean;
}

/**
 * Registry of V1 features and their migration status
 */
export const V1_MIGRATION_REGISTRY: V1MigrationEntry[] = [
  {
    v1Feature: "Document Templates (fichiers)",
    v1Table: "document_template_files",
    v2Equivalent: "Template Studio Templates",
    v2Table: "template_studio_templates",
    status: "partial",
    migrationNotes: "V2 templates coexistent avec V1. Anciens fichiers DOCX/PDF encore utilisés pour certains types.",
    breakingChange: false,
  },
  {
    v1Feature: "Generated Documents",
    v1Table: "document_instances",
    v2Equivalent: "Generated Documents V2",
    v2Table: "generated_documents_v2",
    status: "migrated",
    migrationNotes: "Nouveau système de génération. Les anciens documents restent accessibles en lecture.",
    breakingChange: false,
  },
  {
    v1Feature: "Document Envois",
    v1Table: "document_envois",
    v2Equivalent: "Document Envois (partagé)",
    v2Table: "document_envois",
    status: "migrated",
    migrationNotes: "Table partagée V1/V2. Pas de changement de structure.",
    breakingChange: false,
  },
  {
    v1Feature: "Pedagogical Documents",
    v1Table: "pedagogical_documents",
    v2Equivalent: "Generated Documents V2",
    v2Table: "generated_documents_v2",
    status: "deprecated",
    migrationNotes: "Remplacé par generated_documents_v2. Conserver pour historique.",
    breakingChange: false,
  },
  {
    v1Feature: "Signature Requests",
    v1Table: "signature_requests",
    v2Equivalent: "Signature Requests (partagé)",
    v2Table: "signature_requests",
    status: "migrated",
    migrationNotes: "Table partagée. Compatible V1/V2.",
    breakingChange: false,
  },
  {
    v1Feature: "Attestation Certificates",
    v1Table: "attestation_certificates",
    v2Equivalent: "Attestation Certificates (partagé)",
    v2Table: "attestation_certificates",
    status: "migrated",
    migrationNotes: "Table partagée. Peut être liée à V1 ou V2 documents.",
    breakingChange: false,
  },
  {
    v1Feature: "Email Templates",
    v1Table: "email_templates",
    v2Equivalent: "Template Studio (type=email)",
    v2Table: "template_studio_templates",
    status: "partial",
    migrationNotes: "Certains emails utilisent encore email_templates. Migration progressive recommandée.",
    breakingChange: false,
  },
];

/**
 * Check if a document type still has V1 dependencies
 */
export function hasV1Dependencies(documentType: string): boolean {
  const v1DependentTypes = [
    "reglement_interieur", // Still uses document_template_files
    "programme_formation", // Some use old DOCX templates
  ];
  return v1DependentTypes.includes(documentType);
}

/**
 * Get migration status for a document type
 */
export function getMigrationStatus(documentType: string): "v2_only" | "hybrid" | "v1_only" {
  const v1OnlyTypes = ["reglement_interieur"];
  const hybridTypes = ["programme_formation", "convocation", "attestation"];
  
  if (v1OnlyTypes.includes(documentType)) return "v1_only";
  if (hybridTypes.includes(documentType)) return "hybrid";
  return "v2_only";
}

/**
 * Determine source system for display purposes
 */
export function resolveSourceSystem(
  hasV2Doc: boolean,
  hasV1Doc: boolean,
  documentType: string
): DocumentSourceSystem {
  if (hasV2Doc) return "v2";
  if (hasV1Doc) return "v1";
  
  // For new generation, prefer V2
  const migrationStatus = getMigrationStatus(documentType);
  return migrationStatus === "v1_only" ? "v1" : "v2";
}

/**
 * Get list of document types that should be prioritized for V2 migration
 */
export function getMigrationPriorities(): string[] {
  return [
    "convention", // High business impact
    "contrat", // High business impact
    "attestation", // Frequent use
    "facture", // Financial
    "certificat_realisation", // Compliance
  ];
}

/**
 * Check if a table is still needed for V1 compatibility
 */
export function isV1TableRequired(tableName: string): boolean {
  const requiredTables = [
    "document_template_files", // Still used for some DOCX templates
    "pedagogical_documents", // Historical data
    "email_templates", // Some automated emails
  ];
  return requiredTables.includes(tableName);
}

/**
 * Get deprecation warnings for admin display
 */
export function getDeprecationWarnings(): Array<{
  feature: string;
  message: string;
  severity: "info" | "warning" | "critical";
}> {
  return [
    {
      feature: "document_template_files",
      message: "Les templates DOCX V1 seront progressivement remplacés par Template Studio V2.",
      severity: "info",
    },
    {
      feature: "pedagogical_documents",
      message: "Cette table est dépréciée. Les nouveaux documents utilisent generated_documents_v2.",
      severity: "warning",
    },
    {
      feature: "email_templates (standalone)",
      message: "Migrer vers Template Studio pour une gestion unifiée des modèles.",
      severity: "info",
    },
  ];
}

/**
 * Summary statistics for admin dashboard
 */
export function getMigrationSummary(): {
  migrated: number;
  partial: number;
  pending: number;
  deprecated: number;
  total: number;
  percentComplete: number;
} {
  const counts = {
    migrated: 0,
    partial: 0,
    pending: 0,
    deprecated: 0,
  };

  for (const entry of V1_MIGRATION_REGISTRY) {
    counts[entry.status]++;
  }

  const total = V1_MIGRATION_REGISTRY.length;
  const complete = counts.migrated + counts.deprecated;
  const percentComplete = Math.round((complete / total) * 100);

  return {
    ...counts,
    total,
    percentComplete,
  };
}
