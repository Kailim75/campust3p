/**
 * Battement de cœur des jobs pg_cron — supervision minimale (15/09/2026).
 *
 * Contexte : le CRM n'a aujourd'hui aucun moyen de détecter une panne de
 * cron autrement qu'en la remarquant à l'œil (deux pannes réelles ont duré
 * 187 et 239 jours — voir supabase/CRON_JOBS.md). Chaque edge function
 * déclenchée par pg_cron appelle `reportHeartbeat(..., 'running')` en
 * entrant puis `reportHeartbeat(..., 'ok' | 'error')` juste avant de
 * répondre. `send-daily-report` lit ensuite `cron_heartbeats` pour
 * signaler tout job silencieux.
 *
 * Ne doit JAMAIS faire échouer le cron appelant : un problème d'écriture
 * du battement lui-même (table absente, réseau…) est avalé et journalisé,
 * pas propagé.
 */

// Sous-ensemble minimal du client supabase-js réellement utilisé ici — évite
// `any` tout en restant compatible avec le client typé de chaque fonction.
type SupabaseLike = {
  from: (table: string) => {
    upsert: (
      row: Record<string, unknown>,
      opts: { onConflict: string },
    ) => Promise<{ error: unknown }>;
  };
};

export type HeartbeatStatus = "running" | "ok" | "error";

export async function reportHeartbeat(
  supabaseClient: SupabaseLike,
  job: string,
  status: HeartbeatStatus,
  error?: string,
): Promise<void> {
  try {
    const now = new Date().toISOString();
    const row: Record<string, unknown> = {
      job,
      last_run_at: now,
      last_status: status,
      last_error: status === "error" ? (error ?? null) : null,
      updated_at: now,
    };
    if (status === "ok") {
      row.last_ok_at = now;
    }

    const { error: upsertError } = await supabaseClient
      .from("cron_heartbeats")
      .upsert(row, { onConflict: "job" });

    if (upsertError) {
      console.error(`[heartbeat] échec upsert pour "${job}":`, upsertError);
    }
  } catch (err) {
    // Ne jamais faire planter le cron appelant pour un souci de battement.
    console.error(`[heartbeat] exception pour "${job}":`, err);
  }
}
