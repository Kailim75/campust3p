/**
 * Garde partagée des fonctions déclenchées par pg_cron (verify_jwt = false).
 *
 * Audit du 13/08/2026 (P1) : ces endpoints étaient appelables par quiconque
 * connaissait l'URL et la clé anon publique (présente dans le bundle front) —
 * envoi forcé d'emails aux candidats, bascule de statuts, runs Alma.
 *
 * Fonctionnement (STRICT depuis le durcissement `fix/cron-secret-strict`) :
 *  - `CRON_SECRET` configuré  → l'en-tête `x-cron-secret` doit correspondre
 *    (comparaison en temps constant), sinon 401.
 *  - `CRON_SECRET` absent     → appel **refusé** (401), avec une erreur dans
 *    les logs. Plus de mode transition : un secret non configuré ne doit
 *    jamais rouvrir ces endpoints à quiconque connaît l'URL. Voir la
 *    checklist de déploiement en tête de supabase/CRON_JOBS.md.
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
 * Un `CRON_SECRET` absent renvoie `false` au lieu d'accepter l'appel — sinon,
 * retirer le secret rouvrirait la fonction à quiconque connaît l'URL, ces
 * endpoints étant en `verify_jwt = false`. Depuis le durcissement
 * `fix/cron-secret-strict`, `checkCronSecret` ci-dessous adopte le même
 * principe (absence de secret = refus) ; les deux fonctions restent
 * distinctes car `checkCronSecret` renvoie une `Response` 401 toute prête
 * (usage direct dans un `if (cronDenied) return cronDenied;`) alors que
 * `cronSecretMatches` renvoie un booléen pour composer avec une autre garde.
 */
export function cronSecretMatches(req: Request): boolean {
  const expected = Deno.env.get("CRON_SECRET");
  if (!expected) return false;
  return constantTimeEq(req.headers.get("x-cron-secret") ?? "", expected);
}

export function checkCronSecret(req: Request): Response | null {
  const expected = Deno.env.get("CRON_SECRET");

  if (!expected) {
    console.error(
      "[cron-auth] CRON_SECRET non configuré côté serveur : appel refusé (401). " +
        "Positionner le secret dans Lovable Cloud → Settings → Edge Functions → Secrets — voir supabase/CRON_JOBS.md.",
    );
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
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
