-- Revue du 10/09/2026 — suites du durcissement soft-delete (20260909230100)

-- ── 1. produit_categories : colonne attendue par les RPC de soft-delete ──────
ALTER TABLE public.produit_categories
  ADD COLUMN IF NOT EXISTS delete_reason text;

-- ── 2. reactivate_contact : garde rôle + centre, et trace RESTORE ────────────
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
  PERFORM public.assert_soft_delete_allowed('contacts', p_contact_id);

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

  INSERT INTO public.audit_logs (table_name, record_id, action, user_id, user_email)
  VALUES (
    'contacts',
    p_contact_id,
    'RESTORE',
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid())
  );

  RETURN jsonb_build_object('success', true, 'contact_id', p_contact_id);
END;
$$;

-- ── 3. Droits d'exécution : plus d'accès anon / PUBLIC ───────────────────────
REVOKE EXECUTE ON FUNCTION public.reactivate_contact(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reactivate_contact(UUID) TO authenticated;