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
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Non authentifié");

    const { anomalies, scorings, latestScore, projections } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY non configurée");

    const systemPrompt = `Tu es un directeur stratégique IA pour un centre de formation professionnelle (taxi, VTC).
Ton rôle : générer un plan d'action quotidien priorisé et actionnable à partir des données d'audit.

Réponds UNIQUEMENT avec le JSON structuré demandé via l'outil, pas de texte libre.
Chaque action doit être :
- Concrète et immédiatement exécutable
- Avec un impact financier estimé
- Classée par priorité (1 = la plus urgente)
- Avec un responsable suggéré (admin, commercial, formateur)`;

    const userPrompt = `Voici les données du centre aujourd'hui :

ANOMALIES DÉTECTÉES (${anomalies?.length || 0}) :
${JSON.stringify(anomalies?.slice(0, 10) || [], null, 2)}

SCORING PROSPECTS (${scorings?.length || 0} total, top 10) :
${JSON.stringify(scorings?.slice(0, 10) || [], null, 2)}

SCORE GLOBAL CENTRE :
${JSON.stringify(latestScore || "Non disponible")}

PROJECTIONS FINANCIÈRES :
${JSON.stringify(projections || "Non disponible")}

Génère le plan d'action du jour (5 à 8 actions maximum).`;

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
            name: "generate_action_plan",
            description: "Génère un plan d'action quotidien priorisé",
            parameters: {
              type: "object",
              properties: {
                plan_date: { type: "string", description: "Date du plan (YYYY-MM-DD)" },
                resume_executif: { type: "string", description: "Résumé en 2-3 phrases de la situation et des priorités" },
                actions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      priorite: { type: "number", description: "Rang de priorité (1 = plus urgent)" },
                      titre: { type: "string", description: "Titre court de l'action" },
                      description: { type: "string", description: "Description détaillée de l'action à mener" },
                      categorie: { type: "string", enum: ["commercial", "administratif", "financier", "qualite", "strategie"] },
                      impact_estime_euros: { type: "number", description: "Impact financier estimé en euros" },
                      responsable: { type: "string", enum: ["admin", "commercial", "formateur", "direction"] },
                      duree_estimee_minutes: { type: "number", description: "Temps estimé en minutes" },
                      anomaly_ids: { type: "array", items: { type: "string" }, description: "IDs des anomalies liées" },
                    },
                    required: ["priorite", "titre", "description", "categorie", "responsable"],
                  },
                },
                score_urgence_global: { type: "number", description: "Score d'urgence global du jour (0-100)" },
              },
              required: ["plan_date", "resume_executif", "actions", "score_urgence_global"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "generate_action_plan" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requêtes atteinte, réessayez plus tard" }), {
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

    const actionPlan = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(actionPlan), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ia-action-plan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
