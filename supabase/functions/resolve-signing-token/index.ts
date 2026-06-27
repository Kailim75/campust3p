import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders, handlePreflight } from "../_shared/cors.ts";

/**
 * Exchanges a public access_token for the internal signing_token.
 *
 * Why this function exists:
 *  - access_token is the "read" token, safe to embed in URLs/emails.
 *  - signing_token is the "write" token, MUST NEVER appear in any URL,
 *    email, query string, localStorage, or analytics payload.
 *  - SignaturePage holds the signing_token only in React memory after
 *    calling this function with the access_token from the URL.
 *
 * Validation (constant-time compare on access_token):
 *  - row exists
 *  - access_token matches
 *  - statut in ('en_attente','envoye')
 *  - date_expiration not in the past
 *  - signing_token NOT NULL (else the doc is already signed / invalidated)
 *
 * All failures return a generic 401 to avoid leaking which check failed.
 */

interface ResolveRequest {
  signatureId: string;
  accessToken: string;
}

function constantTimeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body: ResolveRequest = await req.json();
    const { signatureId, accessToken } = body;

    if (!signatureId || !accessToken) {
      return jsonResponse({ success: false, error: "Lien invalide" }, 401);
    }

    const { data: row, error } = await supabase
      .from("signature_requests")
      .select("id, access_token, signing_token, statut, date_expiration")
      .eq("id", signatureId)
      .maybeSingle();

    if (error || !row) {
      console.warn("[resolve-signing-token] row not found", { signatureId });
      return jsonResponse({ success: false, error: "Lien invalide" }, 401);
    }

    if (!row.access_token || !constantTimeEq(row.access_token, accessToken)) {
      console.warn("[resolve-signing-token] access_token mismatch", { signatureId });
      return jsonResponse({ success: false, error: "Lien invalide" }, 401);
    }

    if (!["en_attente", "envoye"].includes(row.statut)) {
      console.warn("[resolve-signing-token] bad status", { signatureId, statut: row.statut });
      return jsonResponse({ success: false, error: "Document déjà traité" }, 410);
    }

    if (row.date_expiration && new Date(row.date_expiration) < new Date()) {
      return jsonResponse({ success: false, error: "Lien expiré" }, 410);
    }

    if (!row.signing_token) {
      return jsonResponse({ success: false, error: "Document déjà signé" }, 410);
    }

    return jsonResponse({ success: true, signingToken: row.signing_token });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur interne";
    console.error("[resolve-signing-token] error:", message);
    return jsonResponse({ success: false, error: "Erreur interne" }, 500);
  }
});
