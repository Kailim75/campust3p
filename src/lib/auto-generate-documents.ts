// ═══════════════════════════════════════════════════════════════
// Auto-generation of pack documents on inscription/conversion
// ═══════════════════════════════════════════════════════════════

import { supabase } from "@/integrations/supabase/client";
import { buildVariablesForGeneration } from "@/hooks/useTemplateStudioV2";
import type { TrackScope } from "@/hooks/useTemplateStudioV2";
import type { Database, Json } from "@/integrations/supabase/types";
import { classifyError } from "@/lib/documents/documentErrors";

// ─── Derive formation category from formation_type string ───────────────────
// Returns a specific category (VTC, TAXI, VMDTR) ONLY for initial or passerelle
// formations. "Formation continue X" uses generic packs (returns null).
function deriveFormationCategory(formationType: string | null | undefined): string | null {
  if (!formationType) return null;
  const upper = formationType.toUpperCase();

  // Formation continue / recyclage → FC-specific packs per métier
  if (/FORMATION CONTINUE|RECYCLAGE/i.test(upper)) {
    if (upper.includes("VTC")) return "FC_VTC";
    if (upper.includes("TAXI")) return "FC_TAXI";
    if (upper.includes("VMDTR")) return "FC_VMDTR";
    return null; // generic FC fallback
  }

  // Mobilité → no pack routing (handled by DOCX templates separately)
  if (/MOBILIT/i.test(upper)) return null;

  // Passerelle → detect target métier from the string
  if (upper.includes("PASSERELLE")) {
    if (upper.includes("VMDTR")) return "VMDTR";
    if (upper.includes("VERS TAXI") || (upper.includes("TAXI") && !upper.includes("VERS VTC"))) return "TAXI";
    return "VTC";
  }

  // Pure VTC/TAXI/VMDTR (initial or other specific)
  if (upper === "VTC" || upper.startsWith("VTC ")) return "VTC";
  if (upper === "TAXI" || upper.startsWith("TAXI ")) return "TAXI";
  if (upper.includes("VMDTR")) return "VMDTR";
  return null; // generic
}

// ─── Local Types for Document Generation ────────────────────────────────────
type TemplateStudioTemplate = Database["public"]["Tables"]["template_studio_templates"]["Row"];

interface PackItemWithTemplate {
  id: string;
  auto_generate: boolean | null;
  template: Pick<TemplateStudioTemplate, "id" | "name" | "type" | "status" | "template_body" | "current_version_id"> | null;
}

interface DocumentPack {
  id: string;
  name: string;
  document_pack_items: PackItemWithTemplate[];
}

type AutoGenerationStage =
  | "pack_resolution"
  | "variables"
  | "record_insert"
  | "pdf_render"
  | "storage_upload"
  | "status_update";

interface AutoGenerationDetail {
  templateId: string | null;
  templateName: string;
  status: "generated" | "skipped" | "failed";
  stage: AutoGenerationStage | "duplicate_check";
  message: string;
  documentId?: string | null;
}

interface GeneratedDocumentV2Row {
  id: string;
  centre_id: string;
}

type GeneratedDocumentV2Insert = Database["public"]["Tables"]["generated_documents_v2"]["Insert"];
type TemplateAuditLogInsert = Database["public"]["Tables"]["template_audit_log"]["Insert"];

// ─── Typed query helpers ────────────────────────────────────────────────────
// Supabase's auto-generated types do not fully represent nested relational
// selects (e.g. `document_pack_items(... template:template_studio_templates(...))`).
// The `as unknown as` casts below bridge this gap without altering the query.

async function fetchDefaultPacks(track: TrackScope, formationCategory?: string | null): Promise<DocumentPack[]> {
  const query = supabase
    .from("document_packs")
    .select("id, name, formation_category, document_pack_items(id, auto_generate, template:template_studio_templates(id, name, type, status, template_body, current_version_id))")
    .eq("is_default", true)
    .or(`track_scope.eq.${track},track_scope.eq.both`);

  const { data } = await query;
  const allPacks = (data ?? []) as unknown as (DocumentPack & { formation_category: string | null })[];

  // Prioritise category-specific packs (e.g. VTC), fall back to generic (NULL)
  if (formationCategory) {
    const categoryPacks = allPacks.filter(
      (p) => p.formation_category?.toUpperCase() === formationCategory.toUpperCase()
    );
    if (categoryPacks.length > 0) return categoryPacks;
  }

  // Fallback: packs without a formation_category (generic packs)
  return allPacks.filter((p) => !p.formation_category);
}

async function checkExistingDocument(templateId: string, contactId: string): Promise<boolean> {
  const { data } = await supabase
    .from("generated_documents_v2")
    .select("id")
    .eq("template_id", templateId)
    .eq("contact_id", contactId)
    .eq("status", "generated")
    .is("deleted_at", null)
    .limit(1);
  return !!data && data.length > 0;
}

async function insertGeneratedDocument(
  payload: GeneratedDocumentV2Insert
): Promise<GeneratedDocumentV2Row> {
  const { data, error } = await supabase
    .from("generated_documents_v2")
    .insert(payload)
    .select("id, centre_id")
    .single();
  if (error) throw error;
  // CAST JUSTIFIED: partial .select("id, centre_id") not reflected in generated Row type
  return data as unknown as GeneratedDocumentV2Row;
}

async function updateGeneratedDocumentStatus(
  docId: string,
  status: "generated" | "failed",
  extra: { file_path?: string; error_message?: string }
): Promise<void> {
  await supabase
    .from("generated_documents_v2")
    .update({ status, ...extra })
    .eq("id", docId);
}

async function insertAuditLog(payload: TemplateAuditLogInsert): Promise<void> {
  await supabase.from("template_audit_log").insert(payload);
}

function normalizeAutoGenerationError(error: unknown): { message: string; code: string } {
  const classified = classifyError(error);

  if (classified.code === "UNKNOWN") {
    const rawMessage = error instanceof Error ? error.message : String(error);
    if (
      rawMessage.includes("row-level security") ||
      rawMessage.includes("42501")
    ) {
      return {
        code: "RLS_VIOLATION",
        message: "Permissions insuffisantes pour générer ou enregistrer le document.",
      };
    }

    if (
      rawMessage.includes("html2canvas") ||
      rawMessage.includes("canvas") ||
      rawMessage.includes("jsPDF") ||
      rawMessage.includes("addImage")
    ) {
      return {
        code: "PDF_RENDER_FAILED",
        message: "Le rendu PDF a échoué pendant la génération du document.",
      };
    }
  }

  return {
    code: classified.code,
    message: classified.message,
  };
}

async function logAutoGenerationFailure(params: {
  templateId: string | null;
  templateName: string;
  contactId: string;
  sessionId?: string;
  centreId?: string | null;
  generatedDocumentId?: string | null;
  stage: AutoGenerationStage;
  error: unknown;
}): Promise<string> {
  const normalized = normalizeAutoGenerationError(params.error);
  const rawMessage = params.error instanceof Error ? params.error.message : String(params.error);

  if (params.generatedDocumentId) {
    await updateGeneratedDocumentStatus(params.generatedDocumentId, "failed", {
      error_message: `${normalized.code}: ${rawMessage}`,
    });
  }

  await insertAuditLog({
    template_id: params.templateId,
    generated_document_id: params.generatedDocumentId ?? null,
    contact_id: params.contactId,
    session_id: params.sessionId ?? null,
    centre_id: params.centreId ?? null,
    action: "auto_generation_failed",
    metadata: {
      auto: true,
      template_name: params.templateName,
      stage: params.stage,
      error_code: normalized.code,
      error_message: normalized.message,
      error_details: rawMessage,
    },
  });

  return normalized.message;
}

// ─── Main auto-generation function ──────────────────────────────────────────

/**
 * Triggers auto-generation of documents marked auto_generate=true
 * in the default pack matching the contact's track.
 * Called after: inscription creation or prospect→apprenant conversion.
 */
export async function triggerAutoGeneration(params: {
  contactId: string;
  sessionId?: string;
  inscriptionId?: string;
  track: TrackScope;
  formationType?: string | null;
}): Promise<{ generated: number; errors: number; details: AutoGenerationDetail[] }> {
  let generated = 0;
  let errors = 0;
  const details: AutoGenerationDetail[] = [];

  try {
    // 1. Find default pack for this track
    // Derive formation category from formationType (e.g. "VTC", "Passerelle Taxi vers VTC" → "VTC")
    const category = deriveFormationCategory(params.formationType);
    const packs = await fetchDefaultPacks(params.track, category);
    if (packs.length === 0) return { generated: 0, errors: 0, details };

    const pack = packs[0];
    const autoItems = (pack.document_pack_items || []).filter(
      (i) => i.auto_generate && i.template?.status === "published"
    );

    if (autoItems.length === 0) return { generated: 0, errors: 0, details };

    // 2. Build variables once
    const variables = await buildVariablesForGeneration({
      contactId: params.contactId,
      sessionId: params.sessionId,
    });

    // Resolve centre_id from contact
    let centreIdForAuto: string | null = null;
    if (params.contactId) {
      const { data: contact } = await supabase
        .from("contacts")
        .select("centre_id")
        .eq("id", params.contactId)
        .single();
      centreIdForAuto = contact?.centre_id || null;
    }

    // 3. Generate each auto template
    for (const item of autoItems) {
      const tmpl = item.template;
      if (!tmpl) continue;

      let currentDoc: GeneratedDocumentV2Row | null = null;
      let currentStage: AutoGenerationStage = "record_insert";

      try {
        // Anti-duplicate check
        const alreadyExists = await checkExistingDocument(tmpl.id, params.contactId);
        if (alreadyExists) {
          generated++; // Already exists
          details.push({
            templateId: tmpl.id,
            templateName: tmpl.name || "document",
            status: "skipped",
            stage: "duplicate_check",
            message: "Document déjà généré, auto-génération ignorée.",
          });
          continue;
        }

        // Render template body
        const rendered = (tmpl.template_body || "").replace(
          /\{\{(\w+)\}\}/g,
          (_: string, v: string) => variables[v] || ""
        );

        // Create queued record
        currentStage = "record_insert";
        currentDoc = await insertGeneratedDocument({
          template_id: tmpl.id,
          template_version_id: tmpl.current_version_id,
          contact_id: params.contactId,
          session_id: params.sessionId || null,
          inscription_id: params.inscriptionId || null,
          centre_id: centreIdForAuto || "",
          file_name: `${(tmpl.name || "document").replace(/\s+/g, "_")}.pdf`,
          status: "queued",
          // CAST JUSTIFIED: Record<string,string> → Json (structural mismatch in index signatures)
          variables_snapshot: variables as unknown as Json,
        });

        // Generate PDF client-side
        currentStage = "pdf_render";
        const { default: jsPDF } = await import("jspdf");
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = rendered;
        tempDiv.style.cssText =
          "font-family:Arial,sans-serif;font-size:11pt;line-height:1.5;max-width:170mm;padding:0;color:#000;";
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
        const centreId = currentDoc.centre_id;
        const filePath = `centre/${centreId}/contacts/${params.contactId}/${currentDoc.id}.pdf`;

        currentStage = "storage_upload";
        const { error: upErr } = await supabase.storage
          .from("generated-docs")
          .upload(filePath, pdfBlob, { contentType: "application/pdf" });

        if (upErr) {
          throw upErr;
        }

        currentStage = "status_update";
        await updateGeneratedDocumentStatus(currentDoc.id, "generated", { file_path: filePath });

        // Audit
        await insertAuditLog({
          template_id: tmpl.id,
          generated_document_id: currentDoc.id,
          action: "auto_generated",
          contact_id: params.contactId,
          session_id: params.sessionId || null,
          centre_id: centreId,
          metadata: { auto: true, trigger: "inscription_or_conversion", pack_name: pack.name },
        });

        generated++;
        details.push({
          templateId: tmpl.id,
          templateName: tmpl.name || "document",
          status: "generated",
          stage: "status_update",
          message: "Document généré automatiquement avec succès.",
          documentId: currentDoc.id,
        });
      } catch (error) {
        errors++;
        const failureMessage = await logAutoGenerationFailure({
          templateId: tmpl.id,
          templateName: tmpl.name || "document",
          contactId: params.contactId,
          sessionId: params.sessionId,
          centreId: currentDoc?.centre_id ?? centreIdForAuto,
          generatedDocumentId: currentDoc?.id,
          stage: currentStage,
          error,
        });
        console.error("[auto-generate-documents] template auto-generation failed", {
          templateId: tmpl.id,
          templateName: tmpl.name,
          contactId: params.contactId,
          sessionId: params.sessionId,
          packName: pack.name,
          error,
        });
        details.push({
          templateId: tmpl.id,
          templateName: tmpl.name || "document",
          status: "failed",
          stage: currentStage,
          message: failureMessage,
          documentId: currentDoc?.id,
        });
      }
    }
  } catch (error) {
    errors++;
    const normalized = normalizeAutoGenerationError(error);
    console.error("[auto-generate-documents] pack-level auto-generation failed", {
      contactId: params.contactId,
      sessionId: params.sessionId,
      track: params.track,
      formationType: params.formationType,
      error,
    });
    details.push({
      templateId: null,
      templateName: "pack",
      status: "failed",
      stage: "pack_resolution",
      message: normalized.message,
    });
  }

  return { generated, errors, details };
}
