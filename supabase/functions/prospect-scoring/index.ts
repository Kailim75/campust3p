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

    // Use service role for batch operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify user auth
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve user's centre_id
    const { data: userCentre, error: centreError } = await supabaseAdmin
      .from("user_centres")
      .select("centre_id")
      .eq("user_id", user.id)
      .eq("is_primary", true)
      .maybeSingle();
    if (centreError) throw centreError;
    if (!userCentre?.centre_id) {
      return new Response(JSON.stringify({ error: "Aucun centre associé" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const centreId = userCentre.centre_id;

    // Fetch all active prospects for this centre
    const { data: prospects, error: pError } = await supabaseAdmin
      .from("prospects")
      .select("*")
      .eq("is_active", true)
      .eq("centre_id", centreId);
    if (pError) throw pError;

    // Fetch historique counts per prospect — filtered to this centre's prospects only
    const prospectIds = (prospects || []).map((p: any) => p.id);
    let historique: any[] = [];
    if (prospectIds.length > 0) {
      const { data: hData, error: hError } = await supabaseAdmin
        .from("prospect_historique")
        .select("prospect_id, type, resultat")
        .in("prospect_id", prospectIds);
      if (hError) throw hError;
      historique = hData || [];
    }

    // Fetch formation prices from catalogue
    const { data: formations, error: fError } = await supabaseAdmin
      .from("catalogue_formations")
      .select("intitule, code, prix_ht, type_formation")
      .eq("actif", true);
    if (fError) throw fError;

    // Build historique map
    const historiqueMap: Record<string, { count: number; types: string[]; resultats: string[] }> = {};
    for (const h of historique || []) {
      if (!historiqueMap[h.prospect_id]) {
        historiqueMap[h.prospect_id] = { count: 0, types: [], resultats: [] };
      }
      historiqueMap[h.prospect_id].count++;
      if (h.type) historiqueMap[h.prospect_id].types.push(h.type);
      if (h.resultat) historiqueMap[h.prospect_id].resultats.push(h.resultat);
    }

    // Formation price map (approximate matching)
    const formationPriceMap: Record<string, number> = {};
    for (const f of formations || []) {
      formationPriceMap[f.intitule?.toLowerCase() || ""] = f.prix_ht || 0;
      formationPriceMap[f.code?.toLowerCase() || ""] = f.prix_ht || 0;
      formationPriceMap[f.type_formation?.toLowerCase() || ""] = f.prix_ht || 0;
    }

    const now = Date.now();
    const scoringResults = [];

    for (const prospect of prospects || []) {
      const hist = historiqueMap[prospect.id] || { count: 0, types: [], resultats: [] };
      const daysSinceCreation = Math.floor((now - new Date(prospect.created_at).getTime()) / 86400000);
      
      let score = 50; // Base score
      const facteurs_positifs: string[] = [];
      const facteurs_negatifs: string[] = [];

      // 1. Interactions count (+5 per interaction, max +25)
      const interactionBonus = Math.min(hist.count * 5, 25);
      score += interactionBonus;
      if (hist.count >= 3) facteurs_positifs.push(`${hist.count} interactions enregistrées`);

      // 2. Recency penalty (-1 per day after 7 days, max -30)
      if (daysSinceCreation > 7) {
        const recencyPenalty = Math.min((daysSinceCreation - 7), 30);
        score -= recencyPenalty;
        if (daysSinceCreation > 30) facteurs_negatifs.push(`Prospect créé il y a ${daysSinceCreation} jours`);
      } else {
        facteurs_positifs.push("Prospect récent");
      }

      // 3. Has email/phone (+5 each)
      if (prospect.email) { score += 5; facteurs_positifs.push("Email renseigné"); }
      else { score -= 5; facteurs_negatifs.push("Email manquant"); }
      if (prospect.telephone) { score += 5; facteurs_positifs.push("Téléphone renseigné"); }
      else { score -= 3; facteurs_negatifs.push("Téléphone manquant"); }

      // 4. Formation specified (+10)
      if (prospect.formation_souhaitee) {
        score += 10;
        facteurs_positifs.push(`Formation identifiée: ${prospect.formation_souhaitee}`);
      } else {
        score -= 5;
        facteurs_negatifs.push("Aucune formation identifiée");
      }

      // 5. Status-based scoring
      if (prospect.statut === "contacte") { score += 5; }
      if (prospect.statut === "relance") { score += 10; facteurs_positifs.push("Déjà relancé"); }
      if (prospect.statut === "nouveau") { score -= 5; facteurs_negatifs.push("Pas encore contacté"); }

      // 6. Priority boost
      if (prospect.priorite === "urgente") { score += 10; facteurs_positifs.push("Priorité urgente"); }
      if (prospect.priorite === "haute") { score += 5; facteurs_positifs.push("Priorité haute"); }

      // 7. Source quality
      const highValueSources = ["recommandation", "parrainage", "partenaire", "bouche-a-oreille"];
      if (prospect.source && highValueSources.some(s => prospect.source?.toLowerCase().includes(s))) {
        score += 10;
        facteurs_positifs.push(`Source qualifiée: ${prospect.source}`);
      }

      // 8. Positive results in historique
      const positiveResults = hist.resultats.filter(r => 
        r && (r.toLowerCase().includes("intéressé") || r.toLowerCase().includes("positif") || r.toLowerCase().includes("rdv"))
      );
      if (positiveResults.length > 0) {
        score += 10;
        facteurs_positifs.push("Retours positifs lors des échanges");
      }

      // Clamp score
      score = Math.max(0, Math.min(100, score));

      // Probabilité de conversion
      const probabilite = Math.round((score / 100) * 10000) / 10000;

      // Valeur potentielle
      let prixFormation = 1500; // Default
      if (prospect.formation_souhaitee) {
        const key = prospect.formation_souhaitee.toLowerCase();
        for (const [k, v] of Object.entries(formationPriceMap)) {
          if (k && key.includes(k) || k.includes(key)) {
            prixFormation = v;
            break;
          }
        }
      }
      const valeurPotentielle = Math.round(prixFormation * probabilite * 100) / 100;

      // Niveau chaleur
      let niveau_chaleur = "froid";
      if (score >= 75) niveau_chaleur = "brulant";
      else if (score >= 55) niveau_chaleur = "chaud";
      else if (score >= 35) niveau_chaleur = "tiede";

      // Délai optimal relance
      let delai_optimal_relance = 7;
      if (niveau_chaleur === "brulant") delai_optimal_relance = 1;
      else if (niveau_chaleur === "chaud") delai_optimal_relance = 3;
      else if (niveau_chaleur === "tiede") delai_optimal_relance = 5;

      scoringResults.push({
        prospect_id: prospect.id,
        centre_id: centreId,
        score_conversion: score,
        probabilite_conversion: probabilite,
        valeur_potentielle_euros: valeurPotentielle,
        niveau_chaleur,
        delai_optimal_relance,
        facteurs_positifs,
        facteurs_negatifs,
        date_derniere_analyse: new Date().toISOString(),
      });
    }

    // Upsert all scores
    if (scoringResults.length > 0) {
      const { error: upsertError } = await supabaseAdmin
        .from("ia_prospect_scoring")
        .upsert(scoringResults, { onConflict: "prospect_id" });
      if (upsertError) throw upsertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        prospects_scored: scoringResults.length,
        summary: {
          brulant: scoringResults.filter(s => s.niveau_chaleur === "brulant").length,
          chaud: scoringResults.filter(s => s.niveau_chaleur === "chaud").length,
          tiede: scoringResults.filter(s => s.niveau_chaleur === "tiede").length,
          froid: scoringResults.filter(s => s.niveau_chaleur === "froid").length,
          valeur_totale: scoringResults.reduce((sum, s) => sum + s.valeur_potentielle_euros, 0),
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("prospect-scoring error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
