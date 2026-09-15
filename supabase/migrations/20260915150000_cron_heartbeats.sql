-- ════════════════════════════════════════════════════════════════════
-- Supervision minimale — volet A : battement de cœur des jobs pg_cron
-- ════════════════════════════════════════════════════════════════════
-- Contexte (15/09/2026) : le CRM n'a aujourd'hui AUCUN moyen de détecter
-- une panne de cron autrement qu'en la remarquant à l'œil — deux pannes
-- réelles ont duré 187 et 239 jours (`send-automated-emails` 401 depuis
-- le 14/01/2026, découvert le 10/09/2026 ; voir supabase/CRON_JOBS.md).
--
-- Cette table est un simple pouls : chaque edge function déclenchée par
-- pg_cron y écrit 'running' en entrant, puis 'ok'/'error' juste avant de
-- répondre (voir `_shared/heartbeat.ts`). `send-daily-report` la lit pour
-- signaler tout job silencieux depuis plus de 26h (marge sur les jobs
-- quotidiens à 24h).
--
-- Écriture : SEUL service_role (edge functions), donc AUCUNE policy
-- INSERT/UPDATE pour anon/authenticated — RLS les bloque par défaut en
-- l'absence de policy, service_role contourne RLS.
-- Lecture : admin/staff uniquement (même motif que email_logs).

CREATE TABLE public.cron_heartbeats (
  job text PRIMARY KEY,
  last_run_at timestamptz,
  last_ok_at timestamptz,
  last_status text,
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cron_heartbeats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cron_heartbeats_select_admin_staff" ON public.cron_heartbeats
  FOR SELECT TO authenticated
  USING (
    ((SELECT public.has_role(auth.uid(), 'admin'::app_role))
     OR (SELECT public.has_role(auth.uid(), 'staff'::app_role)))
  );
