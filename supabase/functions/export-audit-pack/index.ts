// ═══════════════════════════════════════════════════════════════
// Export Audit Pack — Generate ZIP with PDFs and manifest
// ═══════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ExportRequest {
  type: "session" | "learner";
  sessionId?: string;
  contactId?: string;
  includeBlocks?: string[];
}

interface DocumentInfo {
  id: string;
  file_path: string | null;
  file_name: string | null;
  template_name: string;
  document_type: string;
  contact_name: string;
  contact_id: string;
  created_at: string;
  status: string;
}

interface ManifestEntry {
  filename: string;
  documentType: string;
  contact: string;
  generatedAt: string;
  status: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Validate user
  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await authClient.auth.getUser();
  if (userError || !user) {
    return new Response(
      JSON.stringify({ error: "Invalid token" }),
      { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  // Validate role
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: userRole } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (!userRole || !["admin", "staff"].includes(userRole.role)) {
    return new Response(
      JSON.stringify({ error: "Forbidden" }),
      { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const body: ExportRequest = await req.json();
    const { type, sessionId, contactId, includeBlocks } = body;

    if (!type || (type === "session" && !sessionId) || (type === "learner" && !contactId)) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Build query for documents
    let query = supabase
      .from("generated_documents_v2")
      .select(`
        id,
        file_path,
        file_name,
        status,
        created_at,
        contact_id,
        template:template_studio_templates(name, type),
        contact:contacts(nom, prenom)
      `)
      .is("deleted_at", null)
      .eq("status", "generated");

    if (type === "session" && sessionId) {
      query = query.eq("session_id", sessionId);
    } else if (type === "learner" && contactId) {
      query = query.eq("contact_id", contactId);
    }

    const { data: documents, error: docsError } = await query;
    if (docsError) {
      throw new Error(`Failed to fetch documents: ${docsError.message}`);
    }

    if (!documents || documents.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Aucun document à exporter",
          documentsCount: 0,
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create ZIP
    const zip = new JSZip();
    const manifest: ManifestEntry[] = [];
    const errors: string[] = [];
    let successCount = 0;

    for (const doc of documents) {
      if (!doc.file_path) continue;

      const templateData = doc.template as unknown as { name: string; type: string } | null;
      const contactData = doc.contact as unknown as { nom: string; prenom: string } | null;
      const contactName = contactData ? `${contactData.prenom || ""} ${contactData.nom || ""}`.trim() : "Inconnu";
      const documentType = templateData?.type || "autre";

      // Filter by blocks if specified
      if (includeBlocks && includeBlocks.length > 0) {
        const blockMap: Record<string, string> = {
          convocation: "entree",
          convention: "entree",
          contrat: "entree",
          reglement_interieur: "entree",
          feuille_emargement: "suivi",
          evaluation_formateur: "suivi",
          evaluation_chaud: "suivi",
          attestation: "fin",
          certificat_realisation: "fin",
          evaluation_froid: "fin",
          facture: "finances",
          devis: "finances",
          releve_notes: "specifiques",
        };
        const docBlock = blockMap[documentType] || "specifiques";
        if (!includeBlocks.includes(docBlock)) continue;
      }

      try {
        // Download file from storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from("generated-documents")
          .download(doc.file_path);

        if (downloadError || !fileData) {
          errors.push(`${doc.file_name || doc.id}: ${downloadError?.message || "Download failed"}`);
          continue;
        }

        // Build safe filename
        const safeName = `${documentType}_${contactName.replace(/[^a-zA-Z0-9]/g, "_")}_${doc.id.slice(0, 8)}.pdf`;
        const folder = contactName.replace(/[^a-zA-Z0-9]/g, "_");
        
        zip.file(`${folder}/${safeName}`, await fileData.arrayBuffer());
        
        manifest.push({
          filename: `${folder}/${safeName}`,
          documentType: templateData?.name || documentType,
          contact: contactName,
          generatedAt: doc.created_at || "",
          status: doc.status || "generated",
        });

        successCount++;
      } catch (err: any) {
        errors.push(`${doc.file_name || doc.id}: ${err.message}`);
      }
    }

    if (successCount === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Aucun fichier n'a pu être inclus dans l'export",
          errors,
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Add manifest
    const manifestContent = JSON.stringify({
      exportedAt: new Date().toISOString(),
      exportType: type,
      sessionId: sessionId || null,
      contactId: contactId || null,
      documentsCount: successCount,
      documents: manifest,
    }, null, 2);
    zip.file("manifest.json", manifestContent);

    // Add CSV summary
    const csvHeader = "Fichier;Type;Contact;Généré le;Statut\n";
    const csvRows = manifest.map(m => 
      `"${m.filename}";"${m.documentType}";"${m.contact}";"${m.generatedAt}";"${m.status}"`
    ).join("\n");
    zip.file("index.csv", "\uFEFF" + csvHeader + csvRows);

    // Generate ZIP blob
    const zipBlob = await zip.generateAsync({ type: "base64" });

    // Save to storage
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const zipFileName = `audit_pack_${type}_${timestamp}.zip`;
    const storagePath = `audit-exports/${user.id}/${zipFileName}`;

    const { error: uploadError } = await supabase.storage
      .from("generated-documents")
      .upload(storagePath, Uint8Array.from(atob(zipBlob), c => c.charCodeAt(0)), {
        contentType: "application/zip",
        upsert: true,
      });

    if (uploadError) {
      // Return base64 directly if upload fails
      console.error("Upload failed, returning base64:", uploadError);
      return new Response(
        JSON.stringify({
          success: true,
          documentsCount: successCount,
          errors: errors.length > 0 ? errors : undefined,
          downloadUrl: null,
          base64: zipBlob,
          filename: zipFileName,
        }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get signed URL
    const { data: signedUrl } = await supabase.storage
      .from("generated-documents")
      .createSignedUrl(storagePath, 3600); // 1 hour

    // Log audit action
    await supabase.from("audit_logs").insert({
      table_name: "export_audit_pack",
      record_id: sessionId || contactId || user.id,
      action: "EXPORT_AUDIT",
      user_id: user.id,
      new_data: {
        type,
        sessionId,
        contactId,
        documentsCount: successCount,
        filename: zipFileName,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        documentsCount: successCount,
        errors: errors.length > 0 ? errors : undefined,
        downloadUrl: signedUrl?.signedUrl || null,
        filename: zipFileName,
      }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (err: any) {
    console.error("Export audit pack error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
