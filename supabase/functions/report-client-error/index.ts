// ════════════════════════════════════════════════════════════════════
// report-client-error
// Capture serveur minimale des erreurs front (fondation, pas un APM —
// un vrai Sentry nécessite un compte que seul le directeur peut créer).
//
// Authentifiée par la session utilisateur normale (auth.getUser()) —
// PAS la clé anon seule : un poste non connecté ne doit pas pouvoir
// remplir `client_error_logs`.
//
// Contrat : ne doit JAMAIS lever ni ralentir l'UI qui vient de planter.
// Toute erreur interne (auth invalide, rate limit dépassé, insert en
// échec…) répond 204 — le seul signal utile, c'est ce qui est écrit en
// base pour les admins/staff.
// ════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders, handlePreflight } from "../_shared/cors.ts";

const RATE_LIMIT_PER_MINUTE = 20;
const MESSAGE_MAX = 2000;
const STACK_MAX = 8000;
const URL_MAX = 2000;

const noContent = (headers: Record<string, string>) => new Response(null, { status: 204, headers });

serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  const corsHeaders = getCorsHeaders(req);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return noContent(corsHeaders);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user?.id) {
      return noContent(corsHeaders);
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => null);
    const message = typeof body?.message === "string" ? body.message.slice(0, MESSAGE_MAX) : null;
    if (!message) {
      // Rien d'exploitable à enregistrer.
      return noContent(corsHeaders);
    }
    const stack = typeof body?.stack === "string" ? body.stack.slice(0, STACK_MAX) : null;
    const url = typeof body?.url === "string" ? body.url.slice(0, URL_MAX) : null;

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Rate limit simple : pas plus de RATE_LIMIT_PER_MINUTE lignes par
    // utilisateur et par minute (ex. boucle de rendu qui spam la même
    // erreur). Un COUNT avant insert suffit à ce volume, pas besoin d'une
    // lib de rate-limiting externe.
    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
    const { count, error: countErr } = await admin
      .from("client_error_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", oneMinuteAgo);

    if (countErr) {
      console.error("[report-client-error] échec comptage rate-limit:", countErr);
    } else if ((count ?? 0) >= RATE_LIMIT_PER_MINUTE) {
      console.warn(`[report-client-error] rate limit atteint pour l'utilisateur ${userId}`);
      return noContent(corsHeaders);
    }

    // centre_id : simple enrichissement, best-effort (un utilisateur peut
    // être rattaché à plusieurs centres — on ne prend que le premier).
    const { data: userCentre } = await admin
      .from("user_centres")
      .select("centre_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    const { error: insertErr } = await admin.from("client_error_logs").insert({
      message,
      stack,
      url,
      user_id: userId,
      centre_id: userCentre?.centre_id ?? null,
    });
    if (insertErr) {
      console.error("[report-client-error] échec insert:", insertErr);
    }

    return noContent(corsHeaders);
  } catch (err) {
    console.error("[report-client-error] exception:", err);
    // Toujours répondre, même en cas d'imprévu (CORS headers recalculés
    // au cas où l'exception serait survenue avant leur calcul).
    return noContent(getCorsHeaders(req));
  }
});
