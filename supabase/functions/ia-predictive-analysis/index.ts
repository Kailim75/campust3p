import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Non authentifié");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Non authentifié");

    const { scorings, prospects, historique } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY non configurée");

    const systemPrompt = `Tu es un analyste prédictif spécialisé dans la conversion de prospects pour un centre de formation professionnelle (taxi, VTC).
Analyse les données des prospects et fournis des prédictions de conversion et des recommandations de relance optimales.
Réponds UNIQUEMENT via l'outil structuré.`;

    const userPrompt = `Voici les données prospects à analyser :

SCORINGS ACTUELS (${scorings?.length || 0} prospects) :
${JSON.stringify(scorings?.slice(0, 20) || [], null, 2)}

DÉTAILS PROSPECTS (top 20) :
${JSON.stringify(prospects?.slice(0, 20) || [], null, 2)}

HISTORIQUE INTERACTIONS (dernières 50) :
${JSON.stringify(historique?.slice(0, 50) || [], null, 2)}

Analyse les patterns et génère des prédictions de conversion avec recommandations.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_predictive_analysis",
            description: "Génère une analyse prédictive des prospects",
            parameters: {
              type: "object",
              properties: {
                resume: { type: "string", description: "Résumé de l'analyse en 2-3 phrases" },
                taux_conversion_predit: { type: "number", description: "Taux de conversion prédit pour les 30 prochains jours (%)" },
                ca_predit_30j: { type: "number", description: "CA prédit à 30 jours basé sur l'analyse" },
                prospects_prioritaires: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      prospect_id: { type: "string" },
                      probabilite_conversion: { type: "number", description: "Probabilité de conversion prédite (0-100)" },
                      canal_optimal: { type: "string", enum: ["email", "telephone", "sms", "whatsapp", "rdv_physique"] },
                      moment_optimal: { type: "string", description: "Meilleur moment pour relancer (ex: 'lundi matin', 'dans 2 jours')" },
                      message_suggere: { type: "string", description: "Suggestion de message personnalisé" },
                      facteurs_cles: { type: "array", items: { type: "string" }, description: "Facteurs influençant la décision" },
                    },
                    required: ["prospect_id", "probabilite_conversion", "canal_optimal", "moment_optimal"],
                  },
                },
                tendances: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      tendance: { type: "string", description: "Description de la tendance observée" },
                      impact: { type: "string", enum: ["positif", "negatif", "neutre"] },
                      recommandation: { type: "string" },
                    },
                    required: ["tendance", "impact", "recommandation"],
                  },
                },
                segments: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      nom: { type: "string", description: "Nom du segment" },
                      count: { type: "number" },
                      conversion_rate: { type: "number" },
                      strategie: { type: "string" },
                    },
                    required: ["nom", "count", "conversion_rate", "strategie"],
                  },
                },
              },
              required: ["resume", "taux_conversion_predit", "ca_predit_30j", "prospects_prioritaires", "tendances"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "generate_predictive_analysis" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requêtes atteinte" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA insuffisants" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("Erreur du service IA");
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("Pas de réponse structurée de l'IA");

    const analysis = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ia-predictive-analysis error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
