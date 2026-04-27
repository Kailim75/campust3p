import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { decode } from "https://deno.land/std@0.190.0/encoding/base64.ts";
import { getCorsHeaders, handlePreflight } from "../_shared/cors.ts";

interface SignRequest {
  action?: "sign" | "get_document_url";
  signatureId: string;
  signingToken?: string;
  signatureDataBase64?: string;
  userAgent?: string;
}

/**
 * Verify that the provided signingToken matches the one stored on the row.
 * Returns:
 *   "ok"      — token matches OR row has no token (legacy link, accept).
 *   "missing" — row has a token but the caller did not provide one.
 *   "invalid" — both present but they don't match (constant-time compare).
 *
 * Legacy fallback exists so signature links sent BEFORE this hardening
 * (no signing_token in DB) keep working until they expire naturally.
 * Once we're confident no legacy link is in flight, this fallback can be
 * tightened to require a token unconditionally.
 */
function verifySigningToken(
  storedToken: string | null,
  providedToken: string | undefined,
): "ok" | "missing" | "invalid" {
  if (!storedToken) return "ok"; // legacy row, no token gate

  if (!providedToken) return "missing";

  if (providedToken.length !== storedToken.length) return "invalid";
  let diff = 0;
  for (let i = 0; i < storedToken.length; i++) {
    diff |= storedToken.charCodeAt(i) ^ providedToken.charCodeAt(i);
  }
  return diff === 0 ? "ok" : "invalid";
}

serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  const corsHeaders = getCorsHeaders(req);

  const jsonResponse = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body: SignRequest = await req.json();
    const action = body.action || "sign";

    // ─── ACTION: get_document_url ───
    // Generates a fresh signed URL from the stable storage path
    if (action === "get_document_url") {
      const { signatureId, signingToken } = body;
      if (!signatureId) {
        return jsonResponse({ success: false, error: "signatureId requis" }, 400);
      }

      const { data: sigRequest, error: fetchError } = await supabase
        .from("signature_requests")
        .select("id, document_storage_path, document_storage_bucket, document_url, signing_token")
        .eq("id", signatureId)
        .single();

      if (fetchError || !sigRequest) {
        return jsonResponse({ success: false, error: "Document introuvable", code: "NOT_FOUND" }, 404);
      }

      const tokenCheck = verifySigningToken(sigRequest.signing_token ?? null, signingToken);
      if (tokenCheck !== "ok") {
        console.warn("[public-sign-document] get_document_url token check failed:", tokenCheck);
        return jsonResponse(
          { success: false, error: "Lien invalide ou expiré", code: tokenCheck === "missing" ? "TOKEN_REQUIRED" : "TOKEN_INVALID" },
          401,
        );
      }

      // Priority 1: stable storage path
      if (sigRequest.document_storage_path && sigRequest.document_storage_bucket) {
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from(sigRequest.document_storage_bucket)
          .createSignedUrl(sigRequest.document_storage_path, 3600); // 1 hour

        if (signedUrlError || !signedUrlData?.signedUrl) {
          console.error("Signed URL generation failed:", signedUrlError);
          return jsonResponse({
            success: false,
            error: "Le fichier du document est introuvable dans le stockage.",
            code: "FILE_NOT_FOUND",
          }, 404);
        }

        return jsonResponse({ success: true, url: signedUrlData.signedUrl, source: "storage_path" });
      }

      // Priority 2: legacy document_url (may be expired)
      if (sigRequest.document_url) {
        return jsonResponse({
          success: true,
          url: sigRequest.document_url,
          source: "legacy_url",
          warning: "URL héritée — peut être expirée",
        });
      }

      // No source available
      return jsonResponse({
        success: false,
        error: "Aucun document associé à cette demande de signature.",
        code: "NO_DOCUMENT",
      }, 404);
    }

    // ─── ACTION: sign (default) ───
    const { signatureId, signatureDataBase64, userAgent, signingToken } = body;

    if (!signatureId || !signatureDataBase64) {
      return jsonResponse({ success: false, error: "Paramètres manquants" }, 400);
    }

    const { data: sigRequest, error: fetchError } = await supabase
      .from("signature_requests")
      .select("id, statut, date_expiration, contact_id, signing_token")
      .eq("id", signatureId)
      .single();

    if (fetchError || !sigRequest) {
      return jsonResponse({ success: false, error: "Document introuvable" }, 404);
    }

    const tokenCheck = verifySigningToken(sigRequest.signing_token ?? null, signingToken);
    if (tokenCheck !== "ok") {
      console.warn("[public-sign-document] sign token check failed:", tokenCheck);
      return jsonResponse(
        { success: false, error: "Lien invalide ou expiré", code: tokenCheck === "missing" ? "TOKEN_REQUIRED" : "TOKEN_INVALID" },
        401,
      );
    }

    if (!["en_attente", "envoye"].includes(sigRequest.statut)) {
      return jsonResponse({ success: false, error: "Ce document ne peut plus être signé" }, 400);
    }

    if (sigRequest.date_expiration && new Date(sigRequest.date_expiration) < new Date()) {
      return jsonResponse({ success: false, error: "Ce lien de signature a expiré" }, 400);
    }

    const { data: contact } = await supabase
      .from("contacts")
      .select("centre_id")
      .eq("id", sigRequest.contact_id)
      .single();

    const centreId = contact?.centre_id || "unknown";

    const fileName = `centre/${centreId}/signatures/${sigRequest.contact_id}/sig-${signatureId}-${Date.now()}.png`;
    const binaryData = decode(signatureDataBase64);

    const { error: uploadError } = await supabase.storage
      .from("generated-documents")
      .upload(fileName, binaryData, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return jsonResponse({ success: false, error: "Erreur lors de l'upload de la signature" }, 500);
    }

    const { error: updateError } = await supabase
      .from("signature_requests")
      .update({
        statut: "signe",
        signature_url: fileName,
        date_signature: new Date().toISOString(),
        user_agent_signature: userAgent || null,
        // Invalidate the token after successful signature — single-use semantics.
        signing_token: null,
      })
      .eq("id", signatureId);

    if (updateError) {
      console.error("Update error:", updateError);
      return jsonResponse({ success: false, error: "Erreur lors de la mise à jour" }, 500);
    }

    console.log(`Document ${signatureId} signed successfully`);
    return jsonResponse({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur interne";
    console.error("Error in public-sign-document:", error);
    return jsonResponse({ success: false, error: message }, 500);
  }
});
