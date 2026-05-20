// Sprint 8 — Stub de transmission d'une facture vers une PDP.
// Étape 1 : vérifie la conformité, génère le Factur-X si manquant, crée une
// entrée `facture_pdp_transmissions` et met à jour le statut sur la facture.
// L'appel HTTP réel à la PDP cible reste à brancher quand les credentials
// (clés API + URL) seront fournis par l'utilisateur via `add_secret`.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handlePreflight } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  const corsHeaders = getCorsHeaders(req);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const body = await req.json().catch(() => ({}));
    const factureId: string | undefined = body?.facture_id;
    const pdpTarget: string = body?.pdp_target ?? "ppf";
    if (!factureId) {
      return new Response(JSON.stringify({ error: "facture_id manquant" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Récupérer facture + centre
    const { data: facture, error: fErr } = await supabase
      .from("factures")
      .select("id, centre_id, statut, compliance_score, facturx_xml")
      .eq("id", factureId)
      .maybeSingle();
    if (fErr) throw fErr;
    if (!facture) {
      return new Response(JSON.stringify({ error: "facture introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (facture.statut === "brouillon") {
      return new Response(
        JSON.stringify({ error: "Impossible de transmettre une facture brouillon. Émettez-la d'abord." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Vérifier seuil de conformité du centre
    const { data: centre } = await supabase
      .from("centres")
      .select("settings")
      .eq("id", facture.centre_id)
      .maybeSingle();
    const threshold = Number((centre?.settings as any)?.einv_blocking_threshold ?? 70);

    const { data: comp } = await supabase.rpc("compute_invoice_compliance", { p_facture_id: factureId });
    const score = Number((comp as any)?.score ?? facture.compliance_score ?? 0);
    if (score < threshold) {
      return new Response(
        JSON.stringify({
          error: `Score de conformité ${score}/100 inférieur au seuil du centre (${threshold}). Corrigez la facture avant transmission.`,
          score,
          threshold,
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3. Générer Factur-X si manquant (réutilise l'autre edge function)
    if (!facture.facturx_xml) {
      const r = await fetch(`${supabaseUrl}/functions/v1/generate-facturx`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({ facture_id: factureId }),
      });
      if (!r.ok) {
        const t = await r.text();
        throw new Error(`Échec génération Factur-X : ${t}`);
      }
    }

    // 4. Créer entrée d'historique de transmission
    const { data: tx, error: tErr } = await supabase
      .from("facture_pdp_transmissions")
      .insert({
        facture_id: factureId,
        centre_id: facture.centre_id,
        pdp_target: pdpTarget,
        statut: "en_attente",
        payload: { facture_id: factureId, pdp_target: pdpTarget, compliance_score: score },
      })
      .select()
      .single();
    if (tErr) throw tErr;

    // 5. TODO : appel HTTP réel à la PDP cible
    //    À activer quand les credentials seront fournis (PDP_API_KEY, PDP_BASE_URL...)
    //    Pour l'instant on simule un envoi réussi (statut "envoye").
    const pdpReference = `LOCAL-${Date.now()}`;
    await supabase
      .from("facture_pdp_transmissions")
      .update({
        statut: "envoye",
        pdp_reference: pdpReference,
        response: { simulated: true, message: "Transmission simulée — intégration PDP réelle à brancher." },
      })
      .eq("id", tx.id);

    // 6. Mettre à jour la facture
    await supabase
      .from("factures")
      .update({
        e_invoice_status: "envoye",
        platform_provider: pdpTarget,
        platform_reference_id: pdpReference,
        platform_last_sync_at: new Date().toISOString(),
      })
      .eq("id", factureId);

    return new Response(
      JSON.stringify({
        ok: true,
        transmission_id: tx.id,
        pdp_reference: pdpReference,
        simulated: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[submit-pdp]", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
