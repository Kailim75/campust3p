import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DRIVEFLOW_WEBHOOK_URL = Deno.env.get('DRIVEFLOW_WEBHOOK_URL') ?? 'https://zhgbbujqapcigmduuqiy.supabase.co/functions/v1/incoming-webhook';
const DRIVEFLOW_WEBHOOK_SECRET = Deno.env.get('DRIVEFLOW_WEBHOOK_SECRET') ?? Deno.env.get('WEBHOOK_SECRET');

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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate user token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
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

    // Fetch contact data
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id, prenom, nom, email, telephone, formation, centre_id')
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
        centre_id: contact.centre_id,
      },
    };

    const driveFlowHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (DRIVEFLOW_WEBHOOK_SECRET) {
      driveFlowHeaders['x-webhook-secret'] = DRIVEFLOW_WEBHOOK_SECRET;
    }

    console.log('Sending to Drive Flow:', DRIVEFLOW_WEBHOOK_URL);
    console.log('Payload:', JSON.stringify(payload));
    console.log('Has webhook secret:', !!DRIVEFLOW_WEBHOOK_SECRET);

    const driveFlowResponse = await fetch(DRIVEFLOW_WEBHOOK_URL, {
      method: 'POST',
      headers: driveFlowHeaders,
      body: JSON.stringify(payload),
    });

    const responseText = await driveFlowResponse.text();
    console.log('Drive Flow response status:', driveFlowResponse.status);
    console.log('Drive Flow response body:', responseText);

    let driveFlowResult: any = {};
    try { driveFlowResult = JSON.parse(responseText); } catch {}

    if (!driveFlowResponse.ok || driveFlowResult?.success === false) {
      throw new Error(driveFlowResult?.error || `Drive Flow a répondu avec le statut ${driveFlowResponse.status}`);
    }

    // Log the sync in contact history
    await supabase.from('contact_historique').insert({
      contact_id: contact.id,
      type: 'note',
      titre: '[AUTO] Envoyé vers Drive Flow',
      contenu: `Apprenant synchronisé vers la plateforme Drive Flow (formation: ${contact.formation || 'non précisée'})`,
      date_echange: new Date().toISOString(),
    });

    // Log in action_logs
    await supabase.from('action_logs').insert({
      entity_type: 'contact',
      entity_id: contact.id,
      action_type: 'sync_driveflow',
      label: `Sync Drive Flow: ${contact.prenom} ${contact.nom}`,
      user_id: user.id,
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
