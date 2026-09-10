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
 *
 * A request shared via « Copier le lien » never went through
 * send-signature-email, so it has no signing_token yet: it is minted here on
 * first resolve (guarded by the access_token check above, on a request that
 * is still signable). A NULL signing_token on a signed/refused request never
 * reaches that point: the status check rejects it first.
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

function todayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function isExpiredDateOnly(dateExpiration: string | null): boolean {
  if (!dateExpiration) return false;
  return dateExpiration.slice(0, 10) < todayDateKey();
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

    if (isExpiredDateOnly(row.date_expiration)) {
      return jsonResponse({ success: false, error: "Lien expiré" }, 410);
    }

    let signingToken = row.signing_token as string | null;
    if (!signingToken) {
      const bytes = new Uint8Array(32);
      crypto.getRandomValues(bytes);
      const minted = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
      // Conditions répétées dans l'UPDATE : jamais d'écriture sur une demande
      // signée (trigger trg_lock_signed_signature_request) ni d'écrasement d'un
      // jeton créé entre-temps par un appel concurrent.
      const { data: updated, error: tokenError } = await supabase
        .from("signature_requests")
        .update({ signing_token: minted })
        .eq("id", signatureId)
        .is("signing_token", null)
        .in("statut", ["en_attente", "envoye"])
        .select("signing_token")
        .maybeSingle();
      if (tokenError) {
        console.error("[resolve-signing-token] cannot mint signing_token", { signatureId, tokenError });
        return jsonResponse({ success: false, error: "Erreur interne" }, 500);
      }
      if (updated?.signing_token) {
        signingToken = updated.signing_token as string;
      } else {
        const { data: again } = await supabase
          .from("signature_requests")
          .select("signing_token")
          .eq("id", signatureId)
          .maybeSingle();
        signingToken = (again?.signing_token as string | null) ?? null;
      }
      if (!signingToken) {
        console.warn("[resolve-signing-token] signing_token still missing", { signatureId });
        return jsonResponse({ success: false, error: "Lien invalide" }, 401);
      }
    }

    return jsonResponse({ success: true, signingToken });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur interne";
    console.error("[resolve-signing-token] error:", message);
    return jsonResponse({ success: false, error: "Erreur interne" }, 500);
  }
});
