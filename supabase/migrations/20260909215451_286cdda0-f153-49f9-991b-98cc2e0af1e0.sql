-- Audit du 13/08/2026 — P0/P1 (escalade de privilèges, perte de données cross-tenant)
--
-- soft_delete_record / restore_record / soft_delete_session / restore_session
-- sont SECURITY DEFINER (contournent la RLS) et ne vérifiaient QUE la liste
-- blanche de tables : ni rôle, ni centre, ni même auth.uid(). EXECUTE étant
-- accordé à PUBLIC par défaut, tout utilisateur connecté (formateur compris),
-- voire anon, pouvait mettre à la corbeille ou restaurer n'importe quel
-- enregistrement par UUID, y compris d'un autre centre.
--
-- Cette migration :
--   1) ajoute un helper qui vérifie que la cible est dans un centre de
--      l'appelant (via les fonctions has_*_centre_access existantes) ;
--   2) ajoute une garde commune (authentifié + admin/staff/super_admin + centre) ;
--   3) redéfinit les 4 fonctions avec la garde en tête, corps inchangé par
--      ailleurs (la liste blanche de soft_delete_record est alignée sur celle
--      de restore_record : + produits_services, produit_categories, qui ont
--      bien deleted_at) ;
--   4) révoque EXECUTE de PUBLIC/anon et l'accorde à authenticated + service_role.
--
-- Un centre_id NULL (enregistrement orphelin, antérieur au multi-centres) n'est
-- pas cross-tenant : accepté, sous réserve du contrôle de rôle.
-- Les appels serveur en service_role (automatisations) restent autorisés.

-- ── 1. La cible est-elle dans un centre de l'appelant ? ───────────────────────
CREATE OR REPLACE FUNCTION public.soft_delete_target_accessible(p_table_name text, p_record_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_centre uuid;
  v_ref uuid;
BEGIN
  IF public.is_super_admin() THEN
    RETURN true;
  END IF;

  CASE p_table_name
    WHEN 'contacts', 'sessions', 'factures', 'prospects', 'devis', 'catalogue_formations',
         'email_templates', 'generated_documents_v2', 'produits_services', 'produit_categories' THEN
      EXECUTE format('SELECT centre_id FROM public.%I WHERE id = $1', p_table_name)
        INTO v_centre USING p_record_id;
      RETURN v_centre IS NULL OR public.has_centre_access(v_centre);

    WHEN 'session_inscriptions', 'emargements' THEN
      EXECUTE format('SELECT session_id FROM public.%I WHERE id = $1', p_table_name)
        INTO v_ref USING p_record_id;
      RETURN v_ref IS NULL OR public.has_session_centre_access(v_ref);

    WHEN 'paiements' THEN
      SELECT facture_id INTO v_ref FROM public.paiements WHERE id = p_record_id;
      RETURN v_ref IS NULL OR public.has_facture_centre_access(v_ref);

    WHEN 'contact_documents' THEN
      SELECT contact_id INTO v_ref FROM public.contact_documents WHERE id = p_record_id;
      RETURN v_ref IS NULL OR public.has_contact_centre_access(v_ref);

    WHEN 'document_templates' THEN
      -- Pas de colonne centre_id (modèles globaux) : contrôle de rôle seul.
      RETURN true;

    ELSE
      RETURN false;
  END CASE;
END;
$function$;

-- ── 2. Garde commune ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.assert_soft_delete_allowed(p_table_name text, p_record_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Automatisations serveur (clé service_role) : autorisées.
  IF auth.role() = 'service_role' THEN
    RETURN;
  END IF;
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;
  IF NOT public.is_admin_or_staff() THEN
    RAISE EXCEPTION 'Droits insuffisants (admin ou staff requis)';
  END IF;
  IF NOT public.soft_delete_target_accessible(p_table_name, p_record_id) THEN
    RAISE EXCEPTION 'Enregistrement hors de votre centre';
  END IF;
END;
$function$;

-- ── 3a. soft_delete_record ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.soft_delete_record(p_table_name text, p_record_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
BEGIN
  IF p_table_name NOT IN ('sessions', 'contacts', 'session_inscriptions', 'factures', 'paiements', 'contact_documents', 'prospects', 'devis', 'emargements', 'document_templates', 'catalogue_formations', 'email_templates', 'generated_documents_v2', 'produits_services', 'produit_categories') THEN
    RAISE EXCEPTION 'Table % not supported for soft delete', p_table_name;
  END IF;

  PERFORM public.assert_soft_delete_allowed(p_table_name, p_record_id);

  EXECUTE format(
    'UPDATE public.%I SET deleted_at = now(), deleted_by = $1, delete_reason = $2 WHERE id = $3 AND deleted_at IS NULL',
    p_table_name
  ) USING auth.uid(), p_reason, p_record_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  INSERT INTO public.audit_logs (table_name, record_id, action, user_id, user_email, new_data)
  VALUES (
    p_table_name,
    p_record_id,
    'SOFT_DELETE',
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    jsonb_build_object('reason', p_reason, 'deleted_at', now())
  );

  RETURN v_count > 0;
END;
$function$;

-- ── 3b. restore_record ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.restore_record(p_table_name text, p_record_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
BEGIN
  IF p_table_name NOT IN ('sessions', 'contacts', 'session_inscriptions', 'factures', 'paiements', 'contact_documents', 'prospects', 'devis', 'emargements', 'document_templates', 'catalogue_formations', 'email_templates', 'generated_documents_v2', 'produits_services', 'produit_categories') THEN
    RAISE EXCEPTION 'Table % not supported for restore', p_table_name;
  END IF;

  PERFORM public.assert_soft_delete_allowed(p_table_name, p_record_id);

  EXECUTE format(
    'UPDATE public.%I SET deleted_at = NULL, deleted_by = NULL, delete_reason = NULL WHERE id = $1 AND deleted_at IS NOT NULL',
    p_table_name
  ) USING p_record_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  INSERT INTO public.audit_logs (table_name, record_id, action, user_id, user_email)
  VALUES (
    p_table_name,
    p_record_id,
    'RESTORE',
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid())
  );

  RETURN v_count > 0;
END;
$function$;

-- ── 3c. soft_delete_session (cascade inscriptions + émargements) ─────────────
CREATE OR REPLACE FUNCTION public.soft_delete_session(
  p_session_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_inscriptions_count INT;
  v_emargements_count INT;
BEGIN
  PERFORM public.assert_soft_delete_allowed('sessions', p_session_id);

  UPDATE public.sessions
  SET deleted_at = now(), deleted_by = auth.uid(), delete_reason = p_reason
  WHERE id = p_session_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session non trouvée ou déjà supprimée');
  END IF;

  UPDATE public.session_inscriptions
  SET deleted_at = now(), deleted_by = auth.uid(), delete_reason = 'Cascade: session supprimée'
  WHERE session_id = p_session_id AND deleted_at IS NULL;
  GET DIAGNOSTICS v_inscriptions_count = ROW_COUNT;

  UPDATE public.emargements
  SET deleted_at = now(), deleted_by = auth.uid(), delete_reason = 'Cascade: session supprimée'
  WHERE session_id = p_session_id AND deleted_at IS NULL;
  GET DIAGNOSTICS v_emargements_count = ROW_COUNT;

  INSERT INTO public.audit_logs (table_name, record_id, action, user_id, user_email, new_data)
  VALUES ('sessions', p_session_id, 'SOFT_DELETE', auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    jsonb_build_object('reason', p_reason, 'cascaded_inscriptions', v_inscriptions_count, 'cascaded_emargements', v_emargements_count)
  );

  RETURN jsonb_build_object(
    'success', true,
    'inscriptions_affected', v_inscriptions_count,
    'emargements_affected', v_emargements_count
  );
END;
$$;

-- ── 3d. restore_session ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.restore_session(
  p_session_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_inscriptions_count INT;
  v_emargements_count INT;
BEGIN
  PERFORM public.assert_soft_delete_allowed('sessions', p_session_id);

  UPDATE public.sessions
  SET deleted_at = NULL, deleted_by = NULL, delete_reason = NULL
  WHERE id = p_session_id AND deleted_at IS NOT NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session non trouvée ou pas supprimée');
  END IF;

  UPDATE public.session_inscriptions
  SET deleted_at = NULL, deleted_by = NULL, delete_reason = NULL
  WHERE session_id = p_session_id AND delete_reason = 'Cascade: session supprimée';
  GET DIAGNOSTICS v_inscriptions_count = ROW_COUNT;

  UPDATE public.emargements
  SET deleted_at = NULL, deleted_by = NULL, delete_reason = NULL
  WHERE session_id = p_session_id AND delete_reason = 'Cascade: session supprimée';
  GET DIAGNOSTICS v_emargements_count = ROW_COUNT;

  INSERT INTO public.audit_logs (table_name, record_id, action, user_id, user_email, new_data)
  VALUES ('sessions', p_session_id, 'RESTORE', auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    jsonb_build_object('restored_inscriptions', v_inscriptions_count, 'restored_emargements', v_emargements_count)
  );

  RETURN jsonb_build_object(
    'success', true,
    'inscriptions_restored', v_inscriptions_count,
    'emargements_restored', v_emargements_count
  );
END;
$$;

-- ── 4. Droits d'exécution : plus d'accès anon / PUBLIC ───────────────────────
REVOKE EXECUTE ON FUNCTION public.soft_delete_target_accessible(text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.assert_soft_delete_allowed(text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.soft_delete_record(text, uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.restore_record(text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.soft_delete_session(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.restore_session(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.soft_delete_target_accessible(text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.assert_soft_delete_allowed(text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.soft_delete_record(text, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.restore_record(text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.soft_delete_session(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.restore_session(uuid) TO authenticated, service_role;