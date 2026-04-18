-- Onboarding checklist persistent state + progress RPC

-- 1) State table
CREATE TABLE IF NOT EXISTS public.onboarding_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  centre_id uuid REFERENCES public.centres(id) ON DELETE CASCADE,
  steps_skipped jsonb NOT NULL DEFAULT '[]'::jsonb,
  dismissed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own onboarding state"
ON public.onboarding_state FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users insert own onboarding state"
ON public.onboarding_state FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own onboarding state"
ON public.onboarding_state FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_onboarding_state_updated_at
BEFORE UPDATE ON public.onboarding_state
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) RPC: returns the 8 booleans + counts in one call.
-- Mapping (validated):
--  centres_formation -> centres
--  formations -> catalogue_formations
--  contacts.type='apprenant' -> statut_apprenant IN ('actif','diplome')
--  factures.status -> statut IN ('envoyee','payee','partiel')
--  IBAN lives in centre_formation (singleton, no centre_id)
--  email_templates.is_custom: column doesn't exist -> count(*) >= 1 per centre
CREATE OR REPLACE FUNCTION public.get_onboarding_progress(p_centre_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_centre RECORD;
  v_team_count int;
  v_formation_count int;
  v_session_count int;
  v_apprenant_count int;
  v_iban_set boolean;
  v_email_template_count int;
  v_facture_count int;
  v_steps_skipped jsonb;
BEGIN
  -- Access guard: user must belong to centre OR be super admin
  IF NOT public.has_centre_access(p_centre_id) THEN
    RAISE EXCEPTION 'Accès refusé à ce centre';
  END IF;

  SELECT id, nom, logo_url INTO v_centre
  FROM public.centres WHERE id = p_centre_id;

  SELECT count(*) INTO v_team_count
  FROM public.user_centres WHERE centre_id = p_centre_id;

  SELECT count(*) INTO v_formation_count
  FROM public.catalogue_formations
  WHERE centre_id = p_centre_id AND deleted_at IS NULL;

  SELECT count(*) INTO v_session_count
  FROM public.sessions
  WHERE centre_id = p_centre_id AND deleted_at IS NULL;

  SELECT count(*) INTO v_apprenant_count
  FROM public.contacts
  WHERE centre_id = p_centre_id
    AND deleted_at IS NULL
    AND statut_apprenant IN ('actif','diplome');

  SELECT (iban IS NOT NULL AND length(trim(iban)) > 0) INTO v_iban_set
  FROM public.centre_formation LIMIT 1;
  v_iban_set := COALESCE(v_iban_set, false);

  SELECT count(*) INTO v_email_template_count
  FROM public.email_templates
  WHERE centre_id = p_centre_id AND deleted_at IS NULL;

  SELECT count(*) INTO v_facture_count
  FROM public.factures
  WHERE centre_id = p_centre_id
    AND deleted_at IS NULL
    AND statut::text IN ('envoyee','payee','partiel');

  SELECT COALESCE(steps_skipped, '[]'::jsonb) INTO v_steps_skipped
  FROM public.onboarding_state WHERE user_id = auth.uid();
  v_steps_skipped := COALESCE(v_steps_skipped, '[]'::jsonb);

  RETURN jsonb_build_object(
    'customize_centre', (v_centre.logo_url IS NOT NULL OR (v_centre.nom IS NOT NULL AND v_centre.nom <> 'Mon centre')),
    'invite_team',     (v_team_count > 1) OR (v_steps_skipped ? 'invite_team'),
    'create_formation',(v_formation_count >= 1),
    'create_session',  (v_session_count >= 1),
    'add_apprenant',   (v_apprenant_count >= 1),
    'configure_iban',  v_iban_set,
    'customize_email', (v_email_template_count >= 1),
    'send_invoice',    (v_facture_count >= 1),
    'steps_skipped',   v_steps_skipped
  );
END;
$$;

-- 3) Mark dismissed helper
CREATE OR REPLACE FUNCTION public.dismiss_onboarding_checklist()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.onboarding_state (user_id, dismissed_at)
  VALUES (auth.uid(), now())
  ON CONFLICT (user_id) DO UPDATE SET dismissed_at = now(), updated_at = now();
END;
$$;

-- 4) Skip a step (e.g. invite_team)
CREATE OR REPLACE FUNCTION public.skip_onboarding_step(p_step_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.onboarding_state (user_id, steps_skipped)
  VALUES (auth.uid(), jsonb_build_array(p_step_id))
  ON CONFLICT (user_id) DO UPDATE
    SET steps_skipped = (
      SELECT COALESCE(jsonb_agg(DISTINCT v), '[]'::jsonb)
      FROM jsonb_array_elements_text(
        COALESCE(public.onboarding_state.steps_skipped, '[]'::jsonb) || jsonb_build_array(p_step_id)
      ) AS t(v)
    ),
    updated_at = now();
END;
$$;