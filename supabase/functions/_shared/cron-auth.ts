/**
 * Garde partagée des fonctions déclenchées par pg_cron (verify_jwt = false).
 *
 * Audit du 13/08/2026 (P1) : ces endpoints étaient appelables par quiconque
 * connaissait l'URL et la clé anon publique (présente dans le bundle front) —
 * envoi forcé d'emails aux candidats, bascule de statuts, runs Alma.
 *
 * Fonctionnement :
 *  - `CRON_SECRET` configuré  → l'en-tête `x-cron-secret` doit correspondre
 *    (comparaison en temps constant), sinon 401.
 *  - `CRON_SECRET` absent     → appel accepté avec un avertissement dans les
 *    logs (mode transition, pour ne pas couper les automatisations avant que
 *    les jobs pg_cron n'envoient l'en-tête). Procédure d'activation dans
 *    supabase/CRON_JOBS.md.
 *
 * Le test manuel `?dryRun=true` reste possible : il suffit d'envoyer l'en-tête.
 *
 * La réponse 401 porte les en-têtes CORS : sans eux, un appel depuis le
 * navigateur est bloqué avant lecture du corps et le front ne voit qu'un
 * échec réseau opaque (« Failed to send a request to the Edge Function »).
 */

import { getCorsHeaders } from "./cors.ts";

function constantTimeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Variante STRICTE, pour les fonctions dont la voie cron n'est qu'une
 * alternative à une autre authentification (`send-automated-emails` est gardée
 * par un JWT admin/staff, mais son job pg_cron n'a pas de session utilisateur).
 *
 * Différence avec `checkCronSecret` : pas de mode transition. Un `CRON_SECRET`
 * absent renvoie `false` au lieu d'accepter l'appel — sinon, retirer le secret
 * rouvrirait la fonction à quiconque connaît l'URL, ces endpoints étant en
 * `verify_jwt = false`.
 */
export function cronSecretMatches(req: Request): boolean {
  const expected = Deno.env.get("CRON_SECRET");
  if (!expected) return false;
  return constantTimeEq(req.headers.get("x-cron-secret") ?? "", expected);
}

export function checkCronSecret(req: Request): Response | null {
  const expected = Deno.env.get("CRON_SECRET");
  if (!expected) {
    console.warn(
      "[cron-auth] CRON_SECRET non configuré : appel accepté (mode transition). " +
        "Configurer le secret puis ajouter l'en-tête x-cron-secret aux jobs pg_cron — voir supabase/CRON_JOBS.md.",
    );
    return null;
  }

  const provided = req.headers.get("x-cron-secret") ?? "";
  if (!constantTimeEq(provided, expected)) {
    console.warn("[cron-auth] appel refusé : en-tête x-cron-secret absent ou invalide");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
  return null;
}
