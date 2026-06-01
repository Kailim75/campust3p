-- =========================================================
-- Protection anti-doublons contacts actifs (centre_id scoped)
-- =========================================================

-- 1. Table d'audit des tentatives bloquées
CREATE TABLE IF NOT EXISTS public.contact_duplicate_block_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  attempted_by UUID,
  centre_id UUID,
  email TEXT,
  attempted_contact_id UUID,
  existing_contact_id UUID,
  operation TEXT NOT NULL,
  context JSONB
);

GRANT SELECT, INSERT ON public.contact_duplicate_block_log TO authenticated;
GRANT ALL ON public.contact_duplicate_block_log TO service_role;

ALTER TABLE public.contact_duplicate_block_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins lisent les blocages de leur centre"
ON public.contact_duplicate_block_log
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Service role insertion blocages"
ON public.contact_duplicate_block_log
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 2. Index unique partiel sur le périmètre strictement actif
-- (centre_id, email normalisé) où email non vide, non supprimé, non archivé
CREATE UNIQUE INDEX IF NOT EXISTS contacts_active_email_centre_uidx
ON public.contacts (centre_id, lower(trim(email)))
WHERE email IS NOT NULL
  AND trim(email) <> ''
  AND deleted_at IS NULL
  AND archived = false;

-- 3. Fonction de pré-vérification (appelée depuis le formulaire)
CREATE OR REPLACE FUNCTION public.check_active_duplicate_email(
  p_email TEXT,
  p_centre_id UUID,
  p_exclude_id UUID DEFAULT NULL
)
RETURNS TABLE (
  has_duplicate BOOLEAN,
  existing_contact_id UUID,
  existing_contact_nom TEXT,
  existing_contact_prenom TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_norm TEXT;
BEGIN
  IF p_email IS NULL OR trim(p_email) = '' OR p_centre_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  v_norm := lower(trim(p_email));

  RETURN QUERY
  SELECT
    true,
    c.id,
    c.nom,
    c.prenom
  FROM public.contacts c
  WHERE c.centre_id = p_centre_id
    AND lower(trim(c.email)) = v_norm
    AND c.deleted_at IS NULL
    AND c.archived = false
    AND (p_exclude_id IS NULL OR c.id <> p_exclude_id)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::TEXT;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_active_duplicate_email(TEXT, UUID, UUID) TO authenticated;

-- 4. Fonction de réactivation contrôlée
CREATE OR REPLACE FUNCTION public.reactivate_contact(p_contact_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contact RECORD;
  v_existing_id UUID;
  v_norm TEXT;
BEGIN
  SELECT id, email, centre_id, archived, deleted_at
  INTO v_contact
  FROM public.contacts
  WHERE id = p_contact_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'CONTACT_NOT_FOUND');
  END IF;

  IF v_contact.email IS NOT NULL AND trim(v_contact.email) <> '' AND v_contact.centre_id IS NOT NULL THEN
    v_norm := lower(trim(v_contact.email));

    SELECT id INTO v_existing_id
    FROM public.contacts
    WHERE centre_id = v_contact.centre_id
      AND lower(trim(email)) = v_norm
      AND deleted_at IS NULL
      AND archived = false
      AND id <> p_contact_id
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      INSERT INTO public.contact_duplicate_block_log
        (attempted_by, centre_id, email, attempted_contact_id, existing_contact_id, operation, context)
      VALUES
        (auth.uid(), v_contact.centre_id, v_contact.email, p_contact_id, v_existing_id, 'reactivate',
         jsonb_build_object('reason', 'active_duplicate_exists'));

      RETURN jsonb_build_object(
        'success', false,
        'error', 'DUPLICATE_ACTIVE_CONTACT',
        'existing_contact_id', v_existing_id
      );
    END IF;
  END IF;

  UPDATE public.contacts
  SET archived = false,
      deleted_at = NULL,
      deleted_by = NULL,
      updated_at = now()
  WHERE id = p_contact_id;

  RETURN jsonb_build_object('success', true, 'contact_id', p_contact_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reactivate_contact(UUID) TO authenticated;

-- 5. Trigger BEFORE INSERT/UPDATE — bloque les doublons actifs et journalise
CREATE OR REPLACE FUNCTION public.contacts_block_active_duplicate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_norm TEXT;
  v_existing_id UUID;
  v_is_active BOOLEAN;
BEGIN
  v_is_active := (NEW.deleted_at IS NULL) AND (COALESCE(NEW.archived, false) = false);

  IF NOT v_is_active THEN
    RETURN NEW;
  END IF;

  IF NEW.email IS NULL OR trim(NEW.email) = '' OR NEW.centre_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_norm := lower(trim(NEW.email));

  SELECT id INTO v_existing_id
  FROM public.contacts
  WHERE centre_id = NEW.centre_id
    AND lower(trim(email)) = v_norm
    AND deleted_at IS NULL
    AND archived = false
    AND id <> NEW.id
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    INSERT INTO public.contact_duplicate_block_log
      (attempted_by, centre_id, email, attempted_contact_id, existing_contact_id, operation, context)
    VALUES
      (auth.uid(), NEW.centre_id, NEW.email, NEW.id, v_existing_id, TG_OP,
       jsonb_build_object('trigger', 'contacts_block_active_duplicate'));

    RAISE EXCEPTION 'DUPLICATE_ACTIVE_CONTACT: un contact actif avec cet email existe déjà dans ce centre (id=%)', v_existing_id
      USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contacts_block_active_duplicate ON public.contacts;

CREATE TRIGGER trg_contacts_block_active_duplicate
BEFORE INSERT OR UPDATE OF email, archived, deleted_at, centre_id
ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION public.contacts_block_active_duplicate();