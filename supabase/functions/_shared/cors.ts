/**
 * Shared CORS helper for edge functions.
 *
 * Behavior:
 *  - If env var ALLOWED_ORIGINS is unset -> falls back to "*" (current behavior,
 *    backward compatible — preserves existing functionality until secret is set).
 *  - If ALLOWED_ORIGINS is set (comma-separated origins), only those origins
 *    are reflected back. Requests from other origins still get a CORS header
 *    but bound to the first allowed origin (so the browser will reject them).
 *
 * Production rollout:
 *  1. Deploy this code (no behavior change, still "*").
 *  2. In Supabase Dashboard > Project Settings > Edge Functions > Secrets,
 *     set ALLOWED_ORIGINS = "https://t3pcampus.net,http://localhost:8080"
 *     (adapt to your real domains).
 *  3. From that moment on, every fn using getCorsHeaders(req) is locked down
 *     atomically.
 *
 * The "Vary: Origin" header is critical when the response varies by origin
 * — it tells caches not to serve a response cached for origin A to a request
 * from origin B.
 */

const ALLOWED_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-api-key, " +
  "x-supabase-client-platform, x-supabase-client-platform-version, " +
  "x-supabase-client-runtime, x-supabase-client-runtime-version";

const ALLOWED_METHODS = "GET, POST, PATCH, PUT, DELETE, OPTIONS";

function getAllowedOrigins(): string[] | null {
  const env = Deno.env.get("ALLOWED_ORIGINS");
  if (!env) return null;
  const list = env.split(",").map((s) => s.trim()).filter(Boolean);
  return list.length > 0 ? list : null;
}

/**
 * Build the CORS response headers for the given request.
 * Use this inside your serve() handler:
 *   const corsHeaders = getCorsHeaders(req);
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const allowed = getAllowedOrigins();
  const origin = req.headers.get("origin") || "";

  // No env -> fallback to wildcard (preserves legacy behavior).
  // Env present -> reflect origin only if whitelisted, else use first allowed.
  let allowOrigin = "*";
  if (allowed) {
    allowOrigin = allowed.includes(origin) ? origin : allowed[0];
  }

  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Allow-Methods": ALLOWED_METHODS,
  };

  // Vary is only meaningful when the value depends on the request.
  if (allowed) {
    headers["Vary"] = "Origin";
  }

  return headers;
}

/**
 * Convenience: handle a CORS preflight (OPTIONS) request directly.
 * Returns a Response if it was a preflight, null otherwise.
 *
 *   const preflight = handlePreflight(req);
 *   if (preflight) return preflight;
 */
export function handlePreflight(req: Request): Response | null {
  if (req.method !== "OPTIONS") return null;
  return new Response(null, { headers: getCorsHeaders(req) });
}
