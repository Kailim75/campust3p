import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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
    const body = await req.json();
    const paymentId = body.payment_id || body.id;

    console.log('Alma webhook received:', JSON.stringify(body));

    if (!paymentId) {
      return new Response(JSON.stringify({ error: 'Missing payment_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
