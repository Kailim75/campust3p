import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ALMA_API_URL = Deno.env.get('ALMA_MODE') === 'live'
  ? 'https://api.getalma.eu/v1'
  : 'https://api.sandbox.getalma.eu/v1';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const ALMA_API_KEY = Deno.env.get('ALMA_API_KEY');
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
      case 'eligibility': {
        // Vérifier l'éligibilité au paiement en plusieurs fois
        const response = await fetch(`${ALMA_API_URL}/payments/eligibility`, {
          method: 'POST',
          headers: almaHeaders,
          body: JSON.stringify({
            payment: {
              purchase_amount: params.amount, // en centimes
              installments_count: params.installments || [3, 4],
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
        // Créer un paiement Alma
        const response = await fetch(`${ALMA_API_URL}/payments`, {
          method: 'POST',
          headers: almaHeaders,
          body: JSON.stringify({
            payment: {
              purchase_amount: params.amount, // en centimes
              installments_count: params.installments || 3,
              return_url: params.return_url,
              customer_cancel_url: params.cancel_url,
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
