CREATE TABLE public.user_onboarding_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tour_id TEXT NOT NULL,
  completed_at TIMESTAMPTZ,
  skipped BOOLEAN NOT NULL DEFAULT false,
  dismissed_hints JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, tour_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_onboarding_progress TO authenticated;
GRANT ALL ON public.user_onboarding_progress TO service_role;

ALTER TABLE public.user_onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own onboarding"
ON public.user_onboarding_progress FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own onboarding"
ON public.user_onboarding_progress FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own onboarding"
ON public.user_onboarding_progress FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users delete own onboarding"
ON public.user_onboarding_progress FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_user_onboarding_user ON public.user_onboarding_progress(user_id);

CREATE TRIGGER update_user_onboarding_progress_updated_at
BEFORE UPDATE ON public.user_onboarding_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();