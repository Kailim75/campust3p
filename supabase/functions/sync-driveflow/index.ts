import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DRIVEFLOW_WEBHOOK_URL = 'https://zhgbbujqapcigmduuqiy.supabase.co/functions/v1/incoming-webhook';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Non autorisé' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(
      authHeader.replace('Bearer ', '')
    );
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ success: false, error: 'Token invalide' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { contact_id } = body;

    if (!contact_id) {
      return new Response(JSON.stringify({ success: false, error: 'contact_id requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch contact data using service role for full access
    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: contact, error: contactError } = await serviceClient
      .from('contacts')
      .select('id, prenom, nom, email, telephone, formation')
      .eq('id', contact_id)
      .single();

    if (contactError || !contact) {
      return new Response(JSON.stringify({ success: false, error: 'Contact introuvable' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send to Drive Flow webhook
    const payload = {
      event: 'student.created',
      timestamp: new Date().toISOString(),
      data: {
        id: contact.id,
        first_name: contact.prenom,
        last_name: contact.nom,
        email: contact.email || null,
        phone: contact.telephone || null,
        activity_type: contact.formation || 'auto_ecole',
      },
    };

    const driveFlowResponse = await fetch(DRIVEFLOW_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const driveFlowResult = await driveFlowResponse.json();

    if (!driveFlowResponse.ok || !driveFlowResult.success) {
      throw new Error(driveFlowResult.error || `Drive Flow a répondu avec le statut ${driveFlowResponse.status}`);
    }

    // Log the sync in contact history
    await serviceClient.from('contact_historique').insert({
      contact_id: contact.id,
      type: 'note',
      titre: '[AUTO] Envoyé vers Drive Flow',
      contenu: `Apprenant synchronisé vers la plateforme Drive Flow (formation: ${contact.formation || 'non précisée'})`,
      date_echange: new Date().toISOString(),
    });

    // Log in action_logs
    await serviceClient.from('action_logs').insert({
      entity_type: 'contact',
      entity_id: contact.id,
      action_type: 'sync_driveflow',
      label: `Sync Drive Flow: ${contact.prenom} ${contact.nom}`,
      user_id: claimsData.claims.sub,
    });

    return new Response(JSON.stringify({
      success: true,
      contact_id: contact.id,
      driveflow_contact_id: driveFlowResult.contact_id,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Sync Drive Flow error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
