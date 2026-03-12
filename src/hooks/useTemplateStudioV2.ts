// ═══════════════════════════════════════════════════════════════
// Hook: useTemplateStudioV2 — CRUD, versioning, packs, generated docs
// ═══════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { runComplianceCheck, COMPLIANCE_GATED_TYPES } from "@/lib/complianceEngine";

// ── Types ──

export type TrackScope = "initial" | "continuing" | "both";
export type TemplateCategory = "finance" | "formation" | "admin" | "qualite";
export type TemplateAppliesTo = "contact" | "session" | "inscription";
export type GeneratedDocStatus = "queued" | "generated" | "failed";
export type DocFilterStatus = "all" | "queued" | "failed" | "generated";

export interface TemplateV2 {
  id: string;
  centre_id: string | null;
  name: string;
  description: string | null;
  type: string;
  format: string;
  template_body: string;
  variables_schema: any[];
  compliance_tags: any[];
  version: number;
  status: string;
  is_active: boolean;
  scenario: string | null;
  track_scope: TrackScope;
  category: TemplateCategory;
  applies_to: TemplateAppliesTo;
  current_version_id: string | null;
  compliance_score: number | null;
  compliance_report_json: any | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface TemplateVersionV2 {
  id: string;
  template_id: string;
  version: number;
  template_body: string;
  css: string;
  changelog: string;
  is_published: boolean;
  variables_schema: any[];
  compliance_tags: any[];
  compliance_score: number | null;
  compliance_report_json: any | null;
  status: string;
  created_at: string;
  created_by: string | null;
}

export interface DocumentPack {
  id: string;
  centre_id: string;
  name: string;
  track_scope: TrackScope;
  applies_to: TemplateAppliesTo;
  is_default: boolean;
  created_at: string;
  items?: PackItem[];
}

export interface PackItem {
  id: string;
  pack_id: string;
  template_id: string;
  sort_order: number;
  is_required: boolean;
  auto_generate: boolean;
  template?: TemplateV2;
}

export interface GeneratedDocument {
  id: string;
  centre_id: string;
  template_id: string;
  template_version_id: string | null;
  pack_id: string | null;
  contact_id: string | null;
  session_id: string | null;
  inscription_id: string | null;
  file_path: string | null;
  file_type: string;
  file_name: string | null;
  status: GeneratedDocStatus;
  error_message: string | null;
  variables_snapshot: Record<string, string>;
  created_at: string;
  created_by: string | null;
  template?: TemplateV2;
}

// ── Constants ──

export const TEMPLATE_CATEGORIES: { value: TemplateCategory; label: string }[] = [
  { value: "formation", label: "Formation" },
  { value: "admin", label: "Administratif" },
  { value: "finance", label: "Financier" },
  { value: "qualite", label: "Qualité" },
];

export const TRACK_SCOPES: { value: TrackScope; label: string }[] = [
  { value: "both", label: "Tous parcours" },
  { value: "initial", label: "Parcours Initial (CMA)" },
  { value: "continuing", label: "Formation Continue (Carte Pro)" },
];

export const APPLIES_TO_OPTIONS: { value: TemplateAppliesTo; label: string }[] = [
  { value: "contact", label: "Contact / Apprenant" },
  { value: "session", label: "Session" },
  { value: "inscription", label: "Inscription" },
];

export const DOC_FILTER_OPTIONS: { value: DocFilterStatus; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "queued", label: "En attente" },
  { value: "failed", label: "Échecs" },
  { value: "generated", label: "Générés" },
];

/** Stale queued threshold in minutes */
const STALE_QUEUED_MINUTES = 15;

// ── Template Queries ──

export function useTemplatesV2(filters?: { type?: string; status?: string; track_scope?: TrackScope; category?: TemplateCategory }) {
  return useQuery({
    queryKey: ["templates-v2", filters],
    queryFn: async () => {
      let query = (supabase as any)
        .from("template_studio_templates")
        .select("*")
        .order("updated_at", { ascending: false });

      if (filters?.type && filters.type !== "all") query = query.eq("type", filters.type);
      if (filters?.status && filters.status !== "all") query = query.eq("status", filters.status);
      if (filters?.track_scope && filters.track_scope !== "both") {
        query = query.or(`track_scope.eq.${filters.track_scope},track_scope.eq.both`);
      }
      if (filters?.category) query = query.eq("category", filters.category);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as TemplateV2[];
    },
  });
}

export function useTemplateV2(id: string | null) {
  return useQuery({
    queryKey: ["template-v2", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await (supabase as any)
        .from("template_studio_templates")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as TemplateV2;
    },
    enabled: !!id,
  });
}

export function useTemplateVersionsV2(templateId: string | null) {
  return useQuery({
    queryKey: ["template-versions-v2", templateId],
    queryFn: async () => {
      if (!templateId) return [];
      const { data, error } = await (supabase as any)
        .from("template_versions")
        .select("*")
        .eq("template_id", templateId)
        .order("version", { ascending: false });
      if (error) throw error;
      return (data || []) as TemplateVersionV2[];
    },
    enabled: !!templateId,
  });
}

// ── Template Mutations ──

export function useCreateTemplateV2() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tmpl: Partial<TemplateV2>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await (supabase as any)
        .from("template_studio_templates")
        .insert({ ...tmpl, created_by: user?.id, status: "draft", version: 1 })
        .select()
        .single();
      if (error) throw error;

      await (supabase as any).from("template_audit_log").insert({
        template_id: data.id,
        action: "created",
        metadata: { name: data.name },
      });

      return data as TemplateV2;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["templates-v2"] }); toast.success("Template créé"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateTemplateV2() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TemplateV2> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from("template_studio_templates")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as TemplateV2;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["templates-v2"] });
      qc.invalidateQueries({ queryKey: ["template-v2", data.id] });
      toast.success("Template mis à jour");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteTemplateV2() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("template_studio_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["templates-v2"] }); toast.success("Template supprimé"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function usePublishTemplateV2() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ template, changelog }: { template: TemplateV2; changelog?: string }) => {
      // ── Compliance gate (ported from v1) ──
      if (COMPLIANCE_GATED_TYPES.includes(template.type)) {
        const report = runComplianceCheck(template.template_body, template.type);
        if (!report.ready_to_publish) {
          throw new Error(
            `Publication bloquée — mentions obligatoires manquantes :\n${report.blocking_issues.join("\n")}`
          );
        }
        // Persist fresh compliance data
        template = {
          ...template,
          compliance_score: report.score,
          compliance_report_json: report as any,
        };
      }

      const { data: { user } } = await supabase.auth.getUser();
      const newVersion = template.version + (template.status === "published" ? 1 : 0);

      const { data: ver, error: verErr } = await (supabase as any)
        .from("template_versions")
        .insert({
          template_id: template.id,
          version: newVersion,
          template_body: template.template_body,
          css: "",
          changelog: changelog || "",
          is_published: true,
          variables_schema: template.variables_schema,
          compliance_tags: template.compliance_tags,
          compliance_score: template.compliance_score,
          compliance_report_json: template.compliance_report_json,
          centre_id: template.centre_id,
          status: "published",
          created_by: user?.id,
        })
        .select()
        .single();
      if (verErr) throw verErr;

      await (supabase as any)
        .from("template_versions")
        .update({ is_published: false })
        .eq("template_id", template.id)
        .neq("id", ver.id);

      const { data, error } = await (supabase as any)
        .from("template_studio_templates")
        .update({
          status: "published",
          is_active: true,
          version: newVersion,
          current_version_id: ver.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", template.id)
        .select()
        .single();
      if (error) throw error;

      await (supabase as any).from("template_audit_log").insert({
        template_id: template.id,
        version_id: ver.id,
        action: "published",
        metadata: { version: newVersion, changelog },
      });

      return data as TemplateV2;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates-v2"] });
      qc.invalidateQueries({ queryKey: ["template-versions-v2"] });
      toast.success("Template publié");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useArchiveTemplateV2() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("template_studio_templates")
        .update({ status: "archived", is_active: false })
        .eq("id", id);
      if (error) throw error;
      await (supabase as any).from("template_audit_log").insert({ template_id: id, action: "archived" });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["templates-v2"] }); toast.success("Template archivé"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRollbackTemplateV2() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ templateId, versionId }: { templateId: string; versionId: string }) => {
      const { data: ver } = await (supabase as any).from("template_versions").select("*").eq("id", versionId).single();
      if (!ver) throw new Error("Version not found");

      const { error } = await (supabase as any)
        .from("template_studio_templates")
        .update({
          template_body: ver.template_body,
          variables_schema: ver.variables_schema,
          status: "draft",
          is_active: false,
          version: ver.version,
        })
        .eq("id", templateId);
      if (error) throw error;

      await (supabase as any).from("template_audit_log").insert({
        template_id: templateId,
        version_id: versionId,
        action: "rollback",
        metadata: { target_version: ver.version },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates-v2"] });
      qc.invalidateQueries({ queryKey: ["template-versions-v2"] });
      toast.success("Rollback effectué");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Document Packs ──

export function useDocumentPacks(trackScope?: TrackScope) {
  return useQuery({
    queryKey: ["document-packs", trackScope],
    queryFn: async () => {
      let query = (supabase as any)
        .from("document_packs")
        .select("*, document_pack_items(*, template:template_studio_templates(id, name, type, status, track_scope, category, template_body))")
        .order("created_at", { ascending: false });

      if (trackScope && trackScope !== "both") {
        query = query.or(`track_scope.eq.${trackScope},track_scope.eq.both`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((p: any) => ({
        ...p,
        items: (p.document_pack_items || []).sort((a: any, b: any) => a.sort_order - b.sort_order).map((i: any) => ({
          ...i,
          template: i.template,
        })),
      })) as DocumentPack[];
    },
  });
}

export function useCreatePack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pack: { name: string; track_scope: TrackScope; applies_to: TemplateAppliesTo; is_default?: boolean }) => {
      const { data, error } = await (supabase as any).from("document_packs").insert(pack).select().single();
      if (error) throw error;
      return data as DocumentPack;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["document-packs"] }); toast.success("Pack créé"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAddPackItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: { pack_id: string; template_id: string; sort_order?: number; is_required?: boolean }) => {
      const { data, error } = await (supabase as any).from("document_pack_items").insert(item).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["document-packs"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRemovePackItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("document_pack_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["document-packs"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Generated Documents ──

export function useGeneratedDocuments(opts?: { contactId?: string; sessionId?: string }) {
  return useQuery({
    queryKey: ["generated-docs-v2", opts],
    queryFn: async () => {
      let query = (supabase as any)
        .from("generated_documents_v2")
        .select("*, template:template_studio_templates(id, name, type, category)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (opts?.contactId) query = query.eq("contact_id", opts.contactId);
      if (opts?.sessionId) query = query.eq("session_id", opts.sessionId);

      const { data, error } = await query;
      if (error) throw error;

      // Mark stale queued as failed
      const docs = (data || []) as GeneratedDocument[];
      const staleThreshold = Date.now() - STALE_QUEUED_MINUTES * 60 * 1000;
      const staleIds: string[] = [];

      for (const doc of docs) {
        if (doc.status === "queued" && new Date(doc.created_at).getTime() < staleThreshold) {
          doc.status = "failed";
          doc.error_message = `Timeout: bloqué en file d'attente > ${STALE_QUEUED_MINUTES} min`;
          staleIds.push(doc.id);
        }
      }

      // Update stale docs in background (fire-and-forget)
      if (staleIds.length > 0) {
        (supabase as any)
          .from("generated_documents_v2")
          .update({ status: "failed", error_message: `Timeout: bloqué en file d'attente > ${STALE_QUEUED_MINUTES} min` })
          .in("id", staleIds)
          .then(() => {});
      }

      return docs;
    },
    enabled: !!(opts?.contactId || opts?.sessionId),
  });
}

export function useGenerateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      templateId: string;
      contactId?: string;
      sessionId?: string;
      inscriptionId?: string;
      variables: Record<string, string>;
      /** If set, missing fields were acknowledged */
      missingFields?: string[];
    }) => {
      // Get the template
      const { data: tmpl } = await (supabase as any)
        .from("template_studio_templates")
        .select("*, current_version_id")
        .eq("id", params.templateId)
        .single();
      if (!tmpl) throw new Error("Template not found");

      // Render HTML
      const rendered = tmpl.template_body.replace(/\{\{(\w+)\}\}/g, (_: string, v: string) => params.variables[v] || "");

      // Resolve centre_id from contact or session
      let centreIdForInsert: string | null = null;
      if (params.contactId) {
        const { data: contact } = await supabase.from("contacts").select("centre_id").eq("id", params.contactId).single();
        centreIdForInsert = contact?.centre_id || null;
      }
      if (!centreIdForInsert && params.sessionId) {
        const { data: session } = await supabase.from("sessions").select("centre_id").eq("id", params.sessionId).single();
        centreIdForInsert = session?.centre_id || null;
      }

      // Create record
      const { data: doc, error: docErr } = await (supabase as any)
        .from("generated_documents_v2")
        .insert({
          template_id: params.templateId,
          template_version_id: tmpl.current_version_id,
          contact_id: params.contactId || null,
          session_id: params.sessionId || null,
          inscription_id: params.inscriptionId || null,
          centre_id: centreIdForInsert,
          file_name: `${tmpl.name.replace(/\s+/g, "_")}.pdf`,
          status: "queued",
          variables_snapshot: params.variables,
        })
        .select()
        .single();
      if (docErr) throw docErr;

      // Generate PDF client-side using jsPDF + HTML
      const { default: jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = rendered;
      tempDiv.style.cssText = "font-family:Arial,sans-serif;font-size:11pt;line-height:1.5;max-width:170mm;padding:0;color:#000;";
      document.body.appendChild(tempDiv);

      try {
        const { default: html2canvas } = await import("html2canvas");
        const canvas = await html2canvas(tempDiv, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL("image/png");
        const imgWidth = 170;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        let position = 15;
        let remainingHeight = imgHeight;
        const pageHeight = 277;

        pdf.addImage(imgData, "PNG", 20, position, imgWidth, imgHeight);
        remainingHeight -= pageHeight;

        while (remainingHeight > 0) {
          pdf.addPage();
          position = position - pageHeight;
          pdf.addImage(imgData, "PNG", 20, position, imgWidth, imgHeight);
          remainingHeight -= pageHeight;
        }
      } finally {
        document.body.removeChild(tempDiv);
      }

      const pdfBlob = pdf.output("blob");

      const centreId = doc.centre_id;
      const filePath = `${centreId}/contacts/${params.contactId || "general"}/${doc.id}.pdf`;

      const { error: upErr } = await supabase.storage
        .from("generated-docs")
        .upload(filePath, pdfBlob, { contentType: "application/pdf" });

      if (upErr) {
        await (supabase as any).from("generated_documents_v2").update({ status: "failed", error_message: upErr.message }).eq("id", doc.id);
        throw upErr;
      }

      const { data: updated, error: updErr } = await (supabase as any)
        .from("generated_documents_v2")
        .update({ status: "generated", file_path: filePath })
        .eq("id", doc.id)
        .select()
        .single();
      if (updErr) throw updErr;

      // Audit (include missing_fields if any)
      await (supabase as any).from("template_audit_log").insert({
        template_id: params.templateId,
        generated_document_id: doc.id,
        action: "generated",
        contact_id: params.contactId || null,
        session_id: params.sessionId || null,
        metadata: {
          file_name: doc.file_name,
          ...(params.missingFields?.length ? { missing_fields: params.missingFields } : {}),
        },
      });

      return updated as GeneratedDocument;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["generated-docs-v2"] });
    },
    onError: (e: Error) => toast.error(`Erreur: ${e.message}`),
  });
}

// ── Retry all failed documents ──

export function useRetryFailedDocuments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (opts: { contactId?: string; sessionId?: string }) => {
      let query = (supabase as any)
        .from("generated_documents_v2")
        .select("*, template:template_studio_templates(id, name, template_body, current_version_id)")
        .eq("status", "failed")
        .is("deleted_at", null);

      if (opts.contactId) query = query.eq("contact_id", opts.contactId);
      if (opts.sessionId) query = query.eq("session_id", opts.sessionId);

      const { data: failedDocs, error } = await query;
      if (error) throw error;
      if (!failedDocs?.length) return { total: 0, succeeded: 0, failed: 0 };

      const variables = await buildVariablesForGeneration({
        contactId: opts.contactId,
        sessionId: opts.sessionId,
      });

      let succeeded = 0;
      let failed = 0;

      for (const doc of failedDocs) {
        try {
          const tmpl = doc.template;
          if (!tmpl) { failed++; continue; }

          const rendered = tmpl.template_body.replace(/\{\{(\w+)\}\}/g, (_: string, v: string) => variables[v] || "");

          // Reset to queued
          await (supabase as any).from("generated_documents_v2")
            .update({ status: "queued", error_message: null })
            .eq("id", doc.id);

          const { default: jsPDF } = await import("jspdf");
          const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = rendered;
          tempDiv.style.cssText = "font-family:Arial,sans-serif;font-size:11pt;line-height:1.5;max-width:170mm;padding:0;color:#000;";
          document.body.appendChild(tempDiv);

          try {
            const { default: html2canvas } = await import("html2canvas");
            const canvas = await html2canvas(tempDiv, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL("image/png");
            const imgWidth = 170;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let position = 15;
            let remainingHeight = imgHeight;
            const pageHeight = 277;
            pdf.addImage(imgData, "PNG", 20, position, imgWidth, imgHeight);
            remainingHeight -= pageHeight;
            while (remainingHeight > 0) {
              pdf.addPage();
              position = position - pageHeight;
              pdf.addImage(imgData, "PNG", 20, position, imgWidth, imgHeight);
              remainingHeight -= pageHeight;
            }
          } finally {
            document.body.removeChild(tempDiv);
          }

          const pdfBlob = pdf.output("blob");
          const filePath = `${doc.centre_id}/contacts/${doc.contact_id || "general"}/${doc.id}.pdf`;

          const { error: upErr } = await supabase.storage
            .from("generated-docs")
            .upload(filePath, pdfBlob, { contentType: "application/pdf", upsert: true });

          if (upErr) {
            await (supabase as any).from("generated_documents_v2")
              .update({ status: "failed", error_message: upErr.message })
              .eq("id", doc.id);
            failed++;
            continue;
          }

          await (supabase as any).from("generated_documents_v2")
            .update({ status: "generated", file_path: filePath })
            .eq("id", doc.id);

          succeeded++;
        } catch {
          failed++;
        }
      }

      return { total: failedDocs.length, succeeded, failed };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["generated-docs-v2"] });
      if (result.total > 0) {
        toast.success(`${result.succeeded}/${result.total} relancé(s)`, {
          description: result.failed > 0 ? `${result.failed} échec(s) restant(s)` : undefined,
        });
      } else {
        toast.info("Aucun document en échec à relancer");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Batch generate all pack documents ──

export function useGeneratePackDocuments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      pack: DocumentPack;
      contactId?: string;
      sessionId?: string;
      inscriptionId?: string;
      autoOnly?: boolean;
    }): Promise<{ total: number; succeeded: number; failed: number }> => {
      const items = (params.pack.items || []).filter((i) => {
        if (!i.template || i.template.status !== "published") return false;
        if (params.autoOnly && !i.auto_generate) return false;
        return true;
      });

      if (items.length === 0) return { total: 0, succeeded: 0, failed: 0 };

      const variables = await buildVariablesForGeneration({
        contactId: params.contactId,
        sessionId: params.sessionId,
      });

      // Resolve centre_id from contact or session for batch
      let centreIdForBatch: string | null = null;
      if (params.contactId) {
        const { data: contact } = await supabase.from("contacts").select("centre_id").eq("id", params.contactId).single();
        centreIdForBatch = contact?.centre_id || null;
      }
      if (!centreIdForBatch && params.sessionId) {
        const { data: session } = await supabase.from("sessions").select("centre_id").eq("id", params.sessionId).single();
        centreIdForBatch = session?.centre_id || null;
      }

      let succeeded = 0;
      let failed = 0;

      for (const item of items) {
        try {
          const { data: existing } = await (supabase as any)
            .from("generated_documents_v2")
            .select("id, status")
            .eq("template_id", item.template_id)
            .eq("contact_id", params.contactId || "")
            .eq("status", "generated")
            .is("deleted_at", null)
            .limit(1);

          if (existing && existing.length > 0) {
            succeeded++;
            continue;
          }

          const { data: tmpl } = await (supabase as any)
            .from("template_studio_templates")
            .select("*, current_version_id")
            .eq("id", item.template_id)
            .single();
          if (!tmpl) { failed++; continue; }

          const rendered = tmpl.template_body.replace(/\{\{(\w+)\}\}/g, (_: string, v: string) => variables[v] || "");

          const { data: doc, error: docErr } = await (supabase as any)
            .from("generated_documents_v2")
            .insert({
              template_id: item.template_id,
              template_version_id: tmpl.current_version_id,
              contact_id: params.contactId || null,
              session_id: params.sessionId || null,
              inscription_id: params.inscriptionId || null,
              centre_id: centreIdForBatch,
              file_name: `${tmpl.name.replace(/\s+/g, "_")}.pdf`,
              status: "queued",
              variables_snapshot: variables,
            })
            .select()
            .single();
          if (docErr) { failed++; continue; }

          const { default: jsPDF } = await import("jspdf");
          const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = rendered;
          tempDiv.style.cssText = "font-family:Arial,sans-serif;font-size:11pt;line-height:1.5;max-width:170mm;padding:0;color:#000;";
          document.body.appendChild(tempDiv);

          try {
            const { default: html2canvas } = await import("html2canvas");
            const canvas = await html2canvas(tempDiv, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL("image/png");
            const imgWidth = 170;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let position = 15;
            let remainingHeight = imgHeight;
            const pageHeight = 277;
            pdf.addImage(imgData, "PNG", 20, position, imgWidth, imgHeight);
            remainingHeight -= pageHeight;
            while (remainingHeight > 0) {
              pdf.addPage();
              position = position - pageHeight;
              pdf.addImage(imgData, "PNG", 20, position, imgWidth, imgHeight);
              remainingHeight -= pageHeight;
            }
          } finally {
            document.body.removeChild(tempDiv);
          }

          const pdfBlob = pdf.output("blob");
          const centreId = doc.centre_id;
          const filePath = `centre/${centreId}/contacts/${params.contactId || "general"}/${doc.id}.pdf`;

          const { error: upErr } = await supabase.storage
            .from("generated-docs")
            .upload(filePath, pdfBlob, { contentType: "application/pdf" });

          if (upErr) {
            await (supabase as any).from("generated_documents_v2").update({ status: "failed", error_message: upErr.message }).eq("id", doc.id);
            failed++;
            continue;
          }

          await (supabase as any).from("generated_documents_v2").update({ status: "generated", file_path: filePath }).eq("id", doc.id);

          await (supabase as any).from("template_audit_log").insert({
            template_id: item.template_id,
            generated_document_id: doc.id,
            action: "generated",
            contact_id: params.contactId || null,
            session_id: params.sessionId || null,
            metadata: { file_name: doc.file_name, batch: true, auto: !!params.autoOnly },
          });

          succeeded++;
        } catch {
          failed++;
        }
      }

      return { total: items.length, succeeded, failed };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["generated-docs-v2"] });
      if (result.total > 0) {
        toast.success(`${result.succeeded}/${result.total} document(s) généré(s)`, {
          description: result.failed > 0 ? `${result.failed} échec(s)` : undefined,
        });
      }
    },
    onError: (e: Error) => toast.error(`Erreur batch: ${e.message}`),
  });
}

export function useDownloadGeneratedDoc() {
  return useMutation({
    mutationFn: async (doc: GeneratedDocument) => {
      if (!doc.file_path) throw new Error("Aucun fichier disponible pour ce document");

      // Use centralized resolver to detect correct bucket
      const { downloadPdf } = await import("@/lib/documents/pdfResolver");
      const { blob } = await downloadPdf(doc.file_path);

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.file_name || "document.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      await (supabase as any).from("template_audit_log").insert({
        template_id: doc.template_id,
        generated_document_id: doc.id,
        action: "downloaded",
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Template Audit Log ──

export function useTemplateAuditLog(templateId?: string) {
  return useQuery({
    queryKey: ["template-audit-log", templateId],
    queryFn: async () => {
      let query = (supabase as any)
        .from("template_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (templateId) query = query.eq("template_id", templateId);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

// ── Variable builder ──

export async function buildVariablesForGeneration(opts: {
  contactId?: string;
  sessionId?: string;
}): Promise<Record<string, string>> {
  const map: Record<string, string> = {
    date_jour: new Date().toLocaleDateString("fr-FR"),
  };

  if (opts.contactId) {
    const { data: contact } = await supabase.from("contacts").select("*").eq("id", opts.contactId).maybeSingle();
    if (contact) {
      map.nom = contact.nom || "";
      map.prenom = contact.prenom || "";
      map.email = contact.email || "";
      map.telephone = contact.telephone || "";
      map.civilite = contact.civilite || "";
      map.date_naissance = contact.date_naissance ? new Date(contact.date_naissance).toLocaleDateString("fr-FR") : "";
      map.adresse = [contact.rue, contact.code_postal, contact.ville].filter(Boolean).join(", ");
      map.ville = contact.ville || "";
      map.code_postal = contact.code_postal || "";
      map.rue = contact.rue || "";
      map.ville_naissance = contact.ville_naissance || "";
      map.pays_naissance = contact.pays_naissance || "";
    }
  }

  if (opts.sessionId) {
    const { data: session } = await (supabase as any)
      .from("sessions")
      .select("*, formateurs:formateur_id(nom, prenom)")
      .eq("id", opts.sessionId)
      .maybeSingle();
    if (session) {
      map.session_nom = session.nom || "";
      map.session_date_debut = session.date_debut ? new Date(session.date_debut).toLocaleDateString("fr-FR") : "";
      map.session_date_fin = session.date_fin ? new Date(session.date_fin).toLocaleDateString("fr-FR") : "";
      map.duree_heures = String(session.duree_heures || "");
      map.formation_type = session.formation_type || "";
      map.lieu = session.lieu || "";
      const formateur = session.formateurs;
      if (formateur) map.formateur_nom = `${formateur.prenom || ""} ${formateur.nom || ""}`.trim();
    }
  }

  const { data: centre } = await supabase.from("centre_formation").select("*").limit(1).maybeSingle();
  if (centre) {
    map.centre_nom = centre.nom_commercial || centre.nom_legal || "";
    map.centre_nom_legal = centre.nom_legal || "";
    map.centre_nom_commercial = centre.nom_commercial || "";
    map.centre_siret = centre.siret || "";
    map.centre_nda = centre.nda || "";
    map.centre_adresse = centre.adresse_complete || "";
    map.centre_email = centre.email || "";
    map.centre_telephone = centre.telephone || "";
    map.centre_forme_juridique = centre.forme_juridique || "";
    map.centre_iban = centre.iban || "";
    map.centre_bic = centre.bic || "";
    map.responsable_nom = centre.responsable_legal_nom || "";
    map.responsable_fonction = centre.responsable_legal_fonction || "";
    if (!map.lieu) map.lieu = centre.adresse_complete?.split(",").pop()?.trim() || "";
  }

  return map;
}
