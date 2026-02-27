import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TRIGGER_TYPES = [
  "contact_created", "inscription_created", "payment_received", "exam_scheduled",
  "status_changed", "session_reminder_7d", "session_reminder_1d", "document_expired",
  "session_completed", "facture_overdue"
];

const ACTION_TYPES = ["send_email", "create_notification", "update_status", "create_historique", "add_delay", "webhook"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mode, context } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt = "";
    let userPrompt = "";

    if (mode === "generate_email") {
      systemPrompt = `Tu es un expert en rédaction d'emails professionnels pour les centres de formation Taxi/VTC en France.
Tu génères du contenu email en français, professionnel et personnalisé.
Tu utilises les variables moustache {{variable}} pour les données dynamiques.
Variables disponibles : {{prenom}}, {{nom}}, {{email}}, {{telephone}}, {{formation}}, {{session_nom}}, {{session_date_debut}}, {{session_date_fin}}, {{prix_total}}, {{numero_facture}}, {{centre_nom}}.

IMPORTANT: Tu dois retourner un JSON valide avec exactement cette structure :
{"subject": "...", "content": "..."}
Le contenu doit être du HTML simple avec des paragraphes <p>.
Ne retourne RIEN d'autre que le JSON.`;

      userPrompt = `Contexte du workflow :
- Déclencheur : ${context.trigger_type || "non défini"}
- Objectif : ${context.description || "email automatique standard"}
${context.custom_instructions ? `- Instructions : ${context.custom_instructions}` : ""}

Génère le sujet et le contenu HTML de l'email.`;

    } else if (mode === "suggest_workflow") {
      systemPrompt = `Tu es un expert en automatisation de processus pour les centres de formation professionnelle Taxi/VTC.
Tu conçois des workflows automatisés intelligents.

Déclencheurs disponibles : ${TRIGGER_TYPES.join(", ")}
Types d'actions disponibles : ${ACTION_TYPES.join(", ")}

Pour chaque action, fournis une config appropriée :
- send_email : { "subject": "...", "content": "..." } (HTML avec variables {{prenom}} etc.)
- create_notification : { "title": "...", "message": "...", "notification_type": "info|warning|success" }
- update_status : { "table": "contacts|factures|devis|sessions", "new_status": "..." }
- create_historique : { "type": "note|email|appel|rdv", "titre": "...", "contenu": "..." }
- add_delay : { "delay_minutes": number }
- webhook : { "url": "https://...", "method": "POST", "body": "{}" }

IMPORTANT: Tu dois retourner un JSON valide avec exactement cette structure :
{"nom": "...", "description": "...", "trigger_type": "...", "actions": [{"type": "...", "config": {...}}]}
Ne retourne RIEN d'autre que le JSON.`;

      userPrompt = `L'utilisateur décrit ce qu'il veut automatiser :
"${context.description}"

Conçois le workflow le plus adapté avec les actions appropriées. Sois créatif et propose 2-4 actions enchaînées pour un workflow complet et professionnel.`;

    } else {
      return new Response(
        JSON.stringify({ error: "Mode inconnu. Utilisez 'generate_email' ou 'suggest_workflow'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requêtes atteinte, réessayez dans quelques instants." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits IA épuisés." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erreur du service IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";

    // Clean markdown fences
    content = content.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();

    try {
      const parsed = JSON.parse(content);
      return new Response(
        JSON.stringify({ result: parsed, mode }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(
        JSON.stringify({ error: "L'IA n'a pas retourné un format valide. Réessayez." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (e) {
    console.error("generate-workflow-ai error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
