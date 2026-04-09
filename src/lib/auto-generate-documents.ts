// ═══════════════════════════════════════════════════════════════
// Auto-generation of pack documents on inscription/conversion
// ═══════════════════════════════════════════════════════════════

import { supabase } from "@/integrations/supabase/client";
import { buildVariablesForGeneration } from "@/hooks/useTemplateStudioV2";
import type { TrackScope } from "@/hooks/useTemplateStudioV2";
import type { Database, Json } from "@/integrations/supabase/types";

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
  let query = supabase
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
): Promise<GeneratedDocumentV2Row | null> {
  const { data, error } = await supabase
    .from("generated_documents_v2")
    .insert(payload)
    .select("id, centre_id")
    .single();
  if (error) return null;
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
}): Promise<{ generated: number; errors: number }> {
  let generated = 0;
  let errors = 0;

  try {
    // 1. Find default pack for this track
    const packs = await fetchDefaultPacks(params.track);
    if (packs.length === 0) return { generated: 0, errors: 0 };

    const pack = packs[0];
    const autoItems = (pack.document_pack_items || []).filter(
      (i) => i.auto_generate && i.template?.status === "published"
    );

    if (autoItems.length === 0) return { generated: 0, errors: 0 };

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
      try {
        const tmpl = item.template;
        if (!tmpl) continue;

        // Anti-duplicate check
        const alreadyExists = await checkExistingDocument(tmpl.id, params.contactId);
        if (alreadyExists) {
          generated++; // Already exists
          continue;
        }

        // Render template body
        const rendered = (tmpl.template_body || "").replace(
          /\{\{(\w+)\}\}/g,
          (_: string, v: string) => variables[v] || ""
        );

        // Create queued record
        const doc = await insertGeneratedDocument({
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

        if (!doc) {
          errors++;
          continue;
        }

        // Generate PDF client-side
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
        const centreId = doc.centre_id;
        const filePath = `centre/${centreId}/contacts/${params.contactId}/${doc.id}.pdf`;

        const { error: upErr } = await supabase.storage
          .from("generated-docs")
          .upload(filePath, pdfBlob, { contentType: "application/pdf" });

        if (upErr) {
          await updateGeneratedDocumentStatus(doc.id, "failed", { error_message: upErr.message });
          errors++;
          continue;
        }

        await updateGeneratedDocumentStatus(doc.id, "generated", { file_path: filePath });

        // Audit
        await insertAuditLog({
          template_id: tmpl.id,
          generated_document_id: doc.id,
          action: "auto_generated",
          contact_id: params.contactId,
          session_id: params.sessionId || null,
          metadata: { auto: true, trigger: "inscription_or_conversion" },
        });

        generated++;
      } catch {
        errors++;
      }
    }
  } catch {
    // Silent fail for auto-generation
  }

  return { generated, errors };
}
