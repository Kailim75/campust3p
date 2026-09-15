-- ════════════════════════════════════════════════════════════════════
-- Supervision minimale — volet C : capture serveur des erreurs front
-- ════════════════════════════════════════════════════════════════════
-- Fondation, PAS un remplacement d'APM (Sentry ou équivalent nécessite un
-- compte que seul le directeur peut créer). Écriture exclusivement via
-- l'edge function `report-client-error` (session utilisateur normale,
-- clé service_role côté serveur) : aucune policy INSERT pour
-- anon/authenticated — un poste compromis ne doit pas pouvoir remplir la
-- table de bruit directement contre l'API PostgREST.
-- Lecture : admin/staff (même motif que cron_heartbeats/email_logs).

CREATE TABLE public.client_error_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message text NOT NULL,
  stack text,
  url text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  centre_id uuid REFERENCES public.centres(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_error_logs_created_at ON public.client_error_logs(created_at DESC);
CREATE INDEX idx_client_error_logs_user_id ON public.client_error_logs(user_id);

ALTER TABLE public.client_error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_error_logs_select_admin_staff" ON public.client_error_logs
  FOR SELECT TO authenticated
  USING (
    ((SELECT public.has_role(auth.uid(), 'admin'::app_role))
     OR (SELECT public.has_role(auth.uid(), 'staff'::app_role)))
  );
