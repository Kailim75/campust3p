import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { 
  generateDocumentPDF, 
  getPdfAsBase64,
  type ContactInfo,
  type SessionInfo,
  type CompanyInfo,
  type DocumentType 
} from "../_shared/pdf-generator.ts";
import {
  validateAttachment,
  canSendEmailWithAttachments,
  logPdfDiagnostic,
  type ValidatedAttachment
} from "../_shared/pdf-validator.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// ===============================================
// CONFIGURATION EMAIL CENTRALISÉE - NE PAS MODIFIER
// Adresse unique et verrouillée pour TOUS les envois
// ===============================================
const EMAIL_CONFIG = {
  FROM: "Ecole T3P Montrouge <montrouge@ecolet3p.fr>",
  REPLY_TO: "montrouge@ecolet3p.fr",
} as const;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  // IMPORTANT: doit inclure tous les headers envoyés par supabase-js (sinon le navigateur bloque en préflight)
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EmailResult {
  type: string;
  recipient: string;
  recipientName?: string;
  contactId?: string;
  sessionId?: string;
  factureId?: string;
  examenId?: string;
  contratId?: string;
  subject?: string;
  success: boolean;
  resendId?: string;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Authentication check - require valid JWT
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized - Missing or invalid Authorization header' }), 
      { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  // Verify the JWT token by getting the user
  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });
  
  const { data: { user }, error: userError } = await authClient.auth.getUser();
  
  if (userError || !user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized - Invalid token' }), 
      { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
  
  // Use service role key for role check (bypasses RLS)
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  
  // Check user has admin or staff role
  const { data: userRole, error: roleError } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();
  
  if (roleError || !userRole || !['admin', 'staff'].includes(userRole.role)) {
    return new Response(
      JSON.stringify({ error: 'Forbidden - Insufficient permissions' }), 
      { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
  
  // Use service role key for database operations after authentication is verified
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const results: EmailResult[] = [];

  try {
    // Check if this is a manual email send request
    const body = await req.json().catch(() => null);
    
    // ========================================
    // BULK EMAIL SENDING (with recipients array)
    // ========================================
    if (body && body.recipients && Array.isArray(body.recipients) && body.recipients.length > 0) {
      console.log("Processing bulk email send request:", body.type, "recipients:", body.recipients.length);
      
      const documentType = body.documentType || "Document";
      const sessionName = body.sessionName || "";
      const sessionInfo = body.sessionInfo || {};
      const customMessage = body.customMessage || "";
      const generatePdfAttachments = body.generateAttachments !== false; // Default true
      
      // Fetch centre formation data for PDF header
      let centreData: CompanyInfo | null = null;
      try {
        const { data: centreFormation } = await supabase
          .from("centre_formation")
          .select("*")
          .limit(1)
          .single();
        
        if (centreFormation) {
          centreData = {
            name: centreFormation.nom_commercial || centreFormation.nom_legal || "Ecole T3P",
            address: centreFormation.adresse_complete || "",
            phone: centreFormation.telephone || "",
            email: centreFormation.email || "",
            siret: centreFormation.siret || "",
            nda: centreFormation.nda || "",
          };
        }
      } catch (e) {
        console.log("Could not fetch centre formation:", e);
      }
      
      // Default company info if no centre data
      const company: CompanyInfo = centreData || {
        name: "Ecole T3P Montrouge",
        address: "Montrouge",
        phone: "01 23 45 67 89",
        email: "montrouge@ecolet3p.fr",
        siret: "123 456 789 00012",
        nda: "11 75 12345 75",
      };
      
      const bulkResults: EmailResult[] = [];
      
      // Map document type string to PDF type
      const pdfDocTypes: Record<string, DocumentType> = {
        "Convocation": "convocation",
        "convocation": "convocation",
        "Attestation de formation": "attestation",
        "attestation": "attestation",
        "Attestation": "attestation",
        "Programme de formation": "programme",
        "programme": "programme",
        "Programme": "programme",
        "Contrat de formation": "contrat",
        "contrat": "contrat",
        "Contrat": "contrat",
      };
      
      for (const recipient of body.recipients) {
        if (!recipient.email) continue;
        
        const recipientName = recipient.name || "";
        const subject = `${documentType} - ${sessionName || 'Ecole T3P Montrouge'}`;
        
        // Fetch full contact data if contactId provided
        let contactData: ContactInfo | null = null;
        if (recipient.contactId) {
          try {
            const { data: contact } = await supabase
              .from("contacts")
              .select("*")
              .eq("id", recipient.contactId)
              .single();
            
            if (contact) {
              contactData = {
                civilite: contact.civilite || undefined,
                nom: contact.nom,
                prenom: contact.prenom,
                email: contact.email || undefined,
                telephone: contact.telephone || undefined,
                rue: contact.rue || undefined,
                code_postal: contact.code_postal || undefined,
                ville: contact.ville || undefined,
                date_naissance: contact.date_naissance || undefined,
                ville_naissance: contact.ville_naissance || undefined,
              };
            }
          } catch (e) {
            console.log("Could not fetch contact:", e);
          }
        }
        
        // Fallback contact info from recipient name
        if (!contactData) {
          const nameParts = recipientName.split(" ");
          contactData = {
            nom: nameParts.slice(1).join(" ") || "Participant",
            prenom: nameParts[0] || "",
            email: recipient.email,
          };
        }
        
        // Build session info for PDF
        const sessionDataForPdf: SessionInfo = {
          nom: sessionName || "Formation",
          formation_type: sessionInfo.formation_type || "VTC",
          date_debut: sessionInfo.date_debut || new Date().toISOString(),
          date_fin: sessionInfo.date_fin || new Date().toISOString(),
          lieu: sessionInfo.lieu || undefined,
          duree_heures: sessionInfo.duree_heures || 35,
          heure_debut: sessionInfo.heure_debut || undefined,
          heure_fin: sessionInfo.heure_fin || undefined,
          formateur: sessionInfo.formateur || undefined,
        };
        
        // Generate PDF attachment if document type is supported
        // VALIDATION STRICTE: aucun envoi avec pièce jointe vide
        let validatedAttachments: ValidatedAttachment[] = [];
        let pdfErrors: string[] = [];
        const pdfType = pdfDocTypes[documentType];
        const requiresAttachment = generatePdfAttachments && pdfType;
        
        if (requiresAttachment && contactData) {
          try {
            console.log(`[PDF-GEN] Génération PDF: ${pdfType} pour ${recipientName}`);
            const pdfDoc = generateDocumentPDF(pdfType, contactData, sessionDataForPdf, company);
            const pdfBase64 = getPdfAsBase64(pdfDoc);
            
            const filename = `${documentType.replace(/\s+/g, "_")}-${contactData.nom}-${contactData.prenom}.pdf`;
            
            // Diagnostic complet
            logPdfDiagnostic(`Génération ${pdfType}`, filename, pdfBase64);
            
            // Validation stricte
            const { attachment, errors } = validateAttachment(filename, pdfBase64);
            
            if (attachment) {
              validatedAttachments.push(attachment);
              console.log(`[PDF-GEN] ✓ PDF validé: ${filename} (${attachment.sizeBytes} bytes)`);
            } else {
              pdfErrors = errors;
              console.error(`[PDF-GEN] ❌ PDF invalide pour ${recipientName}:`, errors);
            }
          } catch (pdfError: any) {
            pdfErrors.push(`Erreur génération PDF: ${pdfError.message}`);
            console.error(`[PDF-GEN] ❌ Échec génération PDF pour ${recipientName}:`, pdfError);
          }
        }
        
        // BLOCAGE: Si pièce jointe requise mais invalide/absente
        if (requiresAttachment) {
          const sendCheck = canSendEmailWithAttachments(validatedAttachments, 1);
          
          if (!sendCheck.allowed) {
            const errorMessage = `Envoi bloqué: ${sendCheck.reason}. ${pdfErrors.join('; ')}`;
            console.error(`[EMAIL-BLOCKED] ${recipient.email}: ${errorMessage}`);
            
            await supabase.from("email_logs").insert({
              type: "document_envoi",
              recipient_email: recipient.email,
              recipient_name: recipientName,
              contact_id: recipient.contactId,
              subject: subject,
              status: "blocked",
              error_message: errorMessage,
            });
            
            bulkResults.push({
              type: "document_envoi",
              recipient: recipient.email,
              recipientName,
              contactId: recipient.contactId,
              subject,
              success: false,
              error: errorMessage,
            });
            
            // SKIP cet envoi - ne pas continuer avec pièce jointe vide
            continue;
          }
        }
        
        const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">📄 ${documentType}</h2>
            <p>Bonjour${recipientName ? ` ${recipientName}` : ""},</p>
            <p>Nous vous adressons le document <strong>${documentType}</strong>${sessionName ? ` concernant votre formation <strong>${sessionName}</strong>` : ""}.</p>
            ${sessionInfo.date_debut ? `<p><strong>Date de début :</strong> ${new Date(sessionInfo.date_debut).toLocaleDateString("fr-FR")}</p>` : ""}
            ${sessionInfo.date_fin ? `<p><strong>Date de fin :</strong> ${new Date(sessionInfo.date_fin).toLocaleDateString("fr-FR")}</p>` : ""}
            ${sessionInfo.lieu ? `<p><strong>Lieu :</strong> ${sessionInfo.lieu}</p>` : ""}
            ${customMessage ? `<p>${customMessage}</p>` : ""}
            ${validatedAttachments.length > 0 ? `<p><strong>📎 Pièce jointe :</strong> ${validatedAttachments.map(a => `${a.filename} (${Math.round(a.sizeBytes / 1024)} Ko)`).join(", ")}</p>` : ""}
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #888; font-size: 12px;">
              Ecole T3P Montrouge - Centre de formation Taxi, VTC et VMDTR<br>
              📧 montrouge@ecolet3p.fr
            </p>
          </div>
        `;
        
        try {
          const emailPayload: any = {
            from: EMAIL_CONFIG.FROM,
            to: [recipient.email],
            subject: subject,
            html: htmlContent,
            reply_to: EMAIL_CONFIG.REPLY_TO,
          };
          
          // Add validated attachments only
          if (validatedAttachments.length > 0) {
            emailPayload.attachments = validatedAttachments.map(a => ({
              filename: a.filename,
              content: a.content,
            }));
          }
          
          const emailResponse = await resend.emails.send(emailPayload);
          
          console.log(`[EMAIL-SENT] ${recipient.email}: ${emailResponse.data?.id} (${validatedAttachments.length} pièce(s) jointe(s), ${validatedAttachments.reduce((sum, a) => sum + a.sizeBytes, 0)} bytes total)`);
          
          // Log success with attachment info
          await supabase.from("email_logs").insert({
            type: "document_envoi",
            recipient_email: recipient.email,
            recipient_name: recipientName,
            contact_id: recipient.contactId,
            subject: subject,
            status: "sent",
            resend_id: emailResponse.data?.id,
          });
          
          bulkResults.push({
            type: "document_envoi",
            recipient: recipient.email,
            recipientName,
            contactId: recipient.contactId,
            subject,
            success: true,
            resendId: emailResponse.data?.id,
          });
          
        } catch (emailError: any) {
          console.error(`[EMAIL-FAILED] ${recipient.email}:`, emailError);
          
          await supabase.from("email_logs").insert({
            type: "document_envoi",
            recipient_email: recipient.email,
            recipient_name: recipientName,
            contact_id: recipient.contactId,
            subject: subject,
            status: "failed",
            error_message: emailError.message,
          });
          
          bulkResults.push({
            type: "document_envoi",
            recipient: recipient.email,
            recipientName,
            contactId: recipient.contactId,
            subject,
            success: false,
            error: emailError.message,
          });
        }
      }
      
      const successCount = bulkResults.filter(r => r.success).length;
      console.log(`Bulk email complete: ${successCount}/${bulkResults.length} sent`);
      
      return new Response(
        JSON.stringify({ success: true, results: bulkResults, sent: successCount, total: bulkResults.length }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    // ========================================
    // SINGLE EMAIL SENDING (prospect_email, document_envoi, direct_email)
    // ========================================
    if (body && (body.type === "prospect_email" || body.type === "document_envoi" || body.type === "direct_email" || body.to)) {
      console.log("Processing manual email send request:", body.type || "direct");
      
      const recipientEmail = body.to || body.recipientEmail;
      const recipientName = body.recipientName || "";
      const subject = body.subject || "Message de Ecole T3P Montrouge";
      const htmlContent = body.html || body.customMessage || "";
      const documentTypes = body.documentTypes || [];
      
      if (!recipientEmail) {
        return new Response(
          JSON.stringify({ error: "Recipient email is required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      let finalHtml = htmlContent;
      
      // Build HTML for document_envoi type
      if (body.type === "document_envoi" && documentTypes.length > 0) {
        finalHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">📄 Documents envoyés</h2>
            <p>Bonjour${recipientName ? ` ${recipientName}` : ""},</p>
            <p>Nous vous adressons les documents suivants :</p>
            <ul>
              ${documentTypes.map((doc: string) => `<li>${doc}</li>`).join("")}
            </ul>
            ${body.customMessage ? `<p>${body.customMessage}</p>` : ""}
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #888; font-size: 12px;">
              Ecole T3P Montrouge - Centre de formation Taxi, VTC et VMDTR
            </p>
          </div>
        `;
      }
      
      // Build HTML for prospect_email type
      if (body.type === "prospect_email" && !finalHtml.includes("<")) {
        finalHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            ${htmlContent}
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #888; font-size: 12px;">
              Ecole T3P Montrouge - Centre de formation Taxi, VTC et VMDTR
            </p>
          </div>
        `;
      }
      
      try {
        const emailResponse = await resend.emails.send({
          from: EMAIL_CONFIG.FROM,
          to: [recipientEmail],
          subject: subject,
          html: finalHtml,
          reply_to: EMAIL_CONFIG.REPLY_TO,
        });
        
        console.log("Manual email sent successfully:", emailResponse);
        
        // Log to database
        const { error: logError } = await supabase.from("email_logs").insert({
          type: body.type || "manual",
          recipient_email: recipientEmail,
          recipient_name: recipientName,
          subject: subject,
          template_used: body.type || "manual",
          status: "sent",
          resend_id: emailResponse.data?.id,
        });
        if (logError) console.log("Email log insert failed (table may not exist):", logError);
        
        return new Response(
          JSON.stringify({ success: true, id: emailResponse.data?.id }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      } catch (emailError: any) {
        console.error("Failed to send manual email:", emailError);
        
        // Log failed email
        const { error: logError2 } = await supabase.from("email_logs").insert({
          type: body.type || "manual",
          recipient_email: recipientEmail,
          recipient_name: recipientName,
          subject: subject,
          template_used: body.type || "manual",
          status: "failed",
          error_message: emailError.message,
        });
        if (logError2) console.log("Email log insert failed:", logError2);
        
        return new Response(
          JSON.stringify({ error: emailError.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }
    
    // ========================================
    // AUTOMATED EMAILS (cron jobs)
    // ========================================
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // ========================================
    // 1. RELANCES PAIEMENT J-7 (7 jours avant échéance)
    // ========================================
    console.log("Checking for invoices due in 7 days...");
    
    const sevenDaysFromNowPayment = new Date(today);
    sevenDaysFromNowPayment.setDate(sevenDaysFromNowPayment.getDate() + 7);
    const paymentJ7Date = sevenDaysFromNowPayment.toISOString().split("T")[0];

    const { data: upcomingInvoices, error: invoicesError } = await supabase
      .from("factures")
      .select(`
        id,
        numero_facture,
        montant_total,
        date_echeance,
        contact:contacts(id, nom, prenom, email)
      `)
      .in("statut", ["emise", "partiel"])
      .eq("date_echeance", paymentJ7Date);

    if (invoicesError) {
      console.error("Error fetching upcoming invoices:", invoicesError);
    } else if (upcomingInvoices && upcomingInvoices.length > 0) {
      console.log(`Found ${upcomingInvoices.length} invoices due in 7 days`);
      
      for (const invoice of upcomingInvoices) {
        const contact = invoice.contact as any;
        if (!contact?.email) continue;

        const emailSubject = `Rappel : Échéance de paiement dans 7 jours - Facture ${invoice.numero_facture}`;

        try {
          const emailResponse = await resend.emails.send({
            from: EMAIL_CONFIG.FROM,
            to: [contact.email],
            subject: emailSubject,
            reply_to: EMAIL_CONFIG.REPLY_TO,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #f59e0b;">⏰ Rappel de paiement</h2>
                <p>Bonjour ${contact.prenom} ${contact.nom},</p>
                <p>Nous vous rappelons que la facture <strong>${invoice.numero_facture}</strong> 
                   d'un montant de <strong>${Number(invoice.montant_total).toLocaleString("fr-FR")}€</strong> 
                   arrive à échéance le <strong>${new Date(invoice.date_echeance!).toLocaleDateString("fr-FR")}</strong>.</p>
                <p style="color: #f59e0b; font-weight: bold;">L'échéance est dans 7 jours.</p>
                <p>Nous vous remercions de bien vouloir procéder au règlement avant cette date.</p>
                <p>Si vous avez déjà effectué le paiement, veuillez ignorer ce message.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #888; font-size: 12px;">
                  T3P Formation - Centre de formation Taxi, VTC et VMDTR
                </p>
              </div>
            `,
          });

          // Log email to database
          await supabase.from("email_logs").insert({
            type: "payment_reminder_j7",
            recipient_email: contact.email,
            recipient_name: `${contact.prenom} ${contact.nom}`,
            contact_id: contact.id,
            facture_id: invoice.id,
            subject: emailSubject,
            template_used: "payment_reminder_j7",
            status: "sent",
            resend_id: emailResponse.data?.id,
          });

          results.push({
            type: "payment_reminder_j7",
            recipient: contact.email,
            recipientName: `${contact.prenom} ${contact.nom}`,
            contactId: contact.id,
            factureId: invoice.id,
            subject: emailSubject,
            success: true,
            resendId: emailResponse.data?.id,
          });
          console.log(`Payment J-7 reminder sent to ${contact.email} for invoice ${invoice.numero_facture}`);
        } catch (emailError: any) {
          // Log failed email
          await supabase.from("email_logs").insert({
            type: "payment_reminder_j7",
            recipient_email: contact.email,
            recipient_name: `${contact.prenom} ${contact.nom}`,
            contact_id: contact.id,
            facture_id: invoice.id,
            subject: emailSubject,
            template_used: "payment_reminder_j7",
            status: "failed",
            error_message: emailError.message,
          });

          results.push({
            type: "payment_reminder_j7",
            recipient: contact.email,
            subject: emailSubject,
            success: false,
            error: emailError.message,
          });
          console.error(`Failed to send payment reminder to ${contact.email}:`, emailError);
        }
      }
    }

    // ========================================
    // 2. RAPPELS FORMATION J-7
    // ========================================
    console.log("Checking for sessions starting in 7 days...");
    
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const j7Date = sevenDaysFromNow.toISOString().split("T")[0];

    const { data: sessionsJ7, error: sessionsJ7Error } = await supabase
      .from("sessions")
      .select(`
        id,
        nom,
        date_debut,
        date_fin,
        lieu,
        formation_type,
        session_inscriptions(
          id,
          statut,
          contact:contacts(id, nom, prenom, email)
        )
      `)
      .eq("date_debut", j7Date)
      .in("statut", ["a_venir", "complet"]);

    if (sessionsJ7Error) {
      console.error("Error fetching J-7 sessions:", sessionsJ7Error);
    } else if (sessionsJ7 && sessionsJ7.length > 0) {
      console.log(`Found ${sessionsJ7.length} sessions starting in 7 days`);
      
      for (const session of sessionsJ7) {
        const inscriptions = session.session_inscriptions as any[];
        if (!inscriptions) continue;

        for (const inscription of inscriptions) {
          if (inscription.statut !== "inscrit") continue;
          const contact = inscription.contact;
          if (!contact?.email) continue;

          try {
            const emailResponse = await resend.emails.send({
              from: EMAIL_CONFIG.FROM,
              to: [contact.email],
              subject: `Rappel J-7 : Votre formation ${session.nom} approche !`,
              reply_to: EMAIL_CONFIG.REPLY_TO,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #2563eb;">Votre formation commence dans 7 jours !</h2>
                  <p>Bonjour ${contact.prenom} ${contact.nom},</p>
                  <p>Nous vous rappelons que vous êtes inscrit(e) à la formation suivante :</p>
                  <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin: 0 0 10px 0; color: #1e40af;">${session.nom}</h3>
                    <p style="margin: 5px 0;"><strong>Type :</strong> ${session.formation_type}</p>
                    <p style="margin: 5px 0;"><strong>Du :</strong> ${new Date(session.date_debut).toLocaleDateString("fr-FR")} au ${new Date(session.date_fin).toLocaleDateString("fr-FR")}</p>
                    ${session.lieu ? `<p style="margin: 5px 0;"><strong>Lieu :</strong> ${session.lieu}</p>` : ""}
                  </div>
                  <h3>Documents à préparer :</h3>
                  <ul>
                    <li>Pièce d'identité en cours de validité</li>
                    <li>Permis de conduire</li>
                    <li>Photo d'identité (si non fournie)</li>
                  </ul>
                  <p>N'hésitez pas à nous contacter si vous avez des questions.</p>
                  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                  <p style="color: #888; font-size: 12px;">
                    T3P Formation - Centre de formation Taxi, VTC et VMDTR
                  </p>
                </div>
              `,
            });

            await supabase.from("email_logs").insert({
              type: "session_reminder_j7",
              recipient_email: contact.email,
              recipient_name: `${contact.prenom} ${contact.nom}`,
              contact_id: contact.id,
              session_id: session.id,
              subject: `Rappel J-7 : Votre formation ${session.nom} approche !`,
              template_used: "session_reminder_j7",
              status: "sent",
              resend_id: emailResponse.data?.id,
            });

            results.push({
              type: "reminder_j7",
              recipient: contact.email,
              sessionId: session.id,
              success: true,
            });
            console.log(`J-7 reminder sent to ${contact.email} for session ${session.nom}`);
          } catch (emailError: any) {
            results.push({
              type: "reminder_j7",
              recipient: contact.email,
              success: false,
              error: emailError.message,
            });
          }
        }
      }
    }

    // ========================================
    // 3. RAPPELS FORMATION J-1
    // ========================================
    console.log("Checking for sessions starting tomorrow...");
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const j1Date = tomorrow.toISOString().split("T")[0];

    const { data: sessionsJ1, error: sessionsJ1Error } = await supabase
      .from("sessions")
      .select(`
        id,
        nom,
        date_debut,
        date_fin,
        lieu,
        formation_type,
        session_inscriptions(
          id,
          statut,
          contact:contacts(id, nom, prenom, email)
        )
      `)
      .eq("date_debut", j1Date)
      .in("statut", ["a_venir", "complet"]);

    if (sessionsJ1Error) {
      console.error("Error fetching J-1 sessions:", sessionsJ1Error);
    } else if (sessionsJ1 && sessionsJ1.length > 0) {
      console.log(`Found ${sessionsJ1.length} sessions starting tomorrow`);
      
      for (const session of sessionsJ1) {
        const inscriptions = session.session_inscriptions as any[];
        if (!inscriptions) continue;

        for (const inscription of inscriptions) {
          if (inscription.statut !== "inscrit") continue;
          const contact = inscription.contact;
          if (!contact?.email) continue;

          try {
            const emailResponse = await resend.emails.send({
              from: EMAIL_CONFIG.FROM,
              to: [contact.email],
              subject: `C'est demain ! Rappel pour votre formation ${session.nom}`,
              reply_to: EMAIL_CONFIG.REPLY_TO,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #059669;">🎓 Votre formation commence demain !</h2>
                  <p>Bonjour ${contact.prenom} ${contact.nom},</p>
                  <p>Nous vous attendons <strong>demain</strong> pour le début de votre formation :</p>
                  <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
                    <h3 style="margin: 0 0 10px 0; color: #047857;">${session.nom}</h3>
                    <p style="margin: 5px 0;"><strong>📅 Date :</strong> ${new Date(session.date_debut).toLocaleDateString("fr-FR")}</p>
                    ${session.lieu ? `<p style="margin: 5px 0;"><strong>📍 Lieu :</strong> ${session.lieu}</p>` : ""}
                    <p style="margin: 5px 0;"><strong>⏰ Heure :</strong> 9h00 (merci d'arriver 15 minutes avant)</p>
                  </div>
                  <h3>Rappel des documents obligatoires :</h3>
                  <ul>
                    <li>✅ Pièce d'identité en cours de validité</li>
                    <li>✅ Permis de conduire</li>
                    <li>✅ De quoi prendre des notes</li>
                  </ul>
                  <p style="color: #059669; font-weight: bold;">Nous avons hâte de vous accueillir !</p>
                  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                  <p style="color: #888; font-size: 12px;">
                    T3P Formation - Centre de formation Taxi, VTC et VMDTR
                  </p>
                </div>
              `,
            });

            await supabase.from("email_logs").insert({
              type: "session_reminder_j1",
              recipient_email: contact.email,
              recipient_name: `${contact.prenom} ${contact.nom}`,
              contact_id: contact.id,
              session_id: session.id,
              subject: `C'est demain ! Rappel pour votre formation ${session.nom}`,
              template_used: "session_reminder_j1",
              status: "sent",
              resend_id: emailResponse.data?.id,
            });

            results.push({
              type: "reminder_j1",
              recipient: contact.email,
              sessionId: session.id,
              success: true,
            });
            console.log(`J-1 reminder sent to ${contact.email} for session ${session.nom}`);
          } catch (emailError: any) {
            results.push({
              type: "reminder_j1",
              recipient: contact.email,
              success: false,
              error: emailError.message,
            });
          }
        }
      }
    }

    // ========================================
    // 4. RAPPELS EXAMEN T3P J-7
    // ========================================
    console.log("Checking for T3P exams in 7 days...");
    
    const { data: examensT3PJ7, error: examensT3PError } = await supabase
      .from("examens_t3p")
      .select(`
        id,
        date_examen,
        heure_examen,
        centre_examen,
        type_formation,
        numero_tentative,
        contact:contacts(id, nom, prenom, email)
      `)
      .eq("date_examen", j7Date)
      .eq("statut", "planifie");

    if (examensT3PError) {
      console.error("Error fetching T3P exams:", examensT3PError);
    } else if (examensT3PJ7 && examensT3PJ7.length > 0) {
      console.log(`Found ${examensT3PJ7.length} T3P exams in 7 days`);
      
      for (const examen of examensT3PJ7) {
        const contact = examen.contact as any;
        if (!contact?.email) continue;

        const emailSubject = `Rappel : Votre examen T3P ${examen.type_formation} dans 7 jours`;

        try {
          const emailResponse = await resend.emails.send({
            from: EMAIL_CONFIG.FROM,
            to: [contact.email],
            subject: emailSubject,
            reply_to: EMAIL_CONFIG.REPLY_TO,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #7c3aed;">📝 Rappel Examen T3P - J-7</h2>
                <p>Bonjour ${contact.prenom} ${contact.nom},</p>
                <p>Votre examen T3P approche ! Voici les détails :</p>
                <div style="background: #faf5ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7c3aed;">
                  <h3 style="margin: 0 0 10px 0; color: #6d28d9;">Examen T3P - ${examen.type_formation}</h3>
                  <p style="margin: 5px 0;"><strong>📅 Date :</strong> ${new Date(examen.date_examen).toLocaleDateString("fr-FR")}</p>
                  ${examen.heure_examen ? `<p style="margin: 5px 0;"><strong>⏰ Heure :</strong> ${examen.heure_examen}</p>` : ""}
                  ${examen.centre_examen ? `<p style="margin: 5px 0;"><strong>📍 Centre :</strong> ${examen.centre_examen}</p>` : ""}
                  <p style="margin: 5px 0;"><strong>🎯 Tentative n° :</strong> ${examen.numero_tentative}</p>
                </div>
                <h3>Conseils pour réussir :</h3>
                <ul>
                  <li>📖 Révisez les cours théoriques</li>
                  <li>🆔 N'oubliez pas votre pièce d'identité</li>
                  <li>⏰ Arrivez 30 minutes avant l'heure</li>
                  <li>💤 Reposez-vous bien la veille</li>
                </ul>
                <p style="color: #7c3aed; font-weight: bold;">Bonne chance pour votre examen !</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #888; font-size: 12px;">
                  T3P Formation - Centre de formation Taxi, VTC et VMDTR
                </p>
              </div>
            `,
          });

          await supabase.from("email_logs").insert({
            type: "exam_t3p_reminder_j7",
            recipient_email: contact.email,
            recipient_name: `${contact.prenom} ${contact.nom}`,
            contact_id: contact.id,
            subject: emailSubject,
            template_used: "exam_t3p_reminder_j7",
            status: "sent",
            resend_id: emailResponse.data?.id,
            metadata: { examen_id: examen.id, type_formation: examen.type_formation },
          });

          results.push({
            type: "exam_t3p_reminder_j7",
            recipient: contact.email,
            recipientName: `${contact.prenom} ${contact.nom}`,
            contactId: contact.id,
            examenId: examen.id,
            subject: emailSubject,
            success: true,
            resendId: emailResponse.data?.id,
          });
          console.log(`T3P exam J-7 reminder sent to ${contact.email}`);
        } catch (emailError: any) {
          await supabase.from("email_logs").insert({
            type: "exam_t3p_reminder_j7",
            recipient_email: contact.email,
            recipient_name: `${contact.prenom} ${contact.nom}`,
            contact_id: contact.id,
            subject: emailSubject,
            template_used: "exam_t3p_reminder_j7",
            status: "failed",
            error_message: emailError.message,
          });

          results.push({
            type: "exam_t3p_reminder_j7",
            recipient: contact.email,
            success: false,
            error: emailError.message,
          });
          console.error(`Failed to send T3P exam reminder to ${contact.email}:`, emailError);
        }
      }
    }

    // ========================================
    // 5. RAPPELS EXAMEN PRATIQUE J-7
    // ========================================
    console.log("Checking for practical exams in 7 days...");
    
    const { data: examensPratiqueJ7, error: examensPratiqueError } = await supabase
      .from("examens_pratique")
      .select(`
        id,
        date_examen,
        heure_examen,
        centre_examen,
        adresse_centre,
        type_examen,
        numero_tentative,
        contact:contacts(id, nom, prenom, email),
        vehicule:vehicules(immatriculation, marque, modele)
      `)
      .eq("date_examen", j7Date)
      .eq("statut", "planifie");

    if (examensPratiqueError) {
      console.error("Error fetching practical exams:", examensPratiqueError);
    } else if (examensPratiqueJ7 && examensPratiqueJ7.length > 0) {
      console.log(`Found ${examensPratiqueJ7.length} practical exams in 7 days`);
      
      for (const examen of examensPratiqueJ7) {
        const contact = examen.contact as any;
        const vehicule = examen.vehicule as any;
        if (!contact?.email) continue;

        const emailSubject = `Rappel : Votre examen pratique dans 7 jours`;

        try {
          const emailResponse = await resend.emails.send({
            from: EMAIL_CONFIG.FROM,
            to: [contact.email],
            subject: emailSubject,
            reply_to: EMAIL_CONFIG.REPLY_TO,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #0891b2;">🚗 Rappel Examen Pratique - J-7</h2>
                <p>Bonjour ${contact.prenom} ${contact.nom},</p>
                <p>Votre examen pratique approche ! Voici les détails :</p>
                <div style="background: #ecfeff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0891b2;">
                  <h3 style="margin: 0 0 10px 0; color: #0e7490;">Examen Pratique - ${examen.type_examen}</h3>
                  <p style="margin: 5px 0;"><strong>📅 Date :</strong> ${new Date(examen.date_examen).toLocaleDateString("fr-FR")}</p>
                  ${examen.heure_examen ? `<p style="margin: 5px 0;"><strong>⏰ Heure :</strong> ${examen.heure_examen}</p>` : ""}
                  ${examen.centre_examen ? `<p style="margin: 5px 0;"><strong>🏢 Centre :</strong> ${examen.centre_examen}</p>` : ""}
                  ${examen.adresse_centre ? `<p style="margin: 5px 0;"><strong>📍 Adresse :</strong> ${examen.adresse_centre}</p>` : ""}
                  ${vehicule ? `<p style="margin: 5px 0;"><strong>🚗 Véhicule :</strong> ${vehicule.marque} ${vehicule.modele} (${vehicule.immatriculation})</p>` : ""}
                  <p style="margin: 5px 0;"><strong>🎯 Tentative n° :</strong> ${examen.numero_tentative || 1}</p>
                </div>
                <h3>À ne pas oublier :</h3>
                <ul>
                  <li>🆔 Pièce d'identité en cours de validité</li>
                  <li>🪪 Permis de conduire</li>
                  <li>📄 Attestation T3P</li>
                  <li>⏰ Arrivez 30 minutes avant l'heure</li>
                </ul>
                <p style="color: #0891b2; font-weight: bold;">Bonne chance pour votre examen !</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #888; font-size: 12px;">
                  T3P Formation - Centre de formation Taxi, VTC et VMDTR
                </p>
              </div>
            `,
          });

          await supabase.from("email_logs").insert({
            type: "exam_pratique_reminder_j7",
            recipient_email: contact.email,
            recipient_name: `${contact.prenom} ${contact.nom}`,
            contact_id: contact.id,
            subject: emailSubject,
            template_used: "exam_pratique_reminder_j7",
            status: "sent",
            resend_id: emailResponse.data?.id,
            metadata: { examen_id: examen.id, type_examen: examen.type_examen },
          });

          results.push({
            type: "exam_pratique_reminder_j7",
            recipient: contact.email,
            recipientName: `${contact.prenom} ${contact.nom}`,
            contactId: contact.id,
            examenId: examen.id,
            subject: emailSubject,
            success: true,
            resendId: emailResponse.data?.id,
          });
          console.log(`Practical exam J-7 reminder sent to ${contact.email}`);
        } catch (emailError: any) {
          await supabase.from("email_logs").insert({
            type: "exam_pratique_reminder_j7",
            recipient_email: contact.email,
            recipient_name: `${contact.prenom} ${contact.nom}`,
            contact_id: contact.id,
            subject: emailSubject,
            template_used: "exam_pratique_reminder_j7",
            status: "failed",
            error_message: emailError.message,
          });

          results.push({
            type: "exam_pratique_reminder_j7",
            recipient: contact.email,
            success: false,
            error: emailError.message,
          });
          console.error(`Failed to send practical exam reminder to ${contact.email}:`, emailError);
        }
      }
    }

    // ========================================
    // SUMMARY
    // ========================================
    const summary = {
      timestamp: new Date().toISOString(),
      total_emails: results.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      breakdown: {
        payment_reminders_j7: results.filter((r) => r.type === "payment_reminder_j7").length,
        formation_reminders_j7: results.filter((r) => r.type === "reminder_j7").length,
        formation_reminders_j1: results.filter((r) => r.type === "reminder_j1").length,
        exam_t3p_reminders_j7: results.filter((r) => r.type === "exam_t3p_reminder_j7").length,
        exam_pratique_reminders_j7: results.filter((r) => r.type === "exam_pratique_reminder_j7").length,
      },
      details: results,
    };

    console.log("Email automation completed:", JSON.stringify(summary, null, 2));

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in automated emails function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
