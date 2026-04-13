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
import { buildEmailHtml, formatDateFr } from "../_shared/email-template.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// ===============================================
// CONFIGURATION EMAIL PAR DÉFAUT (fallback)
// ===============================================
const DEFAULT_EMAIL_CONFIG = {
  FROM: "Ecole T3P Montrouge <montrouge@ecolet3p.fr>",
  REPLY_TO: "montrouge@ecolet3p.fr",
} as const;

// Resolved at request time from body params or defaults
function resolveEmailConfig(body: any) {
  return {
    FROM: (typeof body?.fromAddress === "string" && body.fromAddress.trim()) ? body.fromAddress.trim() : DEFAULT_EMAIL_CONFIG.FROM,
    REPLY_TO: (typeof body?.replyTo === "string" && body.replyTo.trim()) ? body.replyTo.trim() : DEFAULT_EMAIL_CONFIG.REPLY_TO,
  };
}

/** Build a human-readable time string from sessionInfo fields sent by the client */
function buildHeureDebut(si: Record<string, any>): string | undefined {
  const fmt = (t: string) => {
    const [h, m] = t.split(":");
    return `${h}h${m}`;
  };
  const valid = (t?: string): t is string =>
    !!t && t !== "00:00:00" && t !== "00:00";

  if (valid(si.heure_debut_matin) && valid(si.heure_fin_matin) && valid(si.heure_debut_aprem) && valid(si.heure_fin_aprem)) {
    return `${fmt(si.heure_debut_matin)} - ${fmt(si.heure_fin_matin)} / ${fmt(si.heure_debut_aprem)} - ${fmt(si.heure_fin_aprem)}`;
  }
  if (valid(si.heure_debut_matin) && valid(si.heure_fin_matin)) {
    return `${fmt(si.heure_debut_matin)} - ${fmt(si.heure_fin_matin)}`;
  }
  if (valid(si.heure_debut) && valid(si.heure_fin)) {
    return `${fmt(si.heure_debut)} - ${fmt(si.heure_fin)}`;
  }
  if (valid(si.heure_debut)) {
    return fmt(si.heure_debut);
  }
  return undefined;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
  
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  
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
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const results: EmailResult[] = [];

  try {
    const body = await req.json().catch(() => null);
    const EMAIL_CONFIG = resolveEmailConfig(body);
    
    // ========================================
    // BULK EMAIL SENDING (with recipients array)
    // ========================================
    if (body && body.recipients && Array.isArray(body.recipients) && body.recipients.length > 0) {
      console.log("Processing bulk email send request:", body.type, "recipients:", body.recipients.length);
      
      const documentType = body.documentType || "Document";
      const sessionName = body.sessionName || "";
      const sessionInfo = body.sessionInfo || {};
      const customMessage = body.customMessage || "";
      const generatePdfAttachments = body.generateAttachments !== false;
      
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
            qualiopi_numero: centreFormation.qualiopi_numero || undefined,
          };
        }
      } catch (e) {
        console.log("Could not fetch centre formation:", e);
      }
      
      const company: CompanyInfo = centreData || {
        name: "Ecole T3P Montrouge",
        address: "Montrouge",
        phone: "01 23 45 67 89",
        email: "montrouge@ecolet3p.fr",
        siret: "123 456 789 00012",
        nda: "11 75 12345 75",
      };
      
      const bulkResults: EmailResult[] = [];
      
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
        "Convention de formation": "convention",
        "convention": "convention",
        "Convention": "convention",
        "Règlement intérieur": "reglement",
        "reglement": "reglement",
        "Reglement": "reglement",
      };
      
      for (const recipient of body.recipients) {
        if (!recipient.email) continue;
        
        const recipientName = recipient.name || "";
        const subject = `${documentType} - ${sessionName || 'Ecole T3P Montrouge'}`;
        
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
        
        if (!contactData) {
          const nameParts = recipientName.split(" ");
          contactData = {
            nom: nameParts.slice(1).join(" ") || "Participant",
            prenom: nameParts[0] || "",
            email: recipient.email,
          };
        }
        
        const sessionDataForPdf: SessionInfo = {
          nom: sessionName || "Formation",
          formation_type: sessionInfo.formation_type || "VTC",
          date_debut: sessionInfo.date_debut || new Date().toISOString(),
          date_fin: sessionInfo.date_fin || new Date().toISOString(),
          lieu: sessionInfo.lieu || undefined,
          duree_heures: sessionInfo.duree_heures || 35,
          heure_debut: sessionInfo.heure_debut || undefined,
          heure_fin: sessionInfo.heure_fin || undefined,
          heure_debut_matin: sessionInfo.heure_debut_matin || undefined,
          heure_fin_matin: sessionInfo.heure_fin_matin || undefined,
          heure_debut_aprem: sessionInfo.heure_debut_aprem || undefined,
          heure_fin_aprem: sessionInfo.heure_fin_aprem || undefined,
          formateur: sessionInfo.formateur || undefined,
          adresse_rue: sessionInfo.adresse_rue || undefined,
          adresse_code_postal: sessionInfo.adresse_code_postal || undefined,
          adresse_ville: sessionInfo.adresse_ville || undefined,
        };
        
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
            
            logPdfDiagnostic(`Génération ${pdfType}`, filename, pdfBase64);
            
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
            
            continue;
          }
        }
        
        // Build professional email using shared template
        const htmlContent = buildEmailHtml({
          title: `📄 ${documentType}`,
          recipientName,
          bodyHtml: `
            <p style="margin: 0 0 12px 0;">Nous vous adressons le document <strong>${documentType}</strong>${sessionName ? ` concernant votre formation <strong>${sessionName}</strong>` : ""}.</p>
            ${customMessage ? `<p style="margin: 0 0 12px 0;">${customMessage}</p>` : ""}
            <p style="margin: 0 0 12px 0;">Si vous avez des questions, n'hésitez pas à nous contacter.</p>
          `,
          sessionInfo: sessionInfo.date_debut ? {
            nom: sessionName,
            formationType: sessionInfo.formation_type,
            dateDebut: formatDateFr(sessionInfo.date_debut),
            dateFin: sessionInfo.date_fin ? formatDateFr(sessionInfo.date_fin) : undefined,
            lieu: sessionInfo.lieu,
            heureDebut: buildHeureDebut(sessionInfo),
          } : undefined,
          attachmentNames: validatedAttachments.map(a => `${a.filename} (${Math.round(a.sizeBytes / 1024)} Ko)`),
        });
        
        try {
          const emailPayload: any = {
            from: EMAIL_CONFIG.FROM,
            to: [recipient.email],
            subject: subject,
            html: htmlContent,
            reply_to: EMAIL_CONFIG.REPLY_TO,
          };
          
          if (validatedAttachments.length > 0) {
            emailPayload.attachments = validatedAttachments.map(a => ({
              filename: a.filename,
              content: a.content,
              content_type: "application/pdf",
            }));
          }
          
          const emailResponse = await resend.emails.send(emailPayload);
          
          console.log(`[EMAIL-SENT] ${recipient.email}: ${emailResponse.data?.id}`);
          
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
      
      let finalHtml = "";
      
      // Build HTML for document_envoi type
      if (body.type === "document_envoi" && documentTypes.length > 0) {
        finalHtml = buildEmailHtml({
          title: "📄 Documents envoyés",
          recipientName,
          bodyHtml: `
            <p style="margin: 0 0 12px 0;">Nous vous adressons les documents suivants :</p>
            <ul style="margin: 0 0 16px 0; padding-left: 20px;">
              ${documentTypes.map((doc: string) => `<li style="margin-bottom: 4px;">${doc}</li>`).join("")}
            </ul>
            ${body.customMessage ? `<p style="margin: 0 0 12px 0;">${body.customMessage}</p>` : ""}
            <p style="margin: 0;">Si vous avez des questions, n'hésitez pas à nous contacter.</p>
          `,
        });
      } else if (body.type === "prospect_email" && !htmlContent.includes("<")) {
        // Plain text prospect email → wrap in template
        finalHtml = buildEmailHtml({
          title: "✉️ Message",
          recipientName,
          bodyHtml: `<p style="margin: 0; white-space: pre-line;">${htmlContent}</p>`,
        });
      } else if (body.type === "direct_email" || body.to) {
        // Direct email with custom HTML → wrap in template
        finalHtml = buildEmailHtml({
          title: subject.includes("Relance") ? "💰 Relance paiement" : "✉️ Message",
          accentColor: subject.includes("Relance") ? "#d97706" : "#1B4D3E",
          recipientName,
          showGreeting: false,
          bodyHtml: htmlContent,
        });
      } else {
        finalHtml = buildEmailHtml({
          title: "✉️ Message",
          recipientName,
          bodyHtml: htmlContent,
        });
      }
      
      try {
        const emailPayload: any = {
          from: EMAIL_CONFIG.FROM,
          to: [recipientEmail],
          subject: subject,
          html: finalHtml,
          reply_to: EMAIL_CONFIG.REPLY_TO,
        };
        
        // Support attachments passed from client (base64 encoded)
        if (body.attachments && Array.isArray(body.attachments) && body.attachments.length > 0) {
          emailPayload.attachments = body.attachments.map((att: any) => {
            // Decode base64 string to Uint8Array for Resend SDK
            const binaryStr = atob(att.content);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) {
              bytes[i] = binaryStr.charCodeAt(i);
            }
            return {
              filename: att.filename || "document.pdf",
              content: bytes,
              content_type: att.content_type || att.type || "application/pdf",
            };
          });
          console.log(`[EMAIL] Adding ${body.attachments.length} attachment(s) to single email, sizes: ${emailPayload.attachments.map((a: any) => a.content.length + ' bytes').join(', ')}`);
        }
        
        const emailResponse = await resend.emails.send(emailPayload);
        
        console.log("Manual email sent successfully:", emailResponse);
        
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
    // 1. RELANCES PAIEMENT J-7
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
          const emailHtml = buildEmailHtml({
            title: "⏰ Rappel de paiement",
            accentColor: "#d97706",
            recipientName: `${contact.prenom} ${contact.nom}`,
            bodyHtml: `
              <p style="margin: 0 0 12px 0;">Nous vous rappelons que la facture <strong>${invoice.numero_facture}</strong> 
                 d'un montant de <strong>${Number(invoice.montant_total).toLocaleString("fr-FR")}€</strong> 
                 arrive à échéance le <strong>${formatDateFr(invoice.date_echeance!)}</strong>.</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0;">
                <tr>
                  <td style="background-color: #fef3c7; border-left: 4px solid #d97706; border-radius: 6px; padding: 14px 18px;">
                    <p style="margin: 0; font-weight: 700; color: #92400e;">L'échéance est dans 7 jours.</p>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 12px 0;">Nous vous remercions de bien vouloir procéder au règlement avant cette date.</p>
              <p style="margin: 0; color: #888;">Si vous avez déjà effectué le paiement, veuillez ignorer ce message.</p>
            `,
          });

          const emailResponse = await resend.emails.send({
            from: EMAIL_CONFIG.FROM,
            to: [contact.email],
            subject: emailSubject,
            reply_to: EMAIL_CONFIG.REPLY_TO,
            html: emailHtml,
          });

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
            const emailHtml = buildEmailHtml({
              title: "🎓 Rappel de formation — J-7",
              accentColor: "#2563eb",
              recipientName: `${contact.prenom} ${contact.nom}`,
              bodyHtml: `
                <p style="margin: 0 0 12px 0;">Nous vous rappelons que vous êtes inscrit(e) à la formation suivante :</p>
                <h3 style="margin: 18px 0 10px 0; color: #333;">Documents à préparer :</h3>
                <ul style="margin: 0; padding-left: 20px;">
                  <li style="margin-bottom: 4px;">Pièce d'identité en cours de validité</li>
                  <li style="margin-bottom: 4px;">Permis de conduire</li>
                  <li style="margin-bottom: 4px;">Photo d'identité (si non fournie)</li>
                </ul>
                <p style="margin: 16px 0 0 0;">N'hésitez pas à nous contacter si vous avez des questions.</p>
              `,
              sessionInfo: {
                nom: session.nom,
                formationType: session.formation_type,
                dateDebut: formatDateFr(session.date_debut),
                dateFin: formatDateFr(session.date_fin),
                lieu: session.lieu || undefined,
              },
            });

            const emailResponse = await resend.emails.send({
              from: EMAIL_CONFIG.FROM,
              to: [contact.email],
              subject: `Rappel J-7 : Votre formation ${session.nom} approche !`,
              reply_to: EMAIL_CONFIG.REPLY_TO,
              html: emailHtml,
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
            const emailHtml = buildEmailHtml({
              title: "🎓 C'est demain !",
              accentColor: "#059669",
              recipientName: `${contact.prenom} ${contact.nom}`,
              bodyHtml: `
                <p style="margin: 0 0 12px 0;">Nous vous attendons <strong>demain</strong> pour le début de votre formation :</p>
                <h3 style="margin: 18px 0 10px 0; color: #333;">Rappel des documents obligatoires :</h3>
                <ul style="margin: 0; padding-left: 20px;">
                  <li style="margin-bottom: 4px;">✅ Pièce d'identité en cours de validité</li>
                  <li style="margin-bottom: 4px;">✅ Permis de conduire</li>
                  <li style="margin-bottom: 4px;">✅ De quoi prendre des notes</li>
                </ul>
                <p style="margin: 16px 0 0 0; color: #059669; font-weight: bold;">Nous avons hâte de vous accueillir !</p>
              `,
              sessionInfo: {
                nom: session.nom,
                formationType: session.formation_type,
                dateDebut: formatDateFr(session.date_debut),
                lieu: session.lieu || undefined,
                heureDebut: "9h00 (merci d'arriver 15 minutes avant)",
              },
            });

            const emailResponse = await resend.emails.send({
              from: EMAIL_CONFIG.FROM,
              to: [contact.email],
              subject: `C'est demain ! Rappel pour votre formation ${session.nom}`,
              reply_to: EMAIL_CONFIG.REPLY_TO,
              html: emailHtml,
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
          const emailHtml = buildEmailHtml({
            title: "📝 Rappel Examen T3P — J-7",
            accentColor: "#7c3aed",
            recipientName: `${contact.prenom} ${contact.nom}`,
            bodyHtml: `
              <p style="margin: 0 0 12px 0;">Votre examen T3P approche ! Voici les détails :</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0;">
                <tr>
                  <td style="background-color: #faf5ff; border-left: 4px solid #7c3aed; border-radius: 6px; padding: 18px 20px;">
                    <p style="margin: 0 0 6px 0; font-weight: 700; color: #6d28d9;">Examen T3P — ${examen.type_formation}</p>
                    <p style="margin: 0 0 4px 0; font-size: 13px; color: #555;"><strong>📅 Date :</strong> ${formatDateFr(examen.date_examen)}</p>
                    ${examen.heure_examen ? `<p style="margin: 0 0 4px 0; font-size: 13px; color: #555;"><strong>⏰ Heure :</strong> ${examen.heure_examen}</p>` : ""}
                    ${examen.centre_examen ? `<p style="margin: 0 0 4px 0; font-size: 13px; color: #555;"><strong>📍 Centre :</strong> ${examen.centre_examen}</p>` : ""}
                    <p style="margin: 0; font-size: 13px; color: #555;"><strong>🎯 Tentative n° :</strong> ${examen.numero_tentative}</p>
                  </td>
                </tr>
              </table>
              <h3 style="margin: 18px 0 10px 0; color: #333;">Conseils pour réussir :</h3>
              <ul style="margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 4px;">📖 Révisez les cours théoriques</li>
                <li style="margin-bottom: 4px;">🆔 N'oubliez pas votre pièce d'identité</li>
                <li style="margin-bottom: 4px;">⏰ Arrivez 30 minutes avant l'heure</li>
                <li style="margin-bottom: 4px;">💤 Reposez-vous bien la veille</li>
              </ul>
              <p style="margin: 16px 0 0 0; color: #7c3aed; font-weight: bold;">Bonne chance pour votre examen !</p>
            `,
          });

          const emailResponse = await resend.emails.send({
            from: EMAIL_CONFIG.FROM,
            to: [contact.email],
            subject: emailSubject,
            reply_to: EMAIL_CONFIG.REPLY_TO,
            html: emailHtml,
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
          const emailHtml = buildEmailHtml({
            title: "🚗 Rappel Examen Pratique — J-7",
            accentColor: "#0891b2",
            recipientName: `${contact.prenom} ${contact.nom}`,
            bodyHtml: `
              <p style="margin: 0 0 12px 0;">Votre examen pratique approche ! Voici les détails :</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0;">
                <tr>
                  <td style="background-color: #ecfeff; border-left: 4px solid #0891b2; border-radius: 6px; padding: 18px 20px;">
                    <p style="margin: 0 0 6px 0; font-weight: 700; color: #0e7490;">Examen Pratique — ${examen.type_examen}</p>
                    <p style="margin: 0 0 4px 0; font-size: 13px; color: #555;"><strong>📅 Date :</strong> ${formatDateFr(examen.date_examen)}</p>
                    ${examen.heure_examen ? `<p style="margin: 0 0 4px 0; font-size: 13px; color: #555;"><strong>⏰ Heure :</strong> ${examen.heure_examen}</p>` : ""}
                    ${examen.centre_examen ? `<p style="margin: 0 0 4px 0; font-size: 13px; color: #555;"><strong>🏢 Centre :</strong> ${examen.centre_examen}</p>` : ""}
                    ${examen.adresse_centre ? `<p style="margin: 0 0 4px 0; font-size: 13px; color: #555;"><strong>📍 Adresse :</strong> ${examen.adresse_centre}</p>` : ""}
                    ${vehicule ? `<p style="margin: 0 0 4px 0; font-size: 13px; color: #555;"><strong>🚗 Véhicule :</strong> ${vehicule.marque} ${vehicule.modele} (${vehicule.immatriculation})</p>` : ""}
                    <p style="margin: 0; font-size: 13px; color: #555;"><strong>🎯 Tentative n° :</strong> ${examen.numero_tentative || 1}</p>
                  </td>
                </tr>
              </table>
              <h3 style="margin: 18px 0 10px 0; color: #333;">À ne pas oublier :</h3>
              <ul style="margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 4px;">🆔 Pièce d'identité en cours de validité</li>
                <li style="margin-bottom: 4px;">🪪 Permis de conduire</li>
                <li style="margin-bottom: 4px;">📄 Attestation T3P</li>
                <li style="margin-bottom: 4px;">⏰ Arrivez 30 minutes avant l'heure</li>
              </ul>
              <p style="margin: 16px 0 0 0; color: #0891b2; font-weight: bold;">Bonne chance pour votre examen !</p>
            `,
          });

          const emailResponse = await resend.emails.send({
            from: EMAIL_CONFIG.FROM,
            to: [contact.email],
            subject: emailSubject,
            reply_to: EMAIL_CONFIG.REPLY_TO,
            html: emailHtml,
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
