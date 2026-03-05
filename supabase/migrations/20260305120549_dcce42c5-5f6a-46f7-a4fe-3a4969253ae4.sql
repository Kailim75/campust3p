
CREATE TABLE public.action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  action_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  label text,
  metadata jsonb DEFAULT '{}'::jsonb,
  note text
);

ALTER TABLE public.action_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert action_logs"
  ON public.action_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can read own action_logs"
  ON public.action_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admin/staff can read all action_logs"
  ON public.action_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE INDEX idx_action_logs_entity ON public.action_logs (entity_type, entity_id);
CREATE INDEX idx_action_logs_user ON public.action_logs (user_id, created_at DESC);
