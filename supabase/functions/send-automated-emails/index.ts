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
import { cronSecretMatches } from "../_shared/cron-auth.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// ===============================================
// INTERRUPTEURS DE LA CAMPAGNE AUTOMATIQUE QUOTIDIENNE
// ===============================================
// Décision du DIRECTEUR (Karim), le 10/09/2026, avant le redéploiement de cette
// fonction (muette depuis le 14/01/2026 — détail dans supabase/CRON_JOBS.md) :
//   « Pour les mails de relance automatique de paiement je veux pas les activer
//     maintenant car je sais que c'est pas encore optimal de notre côté. »
//   « Faut allumer uniquement les rappels de formations et d'examen. »
// MOTIF de l'extinction de la relance de paiement : le processus de relance
// n'est pas encore au point côté centre.
//
// Un bloc à `false` est sauté INTÉGRALEMENT : aucune requête à la base, aucun
// appel à Resend, aucune écriture dans `email_logs`. Le résumé JSON le déclare
// `actif: false` — à ne pas confondre avec un bloc allumé sans destinataire.
//
// RALLUMER UN BLOC = passer sa ligne ci-dessous de `false` à `true`, puis faire
// redéployer la fonction par l'agent Lovable (le sync GitHub ne déploie pas les
// edge functions).
//
// PORTÉE : la campagne automatique (voie `x-cron-secret`) UNIQUEMENT. Les envois
// MANUELS du CRM (devis, facture, lien Alma, documents de session — 13 écrans)
// passent par les branches `recipients` et `to`/`type`, qui ne consultent jamais
// ces interrupteurs.
const BLOCS_AUTOMATIQUES_ACTIFS = {
  /** Relance de paiement J-7 — factures « emise »/« partiel » échéant dans 7 jours. */
  relance_paiement_j7: false,
  /** Rappel de formation J-7 — sessions « a_venir »/« complet » démarrant dans 7 jours. */
  rappel_formation_j7: true,
  /** Rappel de formation J-1 — sessions « a_venir »/« complet » démarrant demain. */
  rappel_formation_j1: true,
  /** Rappel d'examen pratique J-7 — examens « planifie » dans 7 jours. */
  rappel_examen_pratique_j7: true,
} as const;

/** Motif porté par le résumé JSON pour chaque bloc éteint. */
const MOTIFS_EXTINCTION: Partial<
  Record<keyof typeof BLOCS_AUTOMATIQUES_ACTIFS, string>
> = {
  relance_paiement_j7:
    "éteint le 10/09/2026 sur décision du directeur : le processus de relance " +
    "n'est pas encore au point côté centre",
};

// ===============================================
// QUI REÇOIT UN RAPPEL DE FORMATION
// ===============================================
// Raisonnement par EXCLUSION, et non par liste blanche : `session_inscriptions.statut`
// est du TEXTE LIBRE (ni enum, ni contrainte CHECK, ni NOT NULL), donc une liste
// blanche y devient fausse EN SILENCE dès qu'un écran écrit une valeur de plus —
// aucune erreur, juste des apprenants qui cessent d'être servis. C'est ce qui se
// passait ici : `statut !== "inscrit"` écartait 344 des 388 inscriptions actives
// du 10/09/2026 (`valide` 321, `encours` 16, `document` 7), plus toutes les
// inscriptions express, qui naissent en `en_attente`
// (`src/components/contacts/ExpressEnrollmentDialog.tsx`) — et `inscrit` n'est
// même pas une valeur proposée par l'IHM (`inscrits-types.ts`).
// Même exclusion que `send-daily-report`, pour que les deux fonctions comptent
// la même population.
const STATUTS_INSCRIPTION_SANS_RAPPEL = ["annule", "report"];

/**
 * Un statut vide ou inconnu reçoit son rappel : mieux vaut un rappel de trop
 * qu'un apprenant oublié devant une porte close. Une inscription mise à la
 * corbeille (`deleted_at`), elle, n'en reçoit jamais.
 */
function inscriptionRecoitRappel(inscription: {
  statut?: string | null;
  deleted_at?: string | null;
}): boolean {
  if (inscription.deleted_at) return false;
  const statut = (inscription.statut ?? "").trim().toLowerCase();
  return !STATUTS_INSCRIPTION_SANS_RAPPEL.includes(statut);
}

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

/**
 * « 08:30:00 » → « 08h30 ». Rend `undefined` pour une heure absente ou à minuit
 * (`00:00:00` est la valeur d'un champ jamais renseigné, pas un vrai horaire).
 * Même convention que `send-convocation-cron` : les deux emails parlant de la
 * MÊME session doivent annoncer le même horaire, à la minute et au format près.
 */
function fmtHeure(t?: string | null): string | undefined {
  if (!t || t === "00:00:00" || t === "00:00") return undefined;
  const [h, m] = t.split(":");
  return `${h}h${m}`;
}

/**
 * Horaire lisible d'une session, construit par ORDRE DE PRÉCISION décroissante :
 * journée coupée (matin + après-midi), demi-journée, plage simple, heure de début
 * seule. Rend `undefined` quand AUCUNE colonne d'horaire n'est renseignée — un
 * appelant ne doit alors annoncer aucune heure plutôt qu'en inventer une.
 *
 * Accepte indifféremment une ligne `sessions` (voie automatique) ou le
 * `sessionInfo` envoyé par le CRM (voie manuelle) : mêmes noms de colonnes.
 */
function buildHeureDebut(si: Record<string, any>): string | undefined {
  const dm = fmtHeure(si.heure_debut_matin), fm = fmtHeure(si.heure_fin_matin);
  const da = fmtHeure(si.heure_debut_aprem), fa = fmtHeure(si.heure_fin_aprem);
  if (dm && fm && da && fa) return `${dm} - ${fm} / ${da} - ${fa}`;
  if (dm && fm) return `${dm} - ${fm}`;
  const d = fmtHeure(si.heure_debut), f = fmtHeure(si.heure_fin);
  if (d && f) return `${d} - ${f}`;
  return d;
}

/**
 * Ce que le rappel J-1 annonce dans le champ « ⏰ Heure ».
 *
 * Un horaire FAUX est pire que pas d'horaire : l'apprenant se présente au mauvais
 * moment. Tant que la session porte un horaire, on l'annonce ; sinon on renvoie à
 * la convocation, seul document qui fasse foi.
 */
function heureRappelJ1(session: Record<string, any>): string {
  const horaire = buildHeureDebut(session);
  return horaire
    ? `${horaire} (merci d'arriver 15 minutes avant)`
    : "Consultez votre convocation pour l'horaire exact";
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
  /** Envoi volontairement non effectué (déjà parti aujourd'hui). */
  skipped?: boolean;
  /** "already_sent" | "dry_run" — motif d'un envoi non effectué. */
  reason?: string;
  error?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Deux voies d'authentification. Le job pg_cron `daily-automated-emails`
  // envoie l'en-tete x-cron-secret : il n'a pas de session utilisateur, et la
  // cle anon qu'il portait echouait sur getUser (401 systematique, aucun email
  // automatique envoye). Le CRM, lui, envoie le JWT de l'utilisateur connecte.
  // Variante STRICTE volontaire : sans CRON_SECRET configure, la voie cron est
  // refusee (cette fonction est en verify_jwt = false).
  const viaCron = cronSecretMatches(req);

  if (!viaCron) {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Missing or invalid Authorization header' }), 
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

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
    
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const results: EmailResult[] = [];

  try {
    const body = await req.json().catch(() => null);

    // Mode simulation du chemin automatique : `?dryRun=true` ou `{ dryRun: true }`
    // — même convention que send-convocation-cron et signature-reminders.
    // Aucun appel Resend, aucune écriture dans email_logs : c'est ce qui rend
    // vérifiable l'étape 3 de la procédure d'activation de CRON_JOBS.md.
    const dryRun =
      new URL(req.url).searchParams.get("dryRun") === "true" || !!body?.dryRun;

    // ========================================
    // CHEMINS EXCLUSIFS : cron ⟂ envoi manuel
    // ========================================
    // Voie cron (x-cron-secret) : SEULE la campagne automatique est autorisée.
    // Sans cette garde, quiconque détient le secret pourrait envoyer un email
    // arbitraire — pièces jointes et BCC libres — depuis l'adresse du centre,
    // via les deux branches manuelles ci-dessous.
    if (viaCron && body && (body.recipients !== undefined || body.to !== undefined || body.type !== undefined)) {
      console.warn("[AUTO-EMAILS] appel cron portant un corps d'envoi manuel : refusé");
      return new Response(
        JSON.stringify({
          error:
            "Forbidden - la voie cron (x-cron-secret) n'autorise que la campagne " +
            "automatique quotidienne. Un envoi manuel (recipients / to / type) exige " +
            "un JWT admin ou staff.",
        }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Identité d'expédition : la voie cron n'a pas le droit de la surcharger
    // (fromAddress / replyTo ne sont lus que d'un appel authentifié du CRM).
    const EMAIL_CONFIG = viaCron ? DEFAULT_EMAIL_CONFIG : resolveEmailConfig(body);
    
    // ========================================
    // BULK EMAIL SENDING (with recipients array)
    // ========================================
    if (!viaCron && body && body.recipients && Array.isArray(body.recipients) && body.recipients.length > 0) {
      console.log("Processing bulk email send request:", body.type, "recipients:", body.recipients.length);
      
      const documentType = body.documentType || "Document";
      const sessionName = body.sessionName || "";
      const sessionInfo = body.sessionInfo || {};
      const customMessage = body.customMessage || "";
      const generatePdfAttachments = body.generateAttachments !== false;
      
      let centreData: CompanyInfo | null = null;
      try {
        const { data: centreFormation, error: centreError } = await supabase
          .from("centre_formation")
          .select("*")
          .limit(1)
          .single();

        if (centreError) {
          console.error(
            "[PDF-GEN] Lecture de centre_formation en échec :",
            centreError.message
          );
        } else if (!centreFormation) {
          console.error(
            "[PDF-GEN] centre_formation ne renvoie aucune ligne : identité du centre inconnue."
          );
        }
        
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
        console.error("[PDF-GEN] Lecture de centre_formation impossible :", e);
      }
      
      // AUCUNE IDENTITÉ DE REPLI INVENTÉE.
      // Jusqu'au 10/09/2026, l'absence de ligne dans `centre_formation` faisait
      // basculer sur un centre FICTIF (SIRET « 123 456 789 00012 », NDA
      // « 11 75 12345 75 ») qui alimentait la génération des PDF joints : des
      // mentions légales FAUSSES sur des documents contractuels (convocation,
      // attestation, contrat, convention) envoyés à de vrais candidats.
      // Désormais : pas de centre lisible ⇒ pas de PDF, et l'envoi échoue
      // bruyamment (voir la garde ci-dessous) plutôt que de produire un faux.
      const company: CompanyInfo | null = centreData;
      
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

      // Résolus une seule fois : ils ne dépendent que du corps de la requête.
      const pdfType = pdfDocTypes[documentType];
      const wantsPdfAttachment = generatePdfAttachments && !!pdfType;

      // Garde : un document officiel ne part JAMAIS avec une identité inventée.
      if (wantsPdfAttachment && !company) {
        const message =
          "Identité du centre indisponible (table centre_formation vide ou illisible) : " +
          "génération des PDF impossible. Aucun email n'a été envoyé — un document " +
          "officiel ne doit jamais porter une identité légale inventée.";
        console.error(`[PDF-GEN] ❌ ${message}`);
        return new Response(
          JSON.stringify({
            error: message,
            code: "centre_formation_indisponible",
            sent: 0,
            total: body.recipients.length,
          }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
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
        // `pdfType` et `wantsPdfAttachment` : résolus avant la boucle.
        
        if (wantsPdfAttachment && company && contactData) {
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
        
        if (wantsPdfAttachment) {
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
    if (!viaCron && body && (body.type === "prospect_email" || body.type === "document_envoi" || body.type === "direct_email" || body.to)) {
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

        // Support BCC recipients (used by CRM composer in BCC mode)
        if (body.bcc && Array.isArray(body.bcc) && body.bcc.length > 0) {
          emailPayload.bcc = body.bcc.filter((e: any) => typeof e === "string" && e.includes("@"));
        }
        
        
        // Support attachments passed from client (base64 encoded)
        // IMPORTANT: Resend HTTP API expects `content` as a base64 STRING (not Uint8Array).
        // Passing a typed array gets JSON-serialized to an object and the attachment ends up empty.
        if (body.attachments && Array.isArray(body.attachments) && body.attachments.length > 0) {
          emailPayload.attachments = body.attachments
            .filter((att: any) => att && typeof att.content === "string" && att.content.length > 0)
            .map((att: any) => ({
              filename: att.filename || "document.pdf",
              content: att.content, // base64 string — Resend decodes it server-side
              content_type: att.content_type || att.type || "application/pdf",
            }));
          console.log(`[EMAIL] Adding ${emailPayload.attachments.length} attachment(s) to single email, base64 sizes: ${emailPayload.attachments.map((a: any) => a.content.length + ' chars').join(', ')}`);
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
    
    // Appel authentifié (JWT admin/staff) dont le corps ne correspond à aucune
    // branche d'envoi manuel : erreur explicite plutôt que le déclenchement
    // silencieux de la campagne quotidienne.
    if (!viaCron) {
      return new Response(
        JSON.stringify({
          error:
            "corps de requête non reconnu — attendu { recipients: [...] } pour un envoi " +
            "en lot, ou { to, subject, html } / { type: 'prospect_email' | 'document_envoi' " +
            "| 'direct_email' } pour un envoi unitaire. La campagne automatique quotidienne " +
            "n'est déclenchable que par le job pg_cron (en-tête x-cron-secret).",
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ========================================
    // AUTOMATED EMAILS (cron jobs)
    // ========================================
    // À partir d'ici viaCron est vrai : seul le job pg_cron parvient jusqu'ici.
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fenêtre « journée en cours » pour la déduplication. Le runtime des edge
    // functions est en UTC, comme tous les calculs de dates de ce fichier.
    const dayStartIso = today.toISOString();
    const dayEndIso = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString();

    /**
     * Déduplication : un email automatique déjà parti aujourd'hui pour ce
     * contact ne repart pas — sans quoi deux appels le même jour renvoient
     * tout en double. Motif documenté dans CLAUDE.md (« traçage systématique
     * dans email_logs ») et implémenté par signature-reminders.
     *
     * `refine` ajoute la clé métier du bloc (facture, session, examen) : sans
     * elle, deux échéances distinctes tombant le même jour pour un même
     * contact s'annuleraient mutuellement.
     *
     * Seuls les envois réussis (status='sent') bloquent : un échec doit rester
     * rejouable. Et en cas d'erreur de lecture on laisse passer (fail-open) —
     * une panne de SELECT ne doit pas couper toute la campagne.
     */
    async function alreadySentToday(
      type: string,
      contactId: string | null | undefined,
      refine?: (q: any) => any,
    ): Promise<boolean> {
      if (!contactId) return false;
      let q = supabase
        .from("email_logs")
        .select("id")
        .eq("type", type)
        .eq("contact_id", contactId)
        .eq("status", "sent")
        .gte("created_at", dayStartIso)
        .lt("created_at", dayEndIso);
      if (refine) q = refine(q);
      const { data, error } = await q.limit(1);
      if (error) {
        console.error(`[DEDUP] vérification ${type} / ${contactId} impossible :`, error);
        return false;
      }
      return !!data && data.length > 0;
    }
    
    // Dates cibles de la campagne, calculées une fois AVANT les interrupteurs :
    // `j7Date` sert au rappel de formation J-7 ET au rappel d'examen pratique
    // J-7 — éteindre un bloc ne doit pas priver un autre bloc de sa date.
    const dansSeptJours = new Date(today);
    dansSeptJours.setDate(dansSeptJours.getDate() + 7);
    const j7Date = dansSeptJours.toISOString().split("T")[0];

    const demain = new Date(today);
    demain.setDate(demain.getDate() + 1);
    const j1Date = demain.toISOString().split("T")[0];

    // ========================================
    // 1. RELANCES PAIEMENT J-7
    // ========================================
    // Interrupteur du bloc : voir BLOCS_AUTOMATIQUES_ACTIFS en tête de fichier.
    // ÉTEINT le 10/09/2026 — la table `factures` n'est même pas interrogée.
    if (BLOCS_AUTOMATIQUES_ACTIFS.relance_paiement_j7) {
      console.log("Checking for invoices due in 7 days...");
    
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
        .eq("date_echeance", j7Date);

      if (invoicesError) {
        console.error("Error fetching upcoming invoices:", invoicesError);
      } else if (upcomingInvoices && upcomingInvoices.length > 0) {
        console.log(`Found ${upcomingInvoices.length} invoices due in 7 days`);
      
        for (const invoice of upcomingInvoices) {
          const contact = invoice.contact as any;
          if (!contact?.email) continue;

          const emailSubject = `Rappel : Échéance de paiement dans 7 jours - Facture ${invoice.numero_facture}`;

          if (await alreadySentToday("payment_reminder_j7", contact.id, (q) => q.eq("facture_id", invoice.id))) {
            results.push({
              type: "payment_reminder_j7",
              recipient: contact.email,
              recipientName: `${contact.prenom} ${contact.nom}`,
              contactId: contact.id,
              factureId: invoice.id,
              subject: emailSubject,
              success: true,
              skipped: true,
              reason: "already_sent",
            });
            console.log(`Payment J-7 reminder déjà envoyé aujourd'hui à ${contact.email} (facture ${invoice.numero_facture})`);
            continue;
          }

          if (dryRun) {
            results.push({
              type: "payment_reminder_j7",
              recipient: contact.email,
              recipientName: `${contact.prenom} ${contact.nom}`,
              contactId: contact.id,
              factureId: invoice.id,
              subject: emailSubject,
              success: true,
              reason: "dry_run",
            });
            continue;
          }

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
    } else {
      console.log(
        "[AUTO-EMAILS] bloc relance_paiement_j7 ÉTEINT : aucune lecture de `factures`, aucun envoi.",
      );
    }

    // ========================================
    // 2. RAPPELS FORMATION J-7
    // ========================================
    // Interrupteur du bloc : voir BLOCS_AUTOMATIQUES_ACTIFS en tête de fichier.
    if (BLOCS_AUTOMATIQUES_ACTIFS.rappel_formation_j7) {
      console.log("Checking for sessions starting in 7 days...");
    
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
            deleted_at,
            contact:contacts(id, nom, prenom, email)
          )
        `)
        .eq("date_debut", j7Date)
        .in("statut", ["a_venir", "complet"])
        // Corbeille : une session annulée puis supprimée garde son statut
        // `a_venir` et sa date — sans ce filtre elle enverrait ses rappels.
        // Les inscriptions supprimées, elles, sont écartées dans la boucle
        // (`deleted_at` remonté par le select imbriqué ci-dessus).
        .is("deleted_at", null)
        // Archivage : second mécanisme de retrait, INDÉPENDANT de la corbeille.
        // Une session archivée garde elle aussi son statut `a_venir` et sa date.
        // `sessions.archived` est NULLABLE (`boolean DEFAULT false` SANS NOT NULL,
        // migration 20260204100123) : l'égalité seule est piégeuse, car `NULL =
        // false` vaut NULL en SQL — une session à `archived` NULL était donc
        // écartée, et ses inscrits ne recevaient aucun rappel.
        .or("archived.is.null,archived.eq.false");

      if (sessionsJ7Error) {
        console.error("Error fetching J-7 sessions:", sessionsJ7Error);
      } else if (sessionsJ7 && sessionsJ7.length > 0) {
        console.log(`Found ${sessionsJ7.length} sessions starting in 7 days`);
      
        for (const session of sessionsJ7) {
          const inscriptions = session.session_inscriptions as any[];
          if (!inscriptions) continue;

          for (const inscription of inscriptions) {
            if (!inscriptionRecoitRappel(inscription)) continue;
            const contact = inscription.contact;
            if (!contact?.email) continue;

            const subjectJ7 = `Rappel J-7 : Votre formation ${session.nom} approche !`;

            if (await alreadySentToday("session_reminder_j7", contact.id, (q) => q.eq("session_id", session.id))) {
              results.push({
                type: "reminder_j7",
                recipient: contact.email,
                contactId: contact.id,
                sessionId: session.id,
                subject: subjectJ7,
                success: true,
                skipped: true,
                reason: "already_sent",
              });
              continue;
            }

            if (dryRun) {
              results.push({
                type: "reminder_j7",
                recipient: contact.email,
                contactId: contact.id,
                sessionId: session.id,
                subject: subjectJ7,
                success: true,
                reason: "dry_run",
              });
              continue;
            }

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
                subject: subjectJ7,
                reply_to: EMAIL_CONFIG.REPLY_TO,
                html: emailHtml,
              });

              await supabase.from("email_logs").insert({
                type: "session_reminder_j7",
                recipient_email: contact.email,
                recipient_name: `${contact.prenom} ${contact.nom}`,
                contact_id: contact.id,
                session_id: session.id,
                subject: subjectJ7,
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
    } else {
      console.log(
        "[AUTO-EMAILS] bloc rappel_formation_j7 ÉTEINT : aucune lecture de `sessions`, aucun envoi.",
      );
    }

    // ========================================
    // 3. RAPPELS FORMATION J-1
    // ========================================
    // Interrupteur du bloc : voir BLOCS_AUTOMATIQUES_ACTIFS en tête de fichier.
    if (BLOCS_AUTOMATIQUES_ACTIFS.rappel_formation_j1) {
      console.log("Checking for sessions starting tomorrow...");
    
      const { data: sessionsJ1, error: sessionsJ1Error } = await supabase
        .from("sessions")
        .select(`
          id,
          nom,
          date_debut,
          date_fin,
          lieu,
          formation_type,
          heure_debut,
          heure_fin,
          heure_debut_matin,
          heure_fin_matin,
          heure_debut_aprem,
          heure_fin_aprem,
          session_inscriptions(
            id,
            statut,
            deleted_at,
            contact:contacts(id, nom, prenom, email)
          )
        `)
        .eq("date_debut", j1Date)
        .in("statut", ["a_venir", "complet"])
        // Même motif qu'au bloc J-7 : la corbeille ne doit pas envoyer d'email.
        .is("deleted_at", null)
        // Même motif qu'au bloc J-7 : une session archivée n'envoie rien, et
        // `archived` étant nullable, l'égalité seule écarterait les lignes à NULL.
        .or("archived.is.null,archived.eq.false");

      if (sessionsJ1Error) {
        console.error("Error fetching J-1 sessions:", sessionsJ1Error);
      } else if (sessionsJ1 && sessionsJ1.length > 0) {
        console.log(`Found ${sessionsJ1.length} sessions starting tomorrow`);
      
        for (const session of sessionsJ1) {
          const inscriptions = session.session_inscriptions as any[];
          if (!inscriptions) continue;

          for (const inscription of inscriptions) {
            if (!inscriptionRecoitRappel(inscription)) continue;
            const contact = inscription.contact;
            if (!contact?.email) continue;

            const subjectJ1 = `C'est demain ! Rappel pour votre formation ${session.nom}`;

            if (await alreadySentToday("session_reminder_j1", contact.id, (q) => q.eq("session_id", session.id))) {
              results.push({
                type: "reminder_j1",
                recipient: contact.email,
                contactId: contact.id,
                sessionId: session.id,
                subject: subjectJ1,
                success: true,
                skipped: true,
                reason: "already_sent",
              });
              continue;
            }

            if (dryRun) {
              results.push({
                type: "reminder_j1",
                recipient: contact.email,
                contactId: contact.id,
                sessionId: session.id,
                subject: subjectJ1,
                success: true,
                reason: "dry_run",
              });
              continue;
            }

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
                  // L'horaire vient de la BASE, jamais d'une constante : « 9h00 »
                  // était annoncé à tout le monde, y compris aux sessions de
                  // 8h30 ou de 14h, qui se présentaient donc à la mauvaise heure.
                  heureDebut: heureRappelJ1(session),
                },
              });

              const emailResponse = await resend.emails.send({
                from: EMAIL_CONFIG.FROM,
                to: [contact.email],
                subject: subjectJ1,
                reply_to: EMAIL_CONFIG.REPLY_TO,
                html: emailHtml,
              });

              await supabase.from("email_logs").insert({
                type: "session_reminder_j1",
                recipient_email: contact.email,
                recipient_name: `${contact.prenom} ${contact.nom}`,
                contact_id: contact.id,
                session_id: session.id,
                subject: subjectJ1,
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
    } else {
      console.log(
        "[AUTO-EMAILS] bloc rappel_formation_j1 ÉTEINT : aucune lecture de `sessions`, aucun envoi.",
      );
    }

    // Le rappel « examen T3P J-7 » a été retiré d'ici : il faisait doublon
    // exact avec send-exam-reminders (même table examens_t3p, même date J-7,
    // même statut « planifie », même sujet). PROPRIÉTAIRE de ce rappel :
    // send-exam-reminders, via le job exam-reminders-daily (09:00 UTC).

    // ========================================
    // 4. RAPPELS EXAMEN PRATIQUE J-7
    // ========================================
    // Interrupteur du bloc : voir BLOCS_AUTOMATIQUES_ACTIFS en tête de fichier.
    if (BLOCS_AUTOMATIQUES_ACTIFS.rappel_examen_pratique_j7) {
      console.log("Checking for practical exams in 7 days...");
    
      // NI `deleted_at` NI `archived` ici, volontairement : `examens_pratique`
      // ne PORTE AUCUNE de ces deux colonnes (vérifié dans
      // `src/integrations/supabase/types.ts` et dans les migrations),
      // contrairement à `sessions` et `session_inscriptions`. En ajouter une
      // ferait échouer la requête PostgREST entière (colonne inconnue) et
      // éteindrait le bloc en silence — le `console.error` du bloc suivant
      // serait la seule trace. Un examen retiré se retire par son `statut`
      // (seul « planifie » est servi).
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

          // Clé métier dans metadata (motif CLAUDE.md) : pas de colonne examen_id
          // sur email_logs, l'identifiant est déjà tracé dans metadata à l'insert.
          if (await alreadySentToday("exam_pratique_reminder_j7", contact.id, (q) => q.contains("metadata", { examen_id: examen.id }))) {
            results.push({
              type: "exam_pratique_reminder_j7",
              recipient: contact.email,
              recipientName: `${contact.prenom} ${contact.nom}`,
              contactId: contact.id,
              examenId: examen.id,
              subject: emailSubject,
              success: true,
              skipped: true,
              reason: "already_sent",
            });
            console.log(`Practical exam J-7 reminder déjà envoyé aujourd'hui à ${contact.email}`);
            continue;
          }

          if (dryRun) {
            results.push({
              type: "exam_pratique_reminder_j7",
              recipient: contact.email,
              recipientName: `${contact.prenom} ${contact.nom}`,
              contactId: contact.id,
              examenId: examen.id,
              subject: emailSubject,
              success: true,
              reason: "dry_run",
            });
            continue;
          }

          try {
            // Heure absente (`00:00:00` ou NULL) : la ligne « ⏰ Heure » disparaît,
            // donc la consigne d'arrivée ne doit renvoyer à AUCUNE heure — même
            // convention que `heureRappelJ1`, qui renvoie alors à la convocation.
            const heureExamen = fmtHeure(examen.heure_examen);
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
                      ${heureExamen ? `<p style="margin: 0 0 4px 0; font-size: 13px; color: #555;"><strong>⏰ Heure :</strong> ${heureExamen}</p>` : ""}
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
                  <li style="margin-bottom: 4px;">${heureExamen ? "⏰ Arrivez 30 minutes avant l'heure" : "⏰ Consultez votre convocation pour l'heure exacte, et présentez-vous 30 minutes avant"}</li>
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
    } else {
      console.log(
        "[AUTO-EMAILS] bloc rappel_examen_pratique_j7 ÉTEINT : aucune lecture de " +
          "`examens_pratique`, aucun envoi.",
      );
    }

    // ========================================
    // SUMMARY
    // ========================================
    // Un bloc ÉTEINT n'a produit aucun résultat : il se déclare `actif: false`
    // avec son motif, et n'expose AUCUN compteur — sans quoi il se lirait comme
    // un bloc allumé n'ayant trouvé personne. En mode simulation, `envoyes` se
    // lit « auraient été envoyés ».
    const countBlock = (type: string, bloc: keyof typeof BLOCS_AUTOMATIQUES_ACTIFS) =>
      BLOCS_AUTOMATIQUES_ACTIFS[bloc]
        ? {
            actif: true,
            envoyes: results.filter((r) => r.type === type && r.success && !r.skipped).length,
            deja_envoyes: results.filter((r) => r.type === type && r.skipped).length,
            echecs: results.filter((r) => r.type === type && !r.success).length,
          }
        : {
            actif: false,
            motif: MOTIFS_EXTINCTION[bloc] ?? "bloc éteint (BLOCS_AUTOMATIQUES_ACTIFS)",
          };

    const blocsDesactives = (
      Object.keys(BLOCS_AUTOMATIQUES_ACTIFS) as (keyof typeof BLOCS_AUTOMATIQUES_ACTIFS)[]
    ).filter((bloc) => !BLOCS_AUTOMATIQUES_ACTIFS[bloc]);

    const summary = {
      timestamp: new Date().toISOString(),
      dryRun,
      total_emails: results.length,
      successful: results.filter((r) => r.success && !r.skipped).length,
      failed: results.filter((r) => !r.success).length,
      already_sent: results.filter((r) => r.skipped).length,
      /** Blocs volontairement éteints : ils n'ont RIEN tenté (ni requête, ni envoi). */
      blocs_desactives: blocsDesactives,
      breakdown: {
        payment_reminders_j7: countBlock("payment_reminder_j7", "relance_paiement_j7"),
        formation_reminders_j7: countBlock("reminder_j7", "rappel_formation_j7"),
        formation_reminders_j1: countBlock("reminder_j1", "rappel_formation_j1"),
        exam_pratique_reminders_j7: countBlock(
          "exam_pratique_reminder_j7",
          "rappel_examen_pratique_j7",
        ),
      },
      details: results,
    };

    console.log(`Email automation completed${dryRun ? " [DRY RUN]" : ""}:`, JSON.stringify(summary, null, 2));

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
