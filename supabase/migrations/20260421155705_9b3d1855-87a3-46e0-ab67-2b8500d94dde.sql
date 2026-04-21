-- Table centre_api_keys
CREATE TABLE public.centre_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id UUID NOT NULL REFERENCES public.centres(id) ON DELETE CASCADE,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  label TEXT,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_used_at TIMESTAMPTZ
);

CREATE INDEX idx_centre_api_keys_centre ON public.centre_api_keys(centre_id);
CREATE INDEX idx_centre_api_keys_hash ON public.centre_api_keys(key_hash) WHERE actif = true;

-- 1 seule clé active par centre
CREATE UNIQUE INDEX idx_centre_api_keys_one_active 
  ON public.centre_api_keys(centre_id) 
  WHERE actif = true;

ALTER TABLE public.centre_api_keys ENABLE ROW LEVEL SECURITY;

-- RLS: super admin only
CREATE POLICY "Super admins can view all api keys"
  ON public.centre_api_keys FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "Super admins can insert api keys"
  ON public.centre_api_keys FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can update api keys"
  ON public.centre_api_keys FOR UPDATE
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can delete api keys"
  ON public.centre_api_keys FOR DELETE
  TO authenticated
  USING (public.is_super_admin());

-- Fonction de validation (utilisée par l'edge function via service role)
CREATE OR REPLACE FUNCTION public.validate_api_key(p_key_hash text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_centre_id uuid;
  v_key_id uuid;
BEGIN
  SELECT id, centre_id INTO v_key_id, v_centre_id
  FROM public.centre_api_keys
  WHERE key_hash = p_key_hash
    AND actif = true
    AND revoked_at IS NULL;

  IF v_key_id IS NOT NULL THEN
    UPDATE public.centre_api_keys
    SET last_used_at = now()
    WHERE id = v_key_id;
  END IF;

  RETURN v_centre_id;
END;
$$;

-- Audit trigger
CREATE TRIGGER audit_centre_api_keys
  AFTER INSERT OR UPDATE OR DELETE ON public.centre_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();