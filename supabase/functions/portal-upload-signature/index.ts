import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handlePreflight } from "../_shared/cors.ts";

/**
 * Portail apprenant (anonyme) — téléversement de la signature d'un émargement.
 *
 * Le portail authentifie l'apprenant par un jeton opaque (RPC
 * `validate_learner_portal_token`, appelée aussi par LearnerPortal.tsx),
 * PAS par une session Supabase : le rôle `anon` n'a AUCUN droit sur le
 * bucket privé "signatures" — les policies `sig_*` (migration
 * 20260305171158) sont réservées à `authenticated` + admin/staff/super_admin.
 * Le téléversement direct depuis LearnerEmargementTab est donc refusé par la
 * RLS quel que soit le préfixe du chemin. Cette edge function, exécutée avec
 * la clé service_role, est le seul point d'entrée capable d'écrire dans ce
 * bucket pour le portail :
 *  - elle revalide le jeton elle-même (jamais de confiance dans un
 *    contact_id envoyé par le client) ;
 *  - elle résout le centre depuis la session en base (jamais depuis une
 *    entrée client) ;
 *  - elle vérifie qu'au moins une ligne a réellement été mise à jour avant
 *    de répondre un succès (une clause WHERE qui ne trouve rien renvoie
 *    "succès, 0 ligne" côté PostgREST — jamais une erreur).
 */

interface UploadRequest {
  token?: string;
  emargementId?: string;
  signatureDataBase64?: string;
  userAgent?: string;
}

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  const corsHeaders = getCorsHeaders(req);

  const jsonResponse = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Méthode non autorisée" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body: UploadRequest = await req.json().catch(() => ({}));
    const { token, emargementId, signatureDataBase64 } = body;

    if (!token || !emargementId || !signatureDataBase64) {
      return jsonResponse({ success: false, error: "Paramètres manquants" }, 400);
    }

    // ── 1. Revalider le jeton du portail (même RPC que LearnerPortal.tsx) ──
    const { data: tokenRows, error: tokenError } = await supabase.rpc(
      "validate_learner_portal_token",
      { p_token: token },
    );
    if (tokenError) {
      console.error("[portal-upload-signature] erreur de validation du jeton:", tokenError);
      return jsonResponse({ success: false, error: "Lien invalide ou expiré" }, 401);
    }
    const tokenData = Array.isArray(tokenRows) ? tokenRows[0] : tokenRows;
    if (!tokenData) {
      return jsonResponse({ success: false, error: "Lien invalide ou expiré" }, 401);
    }
    if (tokenData.expire_at && new Date(tokenData.expire_at) < new Date()) {
      return jsonResponse({ success: false, error: "Ce lien a expiré" }, 401);
    }

    // ── 2. Charger l'émargement et vérifier qu'il appartient à ce contact ──
    const { data: emargement, error: emargementError } = await supabase
      .from("emargements")
      .select("id, contact_id, session_id")
      .eq("id", emargementId)
      .is("deleted_at", null)
      .maybeSingle();

    if (emargementError || !emargement) {
      return jsonResponse({ success: false, error: "Émargement introuvable" }, 404);
    }
    if (emargement.contact_id !== tokenData.contact_id) {
      return jsonResponse(
        { success: false, error: "Cet émargement n'appartient pas à ce compte" },
        403,
      );
    }

    // ── 3. Résoudre le centre depuis la session (jamais depuis le client) ──
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("centre_id")
      .eq("id", emargement.session_id)
      .maybeSingle();

    if (sessionError || !session?.centre_id) {
      console.error("[portal-upload-signature] centre introuvable pour la session:", sessionError);
      return jsonResponse({ success: false, error: "Centre introuvable pour cet émargement" }, 500);
    }

    // ── 4. Téléverser la signature dans le bucket privé "signatures" ──
    // Préfixée par le centre : la policy RLS "sig_insert" exige
    // storage_object_centre_id(name) IS NOT NULL — sans effet ici (la clé
    // service_role bypass la RLS), mais garde un chemin cohérent avec le
    // reste de l'app pour toute lecture ultérieure.
    const base64Clean = signatureDataBase64.replace(/^data:image\/\w+;base64,/, "");
    let binaryData: Uint8Array;
    try {
      binaryData = Uint8Array.from(atob(base64Clean), (c) => c.charCodeAt(0));
    } catch {
      return jsonResponse({ success: false, error: "Signature illisible" }, 400);
    }

    const path = `${session.centre_id}/emargements/${emargementId}_${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage
      .from("signatures")
      .upload(path, binaryData, { contentType: "image/png", upsert: true });

    if (uploadError) {
      console.error("[portal-upload-signature] erreur d'upload:", uploadError);
      return jsonResponse({ success: false, error: "Erreur lors de l'upload de la signature" }, 500);
    }

    // ── 5. Mettre à jour l'émargement — jamais de succès sans ligne écrite ──
    const { data: updated, error: updateError } = await supabase
      .from("emargements")
      .update({
        present: true,
        signature_url: path,
        signature_data: signatureDataBase64,
        ip_signature: "learner-portal",
        user_agent_signature: body.userAgent || null,
        date_signature: new Date().toISOString(),
      })
      .eq("id", emargementId)
      .select("id");

    if (updateError) {
      console.error("[portal-upload-signature] erreur de mise à jour:", updateError);
      return jsonResponse(
        { success: false, error: "Erreur lors de la mise à jour de l'émargement" },
        500,
      );
    }
    if (!updated || updated.length === 0) {
      console.error("[portal-upload-signature] 0 ligne mise à jour pour", emargementId);
      return jsonResponse(
        { success: false, error: "L'émargement n'a pas pu être mis à jour" },
        500,
      );
    }

    return jsonResponse({ success: true, path });
  } catch (error: unknown) {
    console.error("[portal-upload-signature] erreur interne:", error);
    return jsonResponse({ success: false, error: "Erreur interne" }, 500);
  }
});
