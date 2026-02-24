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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify user
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

    // Optional custom weights from request body
    const body = await req.json().catch(() => ({}));
    const ponderations = {
      sante: body.ponderations?.sante ?? 0.25,
      commercial: body.ponderations?.commercial ?? 0.25,
      admin: body.ponderations?.admin ?? 0.20,
      financier: body.ponderations?.financier ?? 0.20,
      risque_ca: body.ponderations?.risque_ca ?? 0.10,
    };

    // Normalize weights to 1.0
    const totalWeight = Object.values(ponderations).reduce((a: number, b: number) => a + b, 0);
    if (Math.abs(totalWeight - 1.0) > 0.01) {
      const factor = 1.0 / totalWeight;
      for (const k of Object.keys(ponderations)) {
        (ponderations as any)[k] *= factor;
      }
    }

    const today = new Date().toISOString().split("T")[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

    // Fetch all data in parallel — filtered by centre_id
    const [
      contactsRes, prospectsRes, facturesRes, sessionsRes,
      inscriptionsRes, historiqueRes, paiementsRes, scoringsRes
    ] = await Promise.all([
      supabaseAdmin.from("contacts").select("id, email, telephone, statut, formation, created_at, archived").eq("archived", false).eq("centre_id", centreId),
      supabaseAdmin.from("prospects").select("id, statut, is_active, created_at").eq("is_active", true).eq("centre_id", centreId),
      supabaseAdmin.from("factures").select("id, montant_total, statut, date_echeance, centre_id").in("statut", ["emise", "en_retard", "partiel", "payee"]).eq("centre_id", centreId),
      supabaseAdmin.from("sessions").select("id, statut, date_debut, date_fin, places_max, archived, centre_id").eq("archived", false).eq("centre_id", centreId),
      supabaseAdmin.from("session_inscrits").select("id, session_id, statut"),
      supabaseAdmin.from("contact_historique").select("id, alerte_active, date_rappel").eq("alerte_active", true),
      supabaseAdmin.from("paiements").select("id, montant, date_paiement").gte("date_paiement", thirtyDaysAgo),
      supabaseAdmin.from("ia_prospect_scoring").select("score_conversion, niveau_chaleur").eq("centre_id", centreId),
    ]);

    const contacts = contactsRes.data || [];
    const prospects = prospectsRes.data || [];
    const factures = facturesRes.data || [];
    const sessions = sessionsRes.data || [];
    const inscriptions = inscriptionsRes.data || [];
    const alertes = historiqueRes.data || [];
    const paiements = paiementsRes.data || [];
    const scorings = scoringsRes.data || [];

    // ═══════════════════════════════════════
    // 1. SCORE SANTÉ CRM (qualité données)
    // ═══════════════════════════════════════
    const details_sante: Record<string, any> = {};
    const totalContacts = contacts.length;
    const contactsWithEmail = contacts.filter((c: any) => c.email).length;
    const contactsWithPhone = contacts.filter((c: any) => c.telephone).length;
    const tauxEmail = totalContacts > 0 ? contactsWithEmail / totalContacts : 0;
    const tauxPhone = totalContacts > 0 ? contactsWithPhone / totalContacts : 0;

    const alertesNonTraitees = alertes.filter((a: any) => {
      if (!a.date_rappel) return false;
      return a.date_rappel <= today;
    }).length;

    let score_sante = 50;
    score_sante += Math.round(tauxEmail * 25); // +25 max for email completeness
    score_sante += Math.round(tauxPhone * 15); // +15 max for phone
    score_sante -= Math.min(alertesNonTraitees * 2, 20); // -2 per overdue alert, max -20
    if (totalContacts > 50) score_sante += 10; // volume bonus
    score_sante = Math.max(0, Math.min(100, score_sante));
    details_sante.taux_email = Math.round(tauxEmail * 100);
    details_sante.taux_telephone = Math.round(tauxPhone * 100);
    details_sante.alertes_en_retard = alertesNonTraitees;
    details_sante.total_contacts = totalContacts;

    // ═══════════════════════════════════════
    // 2. SCORE COMMERCIAL (pipeline & conversion)
    // ═══════════════════════════════════════
    const details_commercial: Record<string, any> = {};
    const prospectsTotal = prospects.length;
    const prospectsConverted = prospects.filter((p: any) => p.statut === "converti").length;
    const tauxConversion = prospectsTotal > 0 ? prospectsConverted / prospectsTotal : 0;

    const prospectsChauds = scorings.filter((s: any) => s.niveau_chaleur === "brulant" || s.niveau_chaleur === "chaud").length;
    const scoreMoyen = scorings.length > 0
      ? Math.round(scorings.reduce((sum: number, s: any) => sum + s.score_conversion, 0) / scorings.length)
      : 0;

    let score_commercial = 30;
    score_commercial += Math.round(tauxConversion * 30); // conversion rate contributes up to 30
    score_commercial += Math.min(prospectsChauds * 3, 20); // hot prospects up to 20
    score_commercial += Math.round((scoreMoyen / 100) * 20); // average score up to 20
    score_commercial = Math.max(0, Math.min(100, score_commercial));
    details_commercial.prospects_total = prospectsTotal;
    details_commercial.taux_conversion = Math.round(tauxConversion * 100);
    details_commercial.prospects_chauds = prospectsChauds;
    details_commercial.score_moyen_prospects = scoreMoyen;

    // ═══════════════════════════════════════
    // 3. SCORE ADMINISTRATIF (inscriptions, sessions)
    // ═══════════════════════════════════════
    const details_admin: Record<string, any> = {};
    const sessionsActives = sessions.filter((s: any) => s.date_debut && s.date_debut <= today && (!s.date_fin || s.date_fin >= today));
    const sessionsFutures = sessions.filter((s: any) => s.date_debut && s.date_debut > today);

    // Remplissage moyen
    const remplissageScores: number[] = [];
    for (const session of sessionsActives) {
      const inscrits = inscriptions.filter((i: any) => i.session_id === (session as any).id && i.statut !== "annule").length;
      const places = (session as any).places_max || 15;
      remplissageScores.push(Math.min(inscrits / places, 1));
    }
    const remplissageMoyen = remplissageScores.length > 0
      ? remplissageScores.reduce((a, b) => a + b, 0) / remplissageScores.length
      : 0;

    let score_admin = 40;
    score_admin += Math.round(remplissageMoyen * 30); // fill rate up to 30
    score_admin += Math.min(sessionsFutures.length * 5, 20); // future sessions planned
    if (sessionsActives.length > 0) score_admin += 10;
    score_admin = Math.max(0, Math.min(100, score_admin));
    details_admin.sessions_actives = sessionsActives.length;
    details_admin.sessions_futures = sessionsFutures.length;
    details_admin.remplissage_moyen = Math.round(remplissageMoyen * 100);

    // ═══════════════════════════════════════
    // 4. SCORE FINANCIER (paiements, factures)
    // ═══════════════════════════════════════
    const details_financier: Record<string, any> = {};
    const facturesEnRetard = factures.filter((f: any) => f.statut === "en_retard");
    const montantEnRetard = facturesEnRetard.reduce((sum: number, f: any) => sum + (f.montant_total || 0), 0);
    const totalFacture = factures.reduce((sum: number, f: any) => sum + (f.montant_total || 0), 0);
    const tauxRetard = totalFacture > 0 ? montantEnRetard / totalFacture : 0;

    const ca30j = paiements.reduce((sum: number, p: any) => sum + (p.montant || 0), 0);

    let score_financier = 60;
    score_financier -= Math.round(tauxRetard * 40); // late invoices penalty
    score_financier -= Math.min(facturesEnRetard.length * 3, 20);
    if (ca30j > 10000) score_financier += 10;
    else if (ca30j > 5000) score_financier += 5;
    score_financier = Math.max(0, Math.min(100, score_financier));
    details_financier.factures_en_retard = facturesEnRetard.length;
    details_financier.montant_en_retard = Math.round(montantEnRetard);
    details_financier.ca_30_jours = Math.round(ca30j);
    details_financier.taux_retard = Math.round(tauxRetard * 100);

    // ═══════════════════════════════════════
    // 5. SCORE RISQUE PERTE CA
    // ═══════════════════════════════════════
    const details_risque: Record<string, any> = {};
    // Prospects froids = potential revenue loss
    const prospectsFroids = scorings.filter((s: any) => s.niveau_chaleur === "froid").length;
    const prospectsPerdus = prospects.filter((p: any) => p.statut === "perdu").length;
    
    // Sessions under-filled approaching start
    const sessionsRisquees = sessionsActives.concat(sessionsFutures.filter((s: any) => {
      const daysUntilStart = Math.floor((new Date((s as any).date_debut).getTime() - Date.now()) / 86400000);
      return daysUntilStart <= 14;
    })).filter((s: any) => {
      const inscrits = inscriptions.filter((i: any) => i.session_id === (s as any).id && i.statut !== "annule").length;
      return inscrits < ((s as any).places_max || 15) * 0.5;
    });

    let score_risque_ca = 80; // Start high (low risk = good)
    score_risque_ca -= Math.min(prospectsFroids * 2, 20);
    score_risque_ca -= Math.min(prospectsPerdus * 3, 15);
    score_risque_ca -= Math.min(sessionsRisquees.length * 10, 30);
    score_risque_ca -= Math.round(tauxRetard * 15);
    score_risque_ca = Math.max(0, Math.min(100, score_risque_ca));
    details_risque.prospects_froids = prospectsFroids;
    details_risque.prospects_perdus = prospectsPerdus;
    details_risque.sessions_a_risque = sessionsRisquees.length;

    // ═══════════════════════════════════════
    // SCORE GLOBAL PONDÉRÉ
    // ═══════════════════════════════════════
    const score_global = Math.round(
      score_sante * ponderations.sante +
      score_commercial * ponderations.commercial +
      score_admin * ponderations.admin +
      score_financier * ponderations.financier +
      score_risque_ca * ponderations.risque_ca
    );

    const snapshot = {
      centre_id: centreId,
      score_global,
      score_sante,
      score_commercial,
      score_admin,
      score_financier,
      score_risque_ca,
      details: {
        sante: details_sante,
        commercial: details_commercial,
        admin: details_admin,
        financier: details_financier,
        risque_ca: details_risque,
      },
      ponderations,
      date_snapshot: today,
    };

    // Upsert today's snapshot
    const { error: upsertError } = await supabaseAdmin
      .from("ia_score_history")
      .upsert(snapshot, { onConflict: "centre_id,date_snapshot" });

    if (upsertError) throw upsertError;

    return new Response(JSON.stringify({ success: true, snapshot }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("centre-scoring error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
