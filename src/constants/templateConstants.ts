// ═══════════════════════════════════════════════════════════════
// Template Constants — Shared between Template Studio v1 & v2
// ═══════════════════════════════════════════════════════════════

import type { ComplianceReport } from "@/lib/complianceEngine";
import type { TemplateV2 } from "@/hooks/useTemplateStudioV2";

// ── Template Types ──

export const TEMPLATE_TYPES = [
  { value: "programme", label: "Programme de formation" },
  { value: "contrat", label: "Contrat de formation (personne physique)" },
  { value: "convention", label: "Convention de formation (entreprise)" },
  { value: "attestation", label: "Attestation" },
  { value: "bulletin_inscription", label: "Bulletin d'inscription" },
  { value: "positionnement", label: "Test de positionnement" },
  { value: "test_positionnement", label: "Test de positionnement (alt)" },
  { value: "evaluation", label: "Évaluation" },
  { value: "evaluation_chaud", label: "Évaluation à chaud" },
  { value: "evaluation_froid", label: "Évaluation à froid (J+30)" },
  { value: "emargement", label: "Feuille d'émargement" },
  { value: "feuille_emargement", label: "Feuille d'émargement (alt)" },
  { value: "convocation", label: "Convocation" },
  { value: "reglement_interieur", label: "Règlement intérieur" },
  { value: "procedure_reclamation", label: "Procédure de réclamation" },
  { value: "devis", label: "Devis" },
  { value: "invoice", label: "Facture" },
  { value: "email", label: "Email" },
  { value: "chef_oeuvre", label: "Chef d'œuvre" },
  { value: "autre", label: "Autre" },
] as const;

// ── Template Formats ──

export const TEMPLATE_FORMATS = [
  { value: "html", label: "HTML" },
  { value: "markdown", label: "Markdown" },
  { value: "email", label: "Email" },
  { value: "pdf", label: "PDF" },
  { value: "docx", label: "DOCX" },
] as const;

// ── Template Statuses ──

export const TEMPLATE_STATUSES = [
  { value: "draft", label: "Brouillon", color: "bg-muted text-muted-foreground" },
  { value: "review", label: "En révision", color: "bg-yellow-500/10 text-yellow-600" },
  { value: "approved", label: "Approuvé", color: "bg-blue-500/10 text-blue-600" },
  { value: "published", label: "Publié", color: "bg-green-500/10 text-green-600" },
  { value: "inactive", label: "Inactif", color: "bg-muted text-muted-foreground" },
  { value: "archived", label: "Archivé", color: "bg-muted/50 text-muted-foreground" },
] as const;

// ── Type Alias: StudioTemplate (v1 compat) → TemplateV2 ──
// StudioTemplate is structurally compatible with TemplateV2.
// v2 adds: track_scope, category, applies_to, current_version_id
// All v1 consumers only use the common fields.

export type StudioTemplate = TemplateV2;

// ── Re-export v1 sub-types for backward compat ──

export interface TemplateVersion {
  id: string;
  template_id: string;
  version: number;
  template_body: string;
  variables_schema: any[];
  compliance_tags: any[];
  compliance_score: number | null;
  compliance_report_json: ComplianceReport | null;
  status: string;
  created_at: string;
  created_by: string | null;
}

export interface ApprovalLog {
  id: string;
  centre_id: string | null;
  template_id: string;
  version: number;
  action: string;
  comment: string | null;
  created_at: string;
  created_by: string | null;
}
