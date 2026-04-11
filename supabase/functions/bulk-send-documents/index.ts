// ═══════════════════════════════════════════════════════════════
// Bulk Send Documents — Secure batch email with validation
// ═══════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { buildEmailHtml } from "../_shared/email-template.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const EMAIL_CONFIG = {
  FROM: "Ecole T3P Montrouge <montrouge@ecolet3p.fr>",
  REPLY_TO: "montrouge@ecolet3p.fr",
} as const;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface BulkSendRequest {
  sessionId: string;
  contactIds: string[];
  documentTypes?: string[];
  subject: string;
  bodyTemplate: string;
  dryRun?: boolean;
}

interface SendResult {
  contactId: string;
  contactName: string;
  email: string | null;
  status: "sent" | "skipped" | "failed" | "no_email" | "no_document";
  documentsSent: number;
  error?: string;
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
    const body: BulkSendRequest = await req.json();
    const { sessionId, contactIds, documentTypes, subject, bodyTemplate, dryRun } = body;

    if (!sessionId || !contactIds?.length || !subject) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Limit batch size for safety
    const MAX_BATCH_SIZE = 50;
    if (contactIds.length > MAX_BATCH_SIZE) {
      return new Response(
        JSON.stringify({ 
          error: `Batch size exceeds limit of ${MAX_BATCH_SIZE}. Please send in smaller batches.` 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch session info
    const { data: session } = await supabase
      .from("sessions")
      .select("nom, date_debut, date_fin, formation_type, lieu")
      .eq("id", sessionId)
      .single();

    // Fetch contacts with their documents
    const { data: contacts, error: contactsError } = await supabase
      .from("contacts")
      .select("id, nom, prenom, email")
      .in("id", contactIds);

    if (contactsError || !contacts) {
      throw new Error(`Failed to fetch contacts: ${contactsError?.message}`);
    }

    // Fetch documents for these contacts
    let docsQuery = supabase
      .from("generated_documents_v2")
      .select(`
        id,
        contact_id,
        file_path,
        file_name,
        template:template_studio_templates(name, type)
      `)
      .eq("session_id", sessionId)
      .in("contact_id", contactIds)
      .eq("status", "generated")
      .is("deleted_at", null);

    const { data: documents, error: docsError } = await docsQuery;
    if (docsError) {
      throw new Error(`Failed to fetch documents: ${docsError.message}`);
    }

    // Group documents by contact
    const docsByContact = new Map<string, typeof documents>();
    for (const doc of documents || []) {
      if (!doc.contact_id) continue;
      
      // Filter by document types if specified
      const templateData = doc.template as unknown as { name: string; type: string } | null;
      if (documentTypes?.length && !documentTypes.includes(templateData?.type || "")) {
        continue;
      }

      const existing = docsByContact.get(doc.contact_id) || [];
      existing.push(doc);
      docsByContact.set(doc.contact_id, existing);
    }

    const results: SendResult[] = [];
    let sentCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const contact of contacts) {
      const contactName = `${contact.prenom || ""} ${contact.nom || ""}`.trim();
      const contactDocs = docsByContact.get(contact.id) || [];

      // Validation checks
      if (!contact.email) {
        results.push({
          contactId: contact.id,
          contactName,
          email: null,
          status: "no_email",
          documentsSent: 0,
          error: "Pas d'email",
        });
        skippedCount++;
        continue;
      }

      if (contactDocs.length === 0) {
        results.push({
          contactId: contact.id,
          contactName,
          email: contact.email,
          status: "no_document",
          documentsSent: 0,
          error: "Aucun document",
        });
        skippedCount++;
        continue;
      }

      // Dry run - just validate
      if (dryRun) {
        results.push({
          contactId: contact.id,
          contactName,
          email: contact.email,
          status: "skipped",
          documentsSent: contactDocs.length,
        });
        continue;
      }

      // Build attachments
      const attachments: { filename: string; content: string }[] = [];
      for (const doc of contactDocs) {
        if (!doc.file_path) continue;

        try {
          // Detect bucket based on path convention
          const bucket = doc.file_path.startsWith("centre/") 
            ? "generated-docs" 
            : "generated-documents";

          const { data: fileData, error: downloadError } = await supabase.storage
            .from(bucket)
            .download(doc.file_path);

          if (downloadError || !fileData) {
            console.error(`Failed to download ${bucket}/${doc.file_path}:`, downloadError);
            continue;
          }

          const arrayBuffer = await fileData.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = "";
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);
          
          attachments.push({
            filename: doc.file_name || `document_${doc.id}.pdf`,
            content: base64,
          });
        } catch (err) {
          console.error(`Error downloading doc ${doc.id}:`, err);
        }
      }

      if (attachments.length === 0) {
        results.push({
          contactId: contact.id,
          contactName,
          email: contact.email,
          status: "failed",
          documentsSent: 0,
          error: "Impossible de télécharger les documents",
        });
        failedCount++;
        continue;
      }

      // Personalize email body
      const personalizedBody = bodyTemplate
        .replace(/\{prenom\}/g, contact.prenom || "")
        .replace(/\{nom\}/g, contact.nom || "")
        .replace(/\{session\}/g, session?.nom || "")
        .replace(/\{formation\}/g, session?.formation_type || "");

      const htmlContent = buildEmailHtml({
        title: subject,
        bodyHtml: personalizedBody.split("\n").map(p => `<p>${p}</p>`).join(""),
      });

      try {
        const emailResponse = await resend.emails.send({
          from: EMAIL_CONFIG.FROM,
          to: contact.email,
          reply_to: EMAIL_CONFIG.REPLY_TO,
          subject: subject,
          html: htmlContent,
          attachments: attachments.map(a => ({
            filename: a.filename,
            content: a.content,
            type: "application/pdf",
          })),
        });

        // Log envoi
        await supabase.from("document_envois").insert({
          contact_id: contact.id,
          session_id: sessionId,
          document_type: "bulk_send",
          document_name: `Pack ${attachments.length} document(s)`,
          statut: "envoye",
          date_envoi: new Date().toISOString(),
          envoi_type: "email",
          "envoyé_par": user.id,
          metadata: {
            resend_id: emailResponse.data?.id,
            documents_count: attachments.length,
          },
        });

        results.push({
          contactId: contact.id,
          contactName,
          email: contact.email,
          status: "sent",
          documentsSent: attachments.length,
        });
        sentCount++;

      } catch (err: any) {
        console.error(`Failed to send email to ${contact.email}:`, err);
        results.push({
          contactId: contact.id,
          contactName,
          email: contact.email,
          status: "failed",
          documentsSent: 0,
          error: err.message || "Erreur d'envoi",
        });
        failedCount++;
      }

      // Small delay between sends
      await new Promise(r => setTimeout(r, 200));
    }

    // Log audit action
    await supabase.from("audit_logs").insert({
      table_name: "bulk_send_documents",
      record_id: sessionId,
      action: dryRun ? "BULK_SEND_DRYRUN" : "BULK_SEND",
      user_id: user.id,
      new_data: {
        sessionId,
        contactCount: contactIds.length,
        sent: sentCount,
        skipped: skippedCount,
        failed: failedCount,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        dryRun: dryRun || false,
        summary: {
          total: contactIds.length,
          sent: sentCount,
          skipped: skippedCount,
          failed: failedCount,
        },
        results,
      }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (err: any) {
    console.error("Bulk send error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
