// ═══════════════════════════════════════════════════════════════
// useDocumentSystemState — Read-only audit of document tables
// ═══════════════════════════════════════════════════════════════
// Phase 1 sécurisation documentaire : visibilité admin uniquement.
// Aucune écriture, aucune migration.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DocSourceStatus = "active" | "shared" | "legacy" | "deprecated" | "archive_candidate";

export interface DocTableState {
  table: string;
  label: string;
  status: DocSourceStatus;
  role: string;
  count: number | null;
  lastWriteAt: string | null;
  error?: string;
}

interface TableSpec {
  table: string;
  label: string;
  status: DocSourceStatus;
  role: string;
  /** Column used to detect last write (created_at or updated_at). */
  timestampColumn?: string;
}

const TABLE_SPECS: TableSpec[] = [
  { table: "document_envois",            label: "Envois de documents",         status: "shared",            role: "Source de vérité — envois (V1/V2)",          timestampColumn: "created_at" },
  { table: "signature_requests",         label: "Demandes de signature",       status: "shared",            role: "Source de vérité — signatures",              timestampColumn: "created_at" },
  { table: "contact_documents",          label: "Documents apprenant",         status: "active",            role: "Source de vérité — documents apprenants",    timestampColumn: "created_at" },
  { table: "attestation_certificates",   label: "Attestations Qualiopi",       status: "shared",            role: "Source de vérité — attestations",            timestampColumn: "created_at" },
  { table: "generated_documents_v2",     label: "Documents générés V2",        status: "active",            role: "Cible — Template Studio V2",                 timestampColumn: "created_at" },
  { table: "generated_documents_legacy", label: "Documents générés (legacy)",  status: "legacy",            role: "Legacy V1 — lecture seule",                   timestampColumn: "created_at" },
  { table: "template_studio_templates",  label: "Modèles V2",                  status: "active",            role: "Source de vérité — modèles",                 timestampColumn: "updated_at" },
  { table: "template_versions",          label: "Versions modèles V2",         status: "active",            role: "Versionning immuable",                       timestampColumn: "created_at" },
  { table: "document_templates",         label: "Modèles V1",                  status: "legacy",            role: "Legacy — hybride",                            timestampColumn: "updated_at" },
  { table: "document_template_files",    label: "Fichiers modèles V1",         status: "legacy",            role: "Legacy — DOCX/PDF",                           timestampColumn: "created_at" },
  { table: "document_packs",             label: "Packs documents",             status: "active",            role: "Regroupement utilitaire",                    timestampColumn: "updated_at" },
  { table: "document_pack_items",        label: "Éléments de packs",           status: "active",            role: "Lignes des packs",                            timestampColumn: "created_at" },
  { table: "document_instances",         label: "Instances documents",         status: "archive_candidate", role: "Candidat archivage (vide)",                   timestampColumn: "created_at" },
  { table: "pedagogical_documents",      label: "Documents pédagogiques",      status: "archive_candidate", role: "Candidat archivage (vide)",                   timestampColumn: "created_at" },
  { table: "formateur_documents",        label: "Documents formateur",         status: "archive_candidate", role: "Candidat archivage (vide)",                   timestampColumn: "created_at" },
];

async function fetchTableState(spec: TableSpec): Promise<DocTableState> {
  try {
    // count (head)
    const countRes = await (supabase.from(spec.table as any) as any)
      .select("*", { count: "exact", head: true });

    if (countRes.error) {
      return {
        table: spec.table,
        label: spec.label,
        status: spec.status,
        role: spec.role,
        count: null,
        lastWriteAt: null,
        error: countRes.error.message,
      };
    }

    let lastWriteAt: string | null = null;
    if (spec.timestampColumn) {
      const lastRes = await (supabase.from(spec.table as any) as any)
        .select(spec.timestampColumn)
        .order(spec.timestampColumn, { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!lastRes.error && lastRes.data) {
        lastWriteAt = (lastRes.data as any)[spec.timestampColumn] ?? null;
      }
    }

    return {
      table: spec.table,
      label: spec.label,
      status: spec.status,
      role: spec.role,
      count: countRes.count ?? 0,
      lastWriteAt,
    };
  } catch (err: any) {
    return {
      table: spec.table,
      label: spec.label,
      status: spec.status,
      role: spec.role,
      count: null,
      lastWriteAt: null,
      error: err?.message ?? "Erreur inconnue",
    };
  }
}

export function useDocumentSystemState() {
  return useQuery({
    queryKey: ["document-system-state"],
    queryFn: async () => {
      const results = await Promise.all(TABLE_SPECS.map(fetchTableState));
      return results;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
