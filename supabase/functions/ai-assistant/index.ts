import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { message, action, userId } = await req.json();

    if (!message) {
      throw new Error("Message is required");
    }

    // Build context based on action
    let systemContext = '';
    
    if (action === 'analyze_performance' || action === 'daily_suggestion') {
      // Get exam stats
      const { data: examens } = await supabase
        .from('examens_t3p')
        .select('type_formation, resultat, score')
        .not('resultat', 'is', null);

      // Get recent sessions
      const { data: sessions } = await supabase
        .from('sessions')
        .select('statut, date_debut, date_fin, formation_type')
        .gte('date_debut', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

      // Get contacts count
      const { count: totalContacts } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true });

      const { count: activeClients } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .in('statut', ['Stagiaire', 'Client']);

      // Calculate success rate
      const successRate = examens && examens.length > 0
        ? Math.round((examens.filter(e => e.resultat === 'reussi').length / examens.length) * 100)
        : 0;

      systemContext = `
Données CRM actuelles :
- ${examens?.length || 0} examens T3P avec résultats
- Taux de réussite global : ${successRate}%
- ${sessions?.length || 0} sessions de formation sur les 3 derniers mois
- ${totalContacts || 0} contacts total, dont ${activeClients || 0} clients actifs
- Répartition examens par type : ${JSON.stringify(groupByType(examens || []))}
`;
    }

    if (action === 'generate_email') {
      const { data: centre } = await supabase
        .from('centre_formation')
        .select('*')
        .single();

      systemContext = `
Informations du centre de formation :
- Nom : ${centre?.nom_commercial || 'N/A'}
- Email : ${centre?.email || 'N/A'}
- Téléphone : ${centre?.telephone || 'N/A'}
- Adresse : ${centre?.adresse_complete || 'N/A'}
- NDA : ${centre?.nda || 'N/A'}
- Responsable : ${centre?.responsable_legal_nom || 'N/A'}
`;
    }

    // Call Lovable AI Gateway
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: `Tu es un assistant IA expert en gestion de centres de formation Taxi/VTC en France.

Tu aides les utilisateurs à :
- Analyser leurs performances (taux de réussite, statistiques)
- Générer du contenu professionnel (emails, documents)
- Répondre aux questions sur la réglementation T3P
- Donner des conseils pour améliorer les résultats des stagiaires

${systemContext}

Instructions :
- Réponds de manière concise, professionnelle et en français
- Si tu ne connais pas une information, dis-le clairement
- Pour les analyses, utilise les données fournies ci-dessus
- Pour les emails, génère un texte prêt à l'emploi
- Donne des conseils pratiques et actionnables`
          },
          {
            role: 'user',
            content: message
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Limite de requêtes atteinte. Veuillez réessayer dans quelques instants.",
          success: false 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "Crédits IA épuisés. Veuillez ajouter des crédits à votre workspace.",
          success: false 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content || "Je n'ai pas pu générer de réponse.";

    // Log the interaction
    if (userId) {
      await supabase.from('ai_assistant_logs').insert({
        user_id: userId,
        user_message: message,
        assistant_response: assistantMessage,
        action: action || 'general',
      });
    }

    return new Response(
      JSON.stringify({ 
        response: assistantMessage,
        success: true 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-assistant function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function groupByType(examens: Array<{ type_formation: string; resultat: string | null }>) {
  const grouped: Record<string, { total: number; reussi: number }> = {};
  
  for (const examen of examens) {
    if (!grouped[examen.type_formation]) {
      grouped[examen.type_formation] = { total: 0, reussi: 0 };
    }
    grouped[examen.type_formation].total++;
    if (examen.resultat === 'reussi') {
      grouped[examen.type_formation].reussi++;
    }
  }
  
  return grouped;
}
