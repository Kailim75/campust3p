import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // ── Auth ──
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await anonClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // ── Role check ──
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roles = (userRoles || []).map((r: any) => r.role);
    if (!roles.some((r: string) => ["admin", "staff", "super_admin"].includes(r))) {
      return new Response(JSON.stringify({ error: "Accès refusé" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Parse body ──
    const body = await req.json();
    const { attachmentId, centreId, contactId, typeDocument, nomDocument } = body;

    if (!attachmentId || !centreId || !contactId || !typeDocument) {
      return new Response(JSON.stringify({ error: "attachmentId, centreId, contactId, typeDocument required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Centre access ──
    const { data: access } = await supabase
      .from("user_centres")
      .select("centre_id")
      .eq("user_id", userId)
      .eq("centre_id", centreId)
      .maybeSingle();
    if (!access) {
      return new Response(JSON.stringify({ error: "Centre non autorisé" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Get attachment ──
    const { data: att, error: attErr } = await supabase
      .from("crm_email_attachments")
      .select("*")
      .eq("id", attachmentId)
      .eq("centre_id", centreId)
      .single();

    if (attErr || !att) {
      return new Response(JSON.stringify({ error: "Pièce jointe introuvable" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Already promoted? ──
    if (att.promoted_to_document_id) {
      return new Response(JSON.stringify({ error: "Cette pièce jointe a déjà été ajoutée au dossier" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Anti-duplicate: check SHA-256 against existing contact_documents ──
    if (att.sha256_hash) {
      const { data: existing } = await supabase
        .from("crm_email_attachments")
        .select("id, promoted_to_document_id")
        .eq("sha256_hash", att.sha256_hash)
        .eq("centre_id", centreId)
        .not("promoted_to_document_id", "is", null)
        .neq("id", attachmentId)
        .limit(1);

      if (existing && existing.length > 0) {
        return new Response(JSON.stringify({
          error: "Un fichier identique existe déjà dans le dossier (doublon détecté par empreinte)",
          existingDocumentId: existing[0].promoted_to_document_id,
        }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── Check file exists in storage ──
    if (!att.storage_path) {
      return new Response(JSON.stringify({ error: "Fichier non disponible en stockage — téléchargez-le d'abord" }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Copy file from crm-email-attachments to contact-documents bucket ──
    const destPath = `${centreId}/${contactId}/${Date.now()}_${att.filename}`;

    // Download from source
    const { data: fileData, error: dlErr } = await supabase.storage
      .from("crm-email-attachments")
      .download(att.storage_path);

    if (dlErr || !fileData) {
      return new Response(JSON.stringify({ error: "Impossible de lire le fichier source" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upload to contact-documents
    const { error: upErr } = await supabase.storage
      .from("contact-documents")
      .upload(destPath, fileData, {
        contentType: att.mime_type || "application/octet-stream",
        upsert: false,
      });

    if (upErr) {
      console.error("Storage upload error:", upErr);
      return new Response(JSON.stringify({ error: "Erreur lors de la copie du fichier" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Create contact_documents record ──
    const docName = nomDocument || att.filename;
    const { data: newDoc, error: docErr } = await supabase
      .from("contact_documents")
      .insert({
        contact_id: contactId,
        nom: docName,
        type_document: typeDocument,
        file_path: destPath,
        file_size: att.size_bytes || null,
        mime_type: att.mime_type || null,
        commentaires: `Promu depuis email — PJ originale: ${att.filename} (ID: ${att.id})`,
      })
      .select("id")
      .single();

    if (docErr) {
      console.error("Document insert error:", docErr);
      // Cleanup uploaded file
      await supabase.storage.from("contact-documents").remove([destPath]);
      return new Response(JSON.stringify({ error: "Erreur création document: " + docErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Update attachment with promotion info ──
    await supabase
      .from("crm_email_attachments")
      .update({
        promoted_to_document_id: newDoc.id,
        promoted_to_table: "contact_documents",
        promoted_at: new Date().toISOString(),
        promoted_by: userId,
      })
      .eq("id", attachmentId);

    // ── Audit log ──
    await supabase.from("audit_logs").insert({
      table_name: "crm_email_attachments",
      record_id: attachmentId,
      action: "PROMOTE_TO_DOCUMENT",
      user_id: userId,
      centre_id: centreId,
      new_data: {
        document_id: newDoc.id,
        contact_id: contactId,
        type_document: typeDocument,
        filename: att.filename,
      },
    });

    return new Response(JSON.stringify({
      success: true,
      documentId: newDoc.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("promote-attachment error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
