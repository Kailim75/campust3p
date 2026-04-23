import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // In-code JWT validation
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    console.error('Auth validation failed:', userError?.message);
    return new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const ALMA_API_KEY = Deno.env.get('ALMA_API_KEY');
  
  // Detect mode: check ALMA_MODE first, but if it looks like an API key, auto-detect from key prefix
  let rawMode = Deno.env.get('ALMA_MODE') || 'test';
  if (rawMode.startsWith('sk_')) {
    // ALMA_MODE contains the API key by mistake, auto-detect from the key prefix
    rawMode = rawMode.startsWith('sk_live_') ? 'live' : 'test';
  }
  const almaMode = rawMode;
  
  const ALMA_API_URL = almaMode === 'live'
    ? 'https://api.getalma.eu/v1'
    : 'https://api.sandbox.getalma.eu/v1';
  
  console.log('Alma mode:', almaMode, '| API URL:', ALMA_API_URL);
  console.log('Alma API key configured:', !!ALMA_API_KEY, 'prefix:', ALMA_API_KEY?.substring(0, 8));
  
  if (!ALMA_API_KEY) {
    return new Response(JSON.stringify({ error: 'ALMA_API_KEY not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { action, ...params } = await req.json();

    const almaHeaders = {
      'Authorization': `Alma-Auth ${ALMA_API_KEY}`,
      'Content-Type': 'application/json',
    };

    let result;

    switch (action) {
      case 'check_mode': {
        // Lightweight check returning the current Alma mode without any API call
        result = { mode: almaMode, api_url: ALMA_API_URL };
        break;
      }

      case 'eligibility': {
        // Vérifier l'éligibilité au paiement en plusieurs fois
        const response = await fetch(`${ALMA_API_URL}/payments/eligibility`, {
          method: 'POST',
          headers: almaHeaders,
          body: JSON.stringify({
            payment: {
              purchase_amount: params.amount, // en centimes
              installments_count: params.installments || [1, 2, 3, 4],
              buyer_billing_address: params.billing_address || undefined,
            },
          }),
        });
        result = await response.json();
        if (!response.ok) {
          throw new Error(`Alma eligibility failed [${response.status}]: ${JSON.stringify(result)}`);
        }
        break;
      }

      case 'create_payment': {
        // Créer un paiement Alma avec IPN callback
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
        const ipnUrl = `${SUPABASE_URL}/functions/v1/alma-webhook`;
        console.log('Alma IPN callback URL:', ipnUrl);
        
        const response = await fetch(`${ALMA_API_URL}/payments`, {
          method: 'POST',
          headers: almaHeaders,
          body: JSON.stringify({
            payment: {
              purchase_amount: params.amount, // en centimes
              installments_count: params.installments || 3,
              return_url: params.return_url,
              customer_cancel_url: params.cancel_url,
              ipn_callback_url: ipnUrl,
              locale: 'fr',
              custom_data: params.custom_data || {},
            },
            customer: {
              first_name: params.customer?.first_name,
              last_name: params.customer?.last_name,
              email: params.customer?.email,
              phone: params.customer?.phone || undefined,
            },
          }),
        });
        result = await response.json();
        if (!response.ok) {
          throw new Error(`Alma create payment failed [${response.status}]: ${JSON.stringify(result)}`);
        }
        break;
      }

      case 'get_payment': {
        // Récupérer les détails d'un paiement
        const response = await fetch(`${ALMA_API_URL}/payments/${params.payment_id}`, {
          method: 'GET',
          headers: almaHeaders,
        });
        result = await response.json();
        if (!response.ok) {
          throw new Error(`Alma get payment failed [${response.status}]: ${JSON.stringify(result)}`);
        }
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Alma payment error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
