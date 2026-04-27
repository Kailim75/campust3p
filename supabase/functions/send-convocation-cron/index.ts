// ════════════════════════════════════════════════════════════════════
// send-convocation-cron
// Envoi automatique des convocations à J-7 avant le début de session.
// Conditions :
//   - statut session ∈ ('planifiee','confirmee','en_cours')
//   - date_debut = CURRENT_DATE + 7
//   - inscription : statut='valide' (= dossier CMA validé), non supprimée
//   - contact a un email
// Anti-doublon :
//   - Skip si une convocation a déjà été envoyée APRÈS sessions.updated_at
//     (=> renvoi automatique si la session a été modifiée depuis)
// Déclenché par pg_cron (verify_jwt=false).
// ════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";
import {
  generateDocumentPDF,
  getPdfAsBase64,
  type ContactInfo,
  type SessionInfo,
  type CompanyInfo,
} from "../_shared/pdf-generator.ts";
import { buildEmailHtml, formatDateFr } from "../_shared/email-template.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_FROM = "Ecole T3P Montrouge <montrouge@ecolet3p.fr>";
const DEFAULT_REPLY_TO = "montrouge@ecolet3p.fr";

const fmtTime = (t?: string | null): string | undefined => {
  if (!t || t === "00:00:00" || t === "00:00") return undefined;
  const [h, m] = t.split(":");
  return `${h}h${m}`;
};

function buildHeureDebut(s: any): string | undefined {
  const dm = fmtTime(s.heure_debut_matin), fm = fmtTime(s.heure_fin_matin);
  const da = fmtTime(s.heure_debut_aprem), fa = fmtTime(s.heure_fin_aprem);
  if (dm && fm && da && fa) return `${dm} - ${fm} / ${da} - ${fa}`;
  if (dm && fm) return `${dm} - ${fm}`;
  const d = fmtTime(s.heure_debut), f = fmtTime(s.heure_fin);
  if (d && f) return `${d} - ${f}`;
  return d ?? undefined;
}

interface SendOutcome {
  inscription_id: string;
  contact_email: string;
  session_id: string;
  success: boolean;
  reason?: string;
  resendId?: string;
  reused?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendKey = Deno.env.get("RESEND_API_KEY");

  if (!resendKey) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY missing" }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const resend = new Resend(resendKey);

  // Allow override for testing: ?days=3 or body { daysAhead: 3, dryRun: true }
  const url = new URL(req.url);
  let daysAhead = 7;
  let dryRun = false;
  let onlySessionId: string | null = null;
  try {
    if (url.searchParams.get("days")) daysAhead = parseInt(url.searchParams.get("days")!);
    if (url.searchParams.get("dryRun") === "true") dryRun = true;
    if (req.method === "POST") {
      const body = await req.json().catch(() => null);
      if (body?.daysAhead) daysAhead = Number(body.daysAhead);
      if (body?.dryRun) dryRun = true;
      if (body?.sessionId) onlySessionId = body.sessionId;
    }
  } catch {}

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + daysAhead);
  const targetDateStr = targetDate.toISOString().slice(0, 10);

  console.log(`[CONVOC-CRON] Recherche sessions au ${targetDateStr} (J+${daysAhead})${onlySessionId ? ` session=${onlySessionId}` : ""}`);

  // 1) Récupérer les sessions cibles
  let q = supabase
    .from("sessions")
    .select("id, nom, formation_type, date_debut, date_fin, lieu, duree_heures, prix, heure_debut, heure_fin, heure_debut_matin, heure_fin_matin, heure_debut_aprem, heure_fin_aprem, centre_id, statut, updated_at")
    .eq("date_debut", targetDateStr)
    .in("statut", ["planifiee", "confirmee", "en_cours"]);
  if (onlySessionId) q = q.eq("id", onlySessionId);
  const { data: sessions, error: sErr } = await q;

  if (sErr) {
    console.error("[CONVOC-CRON] Erreur sessions:", sErr);
    return new Response(JSON.stringify({ error: sErr.message }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  if (!sessions || sessions.length === 0) {
    console.log("[CONVOC-CRON] Aucune session cible.");
    return new Response(JSON.stringify({ ok: true, sessionsProcessed: 0, sent: 0 }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const outcomes: SendOutcome[] = [];

  // Cache identité centre (formation) - on prend la 1ère ligne globale (legacy)
  const { data: centreFormation } = await supabase
    .from("centre_formation").select("*").limit(1).single();

  const company: CompanyInfo = {
    name: centreFormation?.nom_commercial || centreFormation?.nom_legal || "Ecole T3P Montrouge",
    address: centreFormation?.adresse_complete || "3 rue Corneille, 92120 Montrouge",
    phone: centreFormation?.telephone || "",
    email: centreFormation?.email || DEFAULT_REPLY_TO,
    siret: centreFormation?.siret || "",
    nda: centreFormation?.nda || "",
    qualiopi_numero: (centreFormation as any)?.qualiopi_numero || undefined,
  };

  for (const session of sessions) {
    // Identité email du centre (settings)
    let fromAddress = DEFAULT_FROM;
    let replyTo = DEFAULT_REPLY_TO;
    if (session.centre_id) {
      const { data: centre } = await supabase
        .from("centres").select("settings").eq("id", session.centre_id).maybeSingle();
      const s = (centre?.settings ?? {}) as Record<string, unknown>;
      if (typeof s.email_from_address === "string" && s.email_from_address.trim()) {
        fromAddress = s.email_from_address.trim();
      }
      if (typeof s.email_reply_to === "string" && s.email_reply_to.trim()) {
        replyTo = s.email_reply_to.trim();
      }
    }

    // 2) Inscriptions valides (CMA OK)
    const { data: inscriptions, error: iErr } = await supabase
      .from("session_inscriptions")
      .select("id, contact_id, statut, contacts:contacts(id, civilite, nom, prenom, email, telephone, rue, code_postal, ville, date_naissance, ville_naissance)")
      .eq("session_id", session.id)
      .eq("statut", "valide")
      .is("deleted_at", null);

    if (iErr) {
      console.error(`[CONVOC-CRON] Session ${session.id} erreur inscriptions:`, iErr);
      continue;
    }
    if (!inscriptions?.length) continue;

    const sessionInfo: SessionInfo = {
      nom: session.nom,
      formation_type: session.formation_type as any,
      date_debut: session.date_debut,
      date_fin: session.date_fin,
      lieu: session.lieu || undefined,
      duree_heures: session.duree_heures || undefined,
      prix: session.prix ? Number(session.prix) : undefined,
      heure_debut: session.heure_debut || undefined,
      heure_fin: session.heure_fin || undefined,
      heure_debut_matin: session.heure_debut_matin || undefined,
      heure_fin_matin: session.heure_fin_matin || undefined,
      heure_debut_aprem: session.heure_debut_aprem || undefined,
      heure_fin_aprem: session.heure_fin_aprem || undefined,
    };

    for (const insc of inscriptions) {
      const contact: any = (insc as any).contacts;
      if (!contact) continue;
      if (!contact.email) {
        outcomes.push({
          inscription_id: insc.id, contact_email: "(absent)",
          session_id: session.id, success: false, reason: "no_email",
        });
        continue;
      }

      // 3) Anti-doublon : convocation déjà envoyée APRÈS session.updated_at ?
      const { data: lastEnvoi } = await supabase
        .from("document_envois")
        .select("id, date_envoi")
        .eq("session_id", session.id)
        .eq("contact_id", contact.id)
        .eq("document_type", "convocation")
        .eq("statut", "envoyé")
        .order("date_envoi", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastEnvoi && session.updated_at && new Date(lastEnvoi.date_envoi) > new Date(session.updated_at)) {
        outcomes.push({
          inscription_id: insc.id, contact_email: contact.email,
          session_id: session.id, success: true, reused: true,
          reason: "already_sent_after_update",
        });
        continue;
      }

      const contactInfo: ContactInfo = {
        civilite: contact.civilite || undefined,
        nom: contact.nom, prenom: contact.prenom,
        email: contact.email,
        telephone: contact.telephone || undefined,
        rue: contact.rue || undefined,
        code_postal: contact.code_postal || undefined,
        ville: contact.ville || undefined,
        date_naissance: contact.date_naissance || undefined,
        ville_naissance: contact.ville_naissance || undefined,
      };

      // 4) Génération PDF + envoi
      try {
        const pdfDoc = generateDocumentPDF("convocation", contactInfo, sessionInfo, company);
        const pdfBase64 = getPdfAsBase64(pdfDoc);
        const filename = `Convocation-${contact.nom}-${contact.prenom}.pdf`.replace(/\s+/g, "_");

        const subject = `Convocation - ${session.nom}`;
        const html = buildEmailHtml({
          title: "📅 Convocation à votre formation",
          recipientName: `${contact.prenom} ${contact.nom}`,
          bodyHtml: `
            <p style="margin:0 0 12px 0;">Vous êtes officiellement convoqué(e) à la formation <strong>${session.nom}</strong> qui débutera dans <strong>${daysAhead} jours</strong>.</p>
            <p style="margin:0 0 12px 0;">Vous trouverez votre convocation officielle en pièce jointe. Merci de la conserver et de vous présenter <strong>15 minutes avant le début</strong> avec une pièce d'identité.</p>
            <p style="margin:0 0 12px 0;">Pour toute question, contactez-nous à ${replyTo}.</p>
          `,
          sessionInfo: {
            nom: session.nom,
            formationType: session.formation_type as any,
            dateDebut: formatDateFr(session.date_debut),
            dateFin: session.date_fin ? formatDateFr(session.date_fin) : undefined,
            lieu: session.lieu || undefined,
            heureDebut: buildHeureDebut(session),
          },
          attachmentNames: [`${filename} (${Math.round(pdfBase64.length * 0.75 / 1024)} Ko)`],
        });

        if (dryRun) {
          outcomes.push({
            inscription_id: insc.id, contact_email: contact.email,
            session_id: session.id, success: true, reason: "dry_run",
          });
          continue;
        }

        const resp = await resend.emails.send({
          from: fromAddress,
          to: [contact.email],
          subject,
          html,
          reply_to: replyTo,
          attachments: [{ filename, content: pdfBase64, content_type: "application/pdf" }],
        });

        if ((resp as any).error) throw new Error((resp as any).error.message || "Resend error");

        // Log envoi (alimente document_envois → tracking & cockpit)
        await supabase.from("document_envois").insert({
          contact_id: contact.id,
          session_id: session.id,
          document_type: "convocation",
          document_name: filename,
          envoi_type: "email",
          statut: "envoyé",
          sent_at: new Date().toISOString(),
          metadata: {
            source: "send-convocation-cron",
            days_ahead: daysAhead,
            session_updated_at: session.updated_at,
            resend_id: resp.data?.id,
            is_resend: !!lastEnvoi,
          },
        });

        // Log email_logs (cohérence avec autres envois)
        await supabase.from("email_logs").insert({
          type: "convocation_auto",
          recipient_email: contact.email,
          recipient_name: `${contact.prenom} ${contact.nom}`,
          contact_id: contact.id,
          session_id: session.id,
          subject,
          template_used: "convocation_cron",
          status: "sent",
          resend_id: resp.data?.id,
        });

        outcomes.push({
          inscription_id: insc.id, contact_email: contact.email,
          session_id: session.id, success: true, resendId: resp.data?.id,
        });
        console.log(`[CONVOC-CRON] ✓ ${contact.email} (session ${session.id})`);
      } catch (err: any) {
        console.error(`[CONVOC-CRON] ✗ ${contact.email}:`, err);
        await supabase.from("email_logs").insert({
          type: "convocation_auto",
          recipient_email: contact.email,
          recipient_name: `${contact.prenom} ${contact.nom}`,
          contact_id: contact.id,
          session_id: session.id,
          subject: `Convocation - ${session.nom}`,
          template_used: "convocation_cron",
          status: "failed",
          error_message: err?.message || String(err),
        });
        outcomes.push({
          inscription_id: insc.id, contact_email: contact.email,
          session_id: session.id, success: false, reason: err?.message || "send_error",
        });
      }
    }
  }

  const sent = outcomes.filter(o => o.success && !o.reused).length;
  const skipped = outcomes.filter(o => o.reused).length;
  const failed = outcomes.filter(o => !o.success).length;

  console.log(`[CONVOC-CRON] Done. sent=${sent} skipped=${skipped} failed=${failed} sessions=${sessions.length}`);

  return new Response(
    JSON.stringify({
      ok: true,
      targetDate: targetDateStr,
      daysAhead, dryRun,
      sessionsProcessed: sessions.length,
      sent, skipped, failed,
      outcomes,
    }),
    { headers: { "Content-Type": "application/json", ...corsHeaders } },
  );
});
