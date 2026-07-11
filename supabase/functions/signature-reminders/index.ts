// ════════════════════════════════════════════════════════════════════
// signature-reminders
// 1) Relance par email des demandes de signature 'envoye' non signées
//    dont l'expiration arrive dans N jours (défaut : 3).
// 2) Passage à 'expire' des demandes 'envoye' dont l'expiration est
//    dépassée (jusqu'ici le statut "Expiré" n'était calculé qu'à
//    l'affichage, jamais persisté).
// Garde-fous :
//   - Ne modifie QUE des demandes au statut 'envoye' — jamais une
//     demande signée (gelée par trg_lock_signed_signature_request).
//   - Ne crée ni ne fait tourner aucun token : une demande sans
//     access_token est ignorée (la création de token reste l'affaire
//     exclusive de send-signature-email).
//   - Une seule relance par demande (dédup via email_logs.metadata).
// Anti-doublon : email_logs.template_used='signature_reminder'
//   + metadata.signature_request_id.
// Déclenché par pg_cron (verify_jwt=false). Test : ?dryRun=true
// ════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { buildEmailHtml, formatDateFr } from "../_shared/email-template.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Même identité et même base d'URL que send-signature-email : le lien
// de relance doit être strictement identique au lien initial.
const EMAIL_CONFIG = {
  FROM: "Ecole T3P Montrouge <montrouge@ecolet3p.fr>",
  REPLY_TO: "montrouge@ecolet3p.fr",
} as const;
const PUBLISHED_BASE_URL = "https://campust3p.lovable.app";

interface Outcome {
  signature_request_id: string;
  contact_email: string;
  success: boolean;
  reason?: string;
  resendId?: string;
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

  // Overrides de test : ?days=5&dryRun=true ou body { daysBefore, dryRun }
  const url = new URL(req.url);
  let daysBefore = 3;
  let dryRun = false;
  try {
    if (url.searchParams.get("days")) daysBefore = parseInt(url.searchParams.get("days")!);
    if (url.searchParams.get("dryRun") === "true") dryRun = true;
    if (req.method === "POST") {
      const body = await req.json().catch(() => null);
      if (body?.daysBefore) daysBefore = Number(body.daysBefore);
      if (body?.dryRun) dryRun = true;
    }
  } catch { /* garde les défauts */ }

  const todayStr = new Date().toISOString().slice(0, 10);
  const target = new Date();
  target.setDate(target.getDate() + daysBefore);
  const targetStr = target.toISOString().slice(0, 10);
  const targetNext = new Date(target);
  targetNext.setDate(targetNext.getDate() + 1);
  const targetNextStr = targetNext.toISOString().slice(0, 10);

  console.log(`[SIG-REMINDERS] expire<${todayStr} · relance J-${daysBefore} (expiration le ${targetStr})${dryRun ? " [DRY RUN]" : ""}`);

  // ── 1) Expiration : envoye + date dépassée → expire ────────────────
  let expiredCount = 0;
  if (dryRun) {
    const { data } = await supabase
      .from("signature_requests")
      .select("id")
      .eq("statut", "envoye")
      .lt("date_expiration", todayStr);
    expiredCount = data?.length ?? 0;
  } else {
    const { data, error: expErr } = await supabase
      .from("signature_requests")
      .update({ statut: "expire" })
      .eq("statut", "envoye")
      .lt("date_expiration", todayStr)
      .select("id");
    if (expErr) {
      console.error("[SIG-REMINDERS] Erreur passage expire:", expErr);
    } else {
      expiredCount = data?.length ?? 0;
    }
  }

  // ── 2) Relances J-N ────────────────────────────────────────────────
  const { data: due, error: dueErr } = await supabase
    .from("signature_requests")
    .select(`
      id, titre, description, type_document, date_expiration, access_token,
      contact:contacts(id, nom, prenom, email)
    `)
    .eq("statut", "envoye")
    .gte("date_expiration", targetStr)
    .lt("date_expiration", targetNextStr);

  if (dueErr) {
    console.error("[SIG-REMINDERS] Erreur sélection relances:", dueErr);
    return new Response(JSON.stringify({ error: dueErr.message }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const outcomes: Outcome[] = [];

  for (const sr of due ?? []) {
    const contact = sr.contact as any;

    if (!contact?.email) {
      outcomes.push({ signature_request_id: sr.id, contact_email: "(absent)", success: false, reason: "no_email" });
      continue;
    }
    if (!sr.access_token) {
      // Jamais de création de token ici — demande à renvoyer via le flux normal.
      outcomes.push({ signature_request_id: sr.id, contact_email: contact.email, success: false, reason: "no_access_token" });
      continue;
    }

    // Dédup : une seule relance par demande.
    const { data: already } = await supabase
      .from("email_logs")
      .select("id")
      .eq("template_used", "signature_reminder")
      .contains("metadata", { signature_request_id: sr.id })
      .limit(1);
    if (already && already.length > 0) {
      outcomes.push({ signature_request_id: sr.id, contact_email: contact.email, success: true, reason: "already_reminded" });
      continue;
    }

    const signingLink = `${PUBLISHED_BASE_URL}/signature/${sr.id}/${sr.access_token}`;
    const subject = `Rappel — Document à signer : ${sr.titre}`;
    const html = buildEmailHtml({
      title: "⏰ Rappel — document à signer",
      accentColor: "#d97706",
      recipientName: `${contact.prenom} ${contact.nom}`,
      bodyHtml: `
        <p style="margin: 0 0 12px 0;">Vous avez un document en attente de signature. Sans action de votre part, le lien expirera le <strong>${formatDateFr(sr.date_expiration)}</strong>.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0;">
          <tr>
            <td style="background-color: #fffbeb; border-left: 4px solid #d97706; border-radius: 6px; padding: 18px 20px;">
              <p style="margin: 0 0 6px 0; font-weight: 700; color: #92400e;">${sr.titre}</p>
              <p style="margin: 0 0 4px 0; font-size: 13px; color: #555;"><strong>Type :</strong> ${sr.type_document}</p>
              ${sr.description ? `<p style="margin: 0; font-size: 13px; color: #555;">${sr.description}</p>` : ""}
            </td>
          </tr>
        </table>
        <p style="margin: 0 0 16px 0;">Cliquez sur le bouton ci-dessous pour signer le document :</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
          <tr>
            <td align="center">
              <a href="${signingLink}"
                 style="background: #d97706; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 15px;">
                ✍️ Signer le document
              </a>
            </td>
          </tr>
        </table>
        <p style="margin: 12px 0 0 0; color: #888; font-size: 12px;">
          Ou copiez ce lien dans votre navigateur :<br>
          <a href="${signingLink}" style="color: #d97706; word-break: break-all;">${signingLink}</a>
        </p>
      `,
    });

    if (dryRun) {
      outcomes.push({ signature_request_id: sr.id, contact_email: contact.email, success: true, reason: "dry_run" });
      continue;
    }

    try {
      const resp = await resend.emails.send({
        from: EMAIL_CONFIG.FROM,
        to: [contact.email],
        subject,
        reply_to: EMAIL_CONFIG.REPLY_TO,
        html,
      });
      if ((resp as any).error) throw new Error((resp as any).error.message || "Resend error");

      await supabase.from("email_logs").insert({
        type: "signature_reminder",
        recipient_email: contact.email,
        recipient_name: `${contact.prenom} ${contact.nom}`,
        contact_id: contact.id,
        subject,
        template_used: "signature_reminder",
        status: "sent",
        resend_id: resp.data?.id,
        metadata: { signature_request_id: sr.id, days_before: daysBefore },
      });

      outcomes.push({ signature_request_id: sr.id, contact_email: contact.email, success: true, resendId: resp.data?.id });
      console.log(`[SIG-REMINDERS] ✓ relance ${contact.email} (${sr.id})`);
    } catch (err: any) {
      console.error(`[SIG-REMINDERS] ✗ ${contact.email}:`, err);
      await supabase.from("email_logs").insert({
        type: "signature_reminder",
        recipient_email: contact.email,
        recipient_name: `${contact.prenom} ${contact.nom}`,
        contact_id: contact.id,
        subject,
        template_used: "signature_reminder",
        status: "failed",
        error_message: err?.message || String(err),
        metadata: { signature_request_id: sr.id, days_before: daysBefore },
      });
      outcomes.push({ signature_request_id: sr.id, contact_email: contact.email, success: false, reason: err?.message || "send_error" });
    }
  }

  const reminded = outcomes.filter(o => o.success && !o.reason).length;
  const skipped = outcomes.filter(o => o.reason === "already_reminded" || o.reason === "dry_run").length;
  const failed = outcomes.filter(o => !o.success).length;

  console.log(`[SIG-REMINDERS] Done. expired=${expiredCount} reminded=${reminded} skipped=${skipped} failed=${failed}`);

  return new Response(
    JSON.stringify({ ok: true, dryRun, daysBefore, expired: expiredCount, reminded, skipped, failed, outcomes }),
    { headers: { "Content-Type": "application/json", ...corsHeaders } },
  );
});
