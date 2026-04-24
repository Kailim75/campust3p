import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch CRM data for analysis
    const today = new Date().toISOString().split("T")[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

    const [
      contactsRes,
      inscriptionsRes,
      facturesRes,
      paiementsRes,
      sessionsRes,
      historiqueRes,
      rappelsRes,
    ] = await Promise.all([
      supabase
        .from("contacts")
        .select("id, nom, prenom, statut, formation, email, telephone, created_at, updated_at, archived")
        .eq("archived", false)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("session_inscriptions")
        .select("id, contact_id, session_id, statut, date_inscription, created_at")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("factures")
        .select("id, contact_id, numero_facture, montant_total, statut, date_emission, date_echeance")
        .in("statut", ["emise", "en_retard", "partiel"])
        .order("date_emission", { ascending: false })
        .limit(100),
      supabase
        .from("paiements")
        .select("id, facture_id, montant, date_paiement, mode_paiement")
        .gte("date_paiement", thirtyDaysAgo)
        .limit(100),
      supabase
        .from("sessions")
        .select("id, nom, statut, date_debut, date_fin, formation_type, places_max, archived")
        .eq("archived", false)
        .order("date_debut", { ascending: false })
        .limit(50),
      supabase
        .from("contact_historique")
        .select("id, contact_id, type, titre, date_echange, date_rappel, alerte_active")
        .eq("alerte_active", true)
        .limit(50),
      supabase
        .from("contact_historique")
        .select("id, contact_id, date_rappel, rappel_description, alerte_active")
        .eq("alerte_active", true)
        .not("date_rappel", "is", null)
        .lte("date_rappel", today)
        .limit(50),
    ]);

    // Build context summary
    const contacts = contactsRes.data || [];
    const inscriptions = inscriptionsRes.data || [];
    const factures = facturesRes.data || [];
    const paiements = paiementsRes.data || [];
    const sessions = sessionsRes.data || [];
    const alertesActives = historiqueRes.data || [];
    const rappelsEnRetard = rappelsRes.data || [];

    // Compute stats
    const contactsSansEmail = contacts.filter((c: any) => !c.email).length;
    const contactsSansTel = contacts.filter((c: any) => !c.telephone).length;
    const contactsEnAttente = contacts.filter((c: any) => c.statut === "en_attente").length;
    const facturesEnRetard = factures.filter((f: any) => f.statut === "en_retard").length;
    const montantEnRetard = factures
      .filter((f: any) => f.statut === "en_retard")
      .reduce((sum: number, f: any) => sum + (f.montant_total || 0), 0);
    const facturesPartiel = factures.filter((f: any) => f.statut === "partiel").length;

    // Sessions analysis
    const sessionsActives = sessions.filter(
      (s: any) => s.date_debut && s.date_debut <= today && (!s.date_fin || s.date_fin >= today)
    );
    const sessionsFutures = sessions.filter((s: any) => s.date_debut && s.date_debut > today);

    const crmContext = `
## Données CRM au ${today}

### Contacts (${contacts.length} chargés, derniers 200)
- Sans email: ${contactsSansEmail}
- Sans téléphone: ${contactsSansTel}
- En attente de traitement: ${contactsEnAttente}
- Contacts créés ces 7 derniers jours: ${contacts.filter((c: any) => c.created_at >= sevenDaysAgo).length}

### Inscriptions (${inscriptions.length} dernières)
- Statuts: ${JSON.stringify(
      inscriptions.reduce((acc: any, i: any) => {
        acc[i.statut] = (acc[i.statut] || 0) + 1;
        return acc;
      }, {})
    )}

### Factures ouvertes
- En retard: ${facturesEnRetard} (${montantEnRetard.toFixed(2)}€)
- Partiellement payées: ${facturesPartiel}
- Total factures émises non soldées: ${factures.length}

### Sessions
- Actives en cours: ${sessionsActives.length}
- Futures planifiées: ${sessionsFutures.length}
- Total chargées: ${sessions.length}

### Alertes & Rappels
- Alertes actives non traitées: ${alertesActives.length}
- Rappels en retard (date dépassée): ${rappelsEnRetard.length}

### Données brutes échantillon (pour analyse fine)
Factures en retard: ${JSON.stringify(
      factures
        .filter((f: any) => f.statut === "en_retard")
        .slice(0, 10)
        .map((f: any) => ({
          numero: f.numero_facture,
          montant: f.montant_total,
          echeance: f.date_echeance,
        }))
    )}

Rappels en retard: ${JSON.stringify(
      rappelsEnRetard.slice(0, 10).map((r: any) => ({
        contact_id: r.contact_id,
        date_rappel: r.date_rappel,
        description: r.rappel_description,
      }))
    )}
`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { analysisType } = await req.json().catch(() => ({ analysisType: "full" }));

    const systemPrompt = `Tu es un analyste CRM expert pour un centre de formation professionnelle (transport: VTC, Taxi, VMDTR). 
Tu analyses les données en temps réel et détectes les anomalies, risques et opportunités.

Tu dois fournir une analyse structurée avec:
1. 🚨 **Alertes critiques** - problèmes nécessitant une action immédiate (factures en retard important, inscriptions bloquées, etc.)
2. ⚠️ **Anomalies détectées** - incohérences dans les données (contacts sans coordonnées, inscriptions orphelines, etc.)
3. 💡 **Recommandations** - actions concrètes à entreprendre pour améliorer la gestion
4. 📊 **Score de santé CRM** - note sur 100 avec justification
5. 🔄 **Relances prioritaires** - les 5 actions de relance les plus urgentes avec le détail

Sois concis, direct et actionnable. Utilise des emojis pour la lisibilité. Formate en Markdown.
Termine toujours par un résumé en une phrase du statut global.`;

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
          {
            role: "user",
            content: `Analyse les données CRM suivantes et fournis ton rapport d'anomalies et recommandations:\n\n${crmContext}`,
          },
        ],
        stream: true,
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
          JSON.stringify({ error: "Crédits IA insuffisants. Rechargez votre espace de travail." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("crm-analysis error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
