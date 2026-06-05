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

// Origines toujours autorisées (domaines officiels du projet + previews Lovable).
// Évite les soucis CORS si ALLOWED_ORIGINS est incomplet (ex: www oublié).
const ALWAYS_ALLOWED = [
  "https://t3pcampus.net",
  "https://www.t3pcampus.net",
  "https://campust3p.lovable.app",
];

// Previews Lovable: *.lovable.app, *.lovableproject.com (iframe sandbox), *.lovable.dev
function isLovablePreviewOrigin(origin: string): boolean {
  return /^https:\/\/[a-z0-9-]+\.(lovable\.app|lovableproject\.com|lovable\.dev)$/i.test(origin);
}

function getAllowedOrigins(): string[] {
  const env = Deno.env.get("ALLOWED_ORIGINS");
  const fromEnv = env
    ? env.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  // Union des origines configurées + des domaines officiels du projet
  return Array.from(new Set([...fromEnv, ...ALWAYS_ALLOWED]));
}

/**
 * Build the CORS response headers for the given request.
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const allowed = getAllowedOrigins();
  const origin = req.headers.get("origin") || "";

  let allowOrigin: string;
  if (origin && (allowed.includes(origin) || isLovablePreviewOrigin(origin))) {
    allowOrigin = origin;
  } else {
    allowOrigin = allowed[0] || "*";
  }

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Allow-Methods": ALLOWED_METHODS,
    "Vary": "Origin",
  };
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
