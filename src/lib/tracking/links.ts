// ═══════════════════════════════════════════════════════════════
// Tracking helpers — generate tracked links for outbound emails
// ═══════════════════════════════════════════════════════════════

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

function b64url(s: string): string {
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

/** Generate a fresh tracking token (32 hex chars). */
export function newTrackingToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

/**
 * Wrap an outbound URL with the tracking redirector.
 * Click → logs event → 302 redirect to original URL.
 */
export function wrapTrackedLink(targetUrl: string, token: string): string {
  if (!targetUrl) return targetUrl;
  return `${SUPABASE_URL}/functions/v1/track-link?t=${token}&u=${b64url(targetUrl)}`;
}
