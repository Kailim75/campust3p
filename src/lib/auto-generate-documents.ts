// ═══════════════════════════════════════════════════════════════
// Auto-generation of pack documents on inscription/conversion
// ═══════════════════════════════════════════════════════════════

import { supabase } from "@/integrations/supabase/client";
import { buildVariablesForGeneration } from "@/hooks/useTemplateStudioV2";
import type { TrackScope } from "@/hooks/useTemplateStudioV2";

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
    const { data: packs } = await (supabase as any)
      .from("document_packs")
      .select("*, document_pack_items(*, template:template_studio_templates(id, name, type, status, template_body, current_version_id))")
      .eq("is_default", true)
      .or(`track_scope.eq.${params.track},track_scope.eq.both`);

    if (!packs || packs.length === 0) return { generated: 0, errors: 0 };

    const pack = packs[0];
    const autoItems = (pack.document_pack_items || []).filter(
      (i: any) => i.auto_generate && i.template?.status === "published"
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
      const { data: contact } = await supabase.from("contacts").select("centre_id").eq("id", params.contactId).single();
      centreIdForAuto = contact?.centre_id || null;
    }

    // 3. Generate each auto template
    for (const item of autoItems) {
      try {
        const tmpl = item.template;

        // Anti-duplicate check
        const { data: existing } = await (supabase as any)
          .from("generated_documents_v2")
          .select("id")
          .eq("template_id", tmpl.id)
          .eq("contact_id", params.contactId)
          .eq("status", "generated")
          .limit(1);

        if (existing && existing.length > 0) {
          generated++; // Already exists
          continue;
        }

        // Create queued record
        const rendered = tmpl.template_body.replace(
          /\{\{(\w+)\}\}/g,
          (_: string, v: string) => variables[v] || ""
        );

        const { data: doc, error: docErr } = await (supabase as any)
          .from("generated_documents_v2")
          .insert({
            template_id: tmpl.id,
            template_version_id: tmpl.current_version_id,
            contact_id: params.contactId,
            session_id: params.sessionId || null,
            inscription_id: params.inscriptionId || null,
            centre_id: centreIdForAuto,
            file_name: `${tmpl.name.replace(/\s+/g, "_")}.pdf`,
            status: "queued",
            variables_snapshot: variables,
          })
          .select()
          .single();

        if (docErr) { errors++; continue; }

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
          await (supabase as any)
            .from("generated_documents_v2")
            .update({ status: "failed", error_message: upErr.message })
            .eq("id", doc.id);
          errors++;
          continue;
        }

        await (supabase as any)
          .from("generated_documents_v2")
          .update({ status: "generated", file_path: filePath })
          .eq("id", doc.id);

        // Audit
        await (supabase as any).from("template_audit_log").insert({
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
