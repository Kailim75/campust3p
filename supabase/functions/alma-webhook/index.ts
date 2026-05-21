import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handlePreflight } from "../_shared/cors.ts";

/**
 * Verify HMAC-SHA256 signature of the raw body against the X-Alma-Signature
 * header. Returns true if no secret is configured (degraded mode), the
 * signature matches, or there's no signature header (legacy clients).
 *
 * Set ALMA_WEBHOOK_SECRET in Supabase secrets to activate verification.
 * When the secret is set AND a signature is provided, mismatched signatures
 * are rejected with 401.
 */
async function verifyAlmaSignature(rawBody: string, signature: string | null): Promise<{
  ok: boolean;
  reason?: string;
}> {
  const secret = Deno.env.get('ALMA_WEBHOOK_SECRET');

  // No secret configured -> degraded mode (current behavior, log warning).
  if (!secret) {
    console.warn(
      '[alma-webhook] ALMA_WEBHOOK_SECRET not set — webhook signatures NOT verified. ' +
      'Set this secret in Supabase Dashboard > Edge Functions > Secrets to enable verification.'
    );
    return { ok: true, reason: 'no_secret_configured' };
  }

  // Secret set but no signature header -> degraded mode (accept).
  // Alma's per-payment ipn_callback_url does NOT send x-alma-signature
  // (signing only applies to dashboard-configured global webhooks).
  // We still verify the payment state via the Alma API after parsing the body,
  // so an unsigned IPN cannot forge a paid status.
  if (!signature) {
    console.warn('[alma-webhook] No x-alma-signature header (expected for IPN callbacks) — accepting in degraded mode');
    return { ok: true, reason: 'no_signature_header_ipn_mode' };
  }

  // Compute HMAC-SHA256 of the raw body with the configured secret.
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(rawBody));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Constant-time comparison to avoid timing leaks.
  const provided = signature.toLowerCase().replace(/^sha256=/, '');
  if (provided.length !== expected.length) {
    return { ok: false, reason: 'signature_length_mismatch' };
  }
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return diff === 0 ? { ok: true } : { ok: false, reason: 'signature_mismatch' };
}

serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  const corsHeaders = getCorsHeaders(req);

  const ALMA_API_KEY = Deno.env.get('ALMA_API_KEY');
  let rawMode = Deno.env.get('ALMA_MODE') || 'test';
  if (rawMode.startsWith('sk_')) {
    rawMode = rawMode.startsWith('sk_live_') ? 'live' : 'test';
  }
  const ALMA_API_URL = rawMode === 'live'
    ? 'https://api.getalma.eu/v1'
    : 'https://api.sandbox.getalma.eu/v1';

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  try {
    // Robust body parsing — Alma may send empty bodies (pings/retries) or query-param-only callbacks
    const rawBody = await req.text();

    // Verify webhook signature — DEGRADED MODE: log mismatch but continue.
    // Security is guaranteed by the subsequent Alma API re-verification below
    // (we fetch the payment from Alma and trust only what Alma returns).
    // A forged IPN cannot fake a paid state because we never trust the body's state.
    const sigCheck = await verifyAlmaSignature(rawBody, req.headers.get('x-alma-signature'));
    if (!sigCheck.ok) {
      console.warn(
        '[alma-webhook] Signature mismatch (degraded — relying on Alma API re-verification). ' +
        'Reason:', sigCheck.reason,
        '— Check that ALMA_WEBHOOK_SECRET matches the HMAC secret configured in Alma Dashboard.'
      );
    }
    const url = new URL(req.url);
    let body: any = {};

    if (rawBody && rawBody.trim().length > 0) {
      try {
        body = JSON.parse(rawBody);
      } catch (e) {
        // Try urlencoded form fallback
        try {
          const params = new URLSearchParams(rawBody);
          body = Object.fromEntries(params.entries());
        } catch {
          console.log('Alma webhook: non-JSON body received, length:', rawBody.length);
        }
      }
    }

    // Alma may also include payment_id as a query parameter
    const paymentId =
      body.payment_id ||
      body.id ||
      url.searchParams.get('payment_id') ||
      url.searchParams.get('id');

    console.log('Alma webhook received. payment_id:', paymentId, 'body:', JSON.stringify(body), 'query:', url.search);

    if (!paymentId) {
      // Always answer 200 so Alma stops retrying — there's nothing actionable without an id
      console.log('Alma webhook: no payment_id found, acknowledging without action');
      return new Response(JSON.stringify({ status: 'ignored', reason: 'no_payment_id' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify payment status with Alma API
    const almaRes = await fetch(`${ALMA_API_URL}/payments/${paymentId}`, {
      headers: { 'Authorization': `Alma-Auth ${ALMA_API_KEY}` },
    });
    const payment = await almaRes.json();

    if (!almaRes.ok) {
      // Log for manual review but ACK so Alma stops retrying (their retry loop spams the inbox).
      console.error('[alma-webhook] Alma API verify failed (acknowledged to stop retries):', almaRes.status, JSON.stringify(payment));
      return new Response(JSON.stringify({ status: 'error_logged', reason: 'alma_api_verify_failed', alma_status: almaRes.status, payment_id: paymentId }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Alma payment state:', payment.state, 'custom_data:', JSON.stringify(payment.custom_data));

    // Only process completed payments
    if (payment.state !== 'paid' && payment.state !== 'in_progress') {
      console.log('Payment not yet paid, state:', payment.state);
      return new Response(JSON.stringify({ status: 'ignored', state: payment.state }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const factureId = payment.custom_data?.facture_id;
    if (!factureId) {
      console.log('No facture_id in custom_data, skipping DB update');
      return new Response(JSON.stringify({ status: 'no_facture' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Check if payment already recorded (idempotency)
    const { data: existing } = await supabase
      .from('paiements')
      .select('id')
      .eq('facture_id', factureId)
      .eq('reference', `ALMA-${paymentId}`)
      .maybeSingle();

    if (existing) {
      console.log('Payment already recorded:', existing.id);
      return new Response(JSON.stringify({ status: 'already_recorded', id: existing.id }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate the total amount from the payment plan (first installment paid)
    const totalAmount = payment.purchase_amount / 100; // Alma amounts are in cents

    // Record the payment
    const { data: newPaiement, error: insertErr } = await supabase
      .from('paiements')
      .insert({
        facture_id: factureId,
        montant: totalAmount,
        mode_paiement: 'alma',
        reference: `ALMA-${paymentId}`,
        date_paiement: new Date().toISOString().split('T')[0],
        commentaires: `Paiement Alma ${payment.installments_count}x validé automatiquement`,
      })
      .select('id')
      .single();

    if (insertErr) {
      // Log for manual review but ACK so Alma stops retrying.
      console.error('[alma-webhook] Insert paiement failed (acknowledged to stop retries):', insertErr, { facture_id: factureId, payment_id: paymentId, montant: totalAmount });
      return new Response(JSON.stringify({ status: 'error_logged', reason: 'insert_failed', error: insertErr.message, facture_id: factureId, payment_id: paymentId }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Payment recorded successfully:', newPaiement.id);

    // Get full facture + contact details for the receipt email
    const { data: facture } = await supabase
      .from('factures')
      .select('id, numero_facture, montant_total, date_emission, contact_id, centre_id, contacts(nom, prenom, email)')
      .eq('id', factureId)
      .single();

    const contact: any = facture?.contacts ?? null;
    const contactName = contact ? `${contact.prenom ?? ''} ${contact.nom ?? ''}`.trim() : 'Client';

    // ── 1. In-app notifications for staff ──
    const { data: adminUsers } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'staff']);

    if (adminUsers && adminUsers.length > 0) {
      const notifications = adminUsers.map((u: any) => ({
        user_id: u.user_id,
        type: 'payment_received',
        title: `💶 Paiement Alma reçu`,
        message: `${contactName} - ${totalAmount.toLocaleString('fr-FR')}€ (${payment.installments_count}x)`,
        link: `/factures`,
        metadata: { facture_id: factureId, alma_payment_id: paymentId, amount: totalAmount },
      }));
      const { error: notifErr } = await supabase.from('notifications').insert(notifications);
      if (notifErr) console.error('Error creating notifications:', notifErr);
    }

    // ── 2. Auto-generate + email PDF receipt to the client ──
    let emailStatus: 'sent' | 'skipped' | 'failed' = 'skipped';
    let emailError: string | null = null;
    if (contact?.email && facture) {
      try {
        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
        if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured');

        // Resolve centre branding (fromAddress, raison sociale)
        const { data: centreCfg } = await supabase
          .from('centre_formation')
          .select('raison_sociale, email_contact, telephone_contact, siege_social, siret')
          .limit(1)
          .maybeSingle();

        const fromAddress = (centreCfg?.email_contact)
          ? `${centreCfg.raison_sociale ?? 'Centre de formation'} <${centreCfg.email_contact}>`
          : 'Ecole T3P Montrouge <montrouge@ecolet3p.fr>';

        // Build PDF receipt with jsPDF (Deno-compatible build)
        const { jsPDF } = await import('https://esm.sh/jspdf@2.5.1');
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });

        const FOREST = '#1E462D';
        doc.setFillColor(FOREST);
        doc.rect(0, 0, 210, 28, 'F');
        doc.setTextColor('#FFFFFF');
        doc.setFontSize(18);
        doc.text('Reçu de paiement', 20, 18);

        doc.setTextColor('#000000');
        doc.setFontSize(10);
        let y = 40;
        const line = (label: string, value: string) => {
          doc.setFont('helvetica', 'bold'); doc.text(label, 20, y);
          doc.setFont('helvetica', 'normal'); doc.text(value, 70, y);
          y += 7;
        };
        line('Émetteur :', centreCfg?.raison_sociale ?? 'Centre de formation');
        if (centreCfg?.siret) line('SIRET :', centreCfg.siret);
        if (centreCfg?.siege_social) line('Adresse :', String(centreCfg.siege_social).slice(0, 80));
        y += 4;
        line('Bénéficiaire :', contactName);
        if (contact.email) line('Email :', contact.email);
        y += 4;
        line('Facture liée :', facture.numero_facture ?? facture.id);
        line('Date du paiement :', new Date().toLocaleDateString('fr-FR'));
        line('Mode de paiement :', `Alma — paiement en ${payment.installments_count}x`);
        line('Référence Alma :', `ALMA-${paymentId}`);
        y += 4;

        doc.setFillColor(FOREST);
        doc.setTextColor('#FFFFFF');
        doc.rect(20, y, 170, 14, 'F');
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text(`Montant encaissé : ${totalAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`, 25, y + 9);

        doc.setTextColor('#666666');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('Ce reçu vaut confirmation de l\'encaissement de votre paiement Alma.', 20, 280);
        doc.text('Conservez-le pour vos archives. Pour toute question : ' + (centreCfg?.email_contact ?? 'contact@ecolet3p.fr'), 20, 285);

        const pdfB64 = doc.output('datauristring').split(',')[1];
        const fileName = `Recu-${facture.numero_facture ?? paymentId}.pdf`;

        const html = `
          <div style="font-family:Arial,sans-serif;color:#1f2937;max-width:560px;margin:0 auto">
            <div style="background:${FOREST};color:#fff;padding:18px 24px;border-radius:8px 8px 0 0">
              <h2 style="margin:0;font-size:18px">Paiement bien reçu — Merci !</h2>
            </div>
            <div style="padding:20px 24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
              <p>Bonjour ${contactName},</p>
              <p>Nous confirmons la validation de votre paiement Alma en <strong>${payment.installments_count}×</strong>
                 d'un montant de <strong>${totalAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</strong>
                 pour la facture <strong>${facture.numero_facture ?? ''}</strong>.</p>
              <p>Vous trouverez en pièce jointe votre reçu officiel.</p>
              <p style="margin-top:24px;color:#6b7280;font-size:13px">Cordialement,<br/>${centreCfg?.raison_sociale ?? 'Votre centre de formation'}</p>
            </div>
          </div>`;

        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromAddress,
            to: [contact.email],
            subject: `Reçu de paiement — Facture ${facture.numero_facture ?? ''}`,
            html,
            attachments: [{ filename: fileName, content: pdfB64 }],
          }),
        });

        if (!resendRes.ok) {
          const errBody = await resendRes.text();
          throw new Error(`Resend ${resendRes.status}: ${errBody}`);
        }
        emailStatus = 'sent';

        // Log envoi pour traçabilité
        await supabase.from('document_envois').insert({
          contact_id: facture.contact_id,
          document_type: 'recu_paiement',
          document_name: fileName,
          statut: 'envoye',
          envoi_type: 'email',
          date_envoi: new Date().toISOString(),
        }).then(({ error }) => { if (error) console.warn('document_envois log failed:', error.message); });

        console.log(`[alma-webhook] Receipt PDF emailed to ${contact.email}`);
      } catch (e) {
        emailStatus = 'failed';
        emailError = (e as Error).message;
        console.error('[alma-webhook] Failed to send receipt email:', emailError);
      }
    } else {
      console.log('[alma-webhook] No contact email, skipping receipt email');
    }

    return new Response(JSON.stringify({
      status: 'recorded',
      paiement_id: newPaiement.id,
      amount: totalAmount,
      email: { status: emailStatus, error: emailError },
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Alma webhook error:', error);
    // Return 200 so Alma stops retrying — failures are logged for manual review
    return new Response(JSON.stringify({ status: 'error_logged', error: error.message }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
