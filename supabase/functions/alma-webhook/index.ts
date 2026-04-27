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

  // Secret set but no signature header -> reject (Alma must be sending one if we expect to verify).
  if (!signature) {
    return { ok: false, reason: 'missing_signature_header' };
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

    // Verify webhook signature (no-op if ALMA_WEBHOOK_SECRET not set).
    const sigCheck = await verifyAlmaSignature(rawBody, req.headers.get('x-alma-signature'));
    if (!sigCheck.ok) {
      console.error('[alma-webhook] Signature check failed:', sigCheck.reason);
      return new Response(
        JSON.stringify({ error: 'Invalid webhook signature', reason: sigCheck.reason }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
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
      console.error('Alma API error:', JSON.stringify(payment));
      return new Response(JSON.stringify({ error: 'Failed to verify payment' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
      console.error('Error inserting payment:', insertErr);
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Payment recorded successfully:', newPaiement.id);

    // Get contact name for the notification
    const { data: facture } = await supabase
      .from('factures')
      .select('contact_id, contacts(nom, prenom)')
      .eq('id', factureId)
      .single();

    const contactName = facture?.contacts
      ? `${(facture.contacts as any).prenom} ${(facture.contacts as any).nom}`
      : 'Client';

    // Create in-app notification for all admin/staff users
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

      const { error: notifErr } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notifErr) console.error('Error creating notifications:', notifErr);
    }

    return new Response(JSON.stringify({ 
      status: 'recorded', 
      paiement_id: newPaiement.id,
      amount: totalAmount,
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
