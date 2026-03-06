
-- =====================================================
-- SOFT DELETE SYSTEM: Add deleted_at, deleted_by, delete_reason to critical tables
-- =====================================================

-- 1. sessions
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS deleted_by UUID DEFAULT NULL;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS delete_reason TEXT DEFAULT NULL;

-- 2. contacts (already has 'archived' but we add proper soft delete columns)
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS deleted_by UUID DEFAULT NULL;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS delete_reason TEXT DEFAULT NULL;

-- 3. session_inscriptions
ALTER TABLE public.session_inscriptions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.session_inscriptions ADD COLUMN IF NOT EXISTS deleted_by UUID DEFAULT NULL;
ALTER TABLE public.session_inscriptions ADD COLUMN IF NOT EXISTS delete_reason TEXT DEFAULT NULL;

-- 4. factures
ALTER TABLE public.factures ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.factures ADD COLUMN IF NOT EXISTS deleted_by UUID DEFAULT NULL;
ALTER TABLE public.factures ADD COLUMN IF NOT EXISTS delete_reason TEXT DEFAULT NULL;

-- 5. paiements
ALTER TABLE public.paiements ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.paiements ADD COLUMN IF NOT EXISTS deleted_by UUID DEFAULT NULL;
ALTER TABLE public.paiements ADD COLUMN IF NOT EXISTS delete_reason TEXT DEFAULT NULL;

-- 6. contact_documents
ALTER TABLE public.contact_documents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.contact_documents ADD COLUMN IF NOT EXISTS deleted_by UUID DEFAULT NULL;
ALTER TABLE public.contact_documents ADD COLUMN IF NOT EXISTS delete_reason TEXT DEFAULT NULL;

-- 7. prospects
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS deleted_by UUID DEFAULT NULL;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS delete_reason TEXT DEFAULT NULL;

-- 8. devis
ALTER TABLE public.devis ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.devis ADD COLUMN IF NOT EXISTS deleted_by UUID DEFAULT NULL;
ALTER TABLE public.devis ADD COLUMN IF NOT EXISTS delete_reason TEXT DEFAULT NULL;

-- 9. emargements
ALTER TABLE public.emargements ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.emargements ADD COLUMN IF NOT EXISTS deleted_by UUID DEFAULT NULL;
ALTER TABLE public.emargements ADD COLUMN IF NOT EXISTS delete_reason TEXT DEFAULT NULL;

-- 10. document_templates
ALTER TABLE public.document_templates ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.document_templates ADD COLUMN IF NOT EXISTS deleted_by UUID DEFAULT NULL;
ALTER TABLE public.document_templates ADD COLUMN IF NOT EXISTS delete_reason TEXT DEFAULT NULL;

-- 11. catalogue_formations
ALTER TABLE public.catalogue_formations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.catalogue_formations ADD COLUMN IF NOT EXISTS deleted_by UUID DEFAULT NULL;
ALTER TABLE public.catalogue_formations ADD COLUMN IF NOT EXISTS delete_reason TEXT DEFAULT NULL;

-- 12. email_templates
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS deleted_by UUID DEFAULT NULL;
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS delete_reason TEXT DEFAULT NULL;

-- Create indexes for performance on soft delete queries
CREATE INDEX IF NOT EXISTS idx_sessions_deleted_at ON public.sessions (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_deleted_at ON public.contacts (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_session_inscriptions_deleted_at ON public.session_inscriptions (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_factures_deleted_at ON public.factures (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_paiements_deleted_at ON public.paiements (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contact_documents_deleted_at ON public.contact_documents (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prospects_deleted_at ON public.prospects (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_devis_deleted_at ON public.devis (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_emargements_deleted_at ON public.emargements (deleted_at) WHERE deleted_at IS NOT NULL;

-- =====================================================
-- SOFT DELETE RPC: Generic soft delete function
-- =====================================================
CREATE OR REPLACE FUNCTION public.soft_delete_record(
  p_table_name TEXT,
  p_record_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only allow known tables
  IF p_table_name NOT IN ('sessions', 'contacts', 'session_inscriptions', 'factures', 'paiements', 'contact_documents', 'prospects', 'devis', 'emargements', 'document_templates', 'catalogue_formations', 'email_templates') THEN
    RAISE EXCEPTION 'Table % not supported for soft delete', p_table_name;
  END IF;

  EXECUTE format(
    'UPDATE public.%I SET deleted_at = now(), deleted_by = $1, delete_reason = $2 WHERE id = $3 AND deleted_at IS NULL',
    p_table_name
  ) USING auth.uid(), p_reason, p_record_id;

  -- Log to audit_logs
  INSERT INTO public.audit_logs (table_name, record_id, action, user_id, user_email, new_data)
  VALUES (
    p_table_name,
    p_record_id,
    'SOFT_DELETE',
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    jsonb_build_object('reason', p_reason, 'deleted_at', now())
  );

  RETURN FOUND;
END;
$$;

-- =====================================================
-- RESTORE RPC: Generic restore function
-- =====================================================
CREATE OR REPLACE FUNCTION public.restore_record(
  p_table_name TEXT,
  p_record_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_table_name NOT IN ('sessions', 'contacts', 'session_inscriptions', 'factures', 'paiements', 'contact_documents', 'prospects', 'devis', 'emargements', 'document_templates', 'catalogue_formations', 'email_templates') THEN
    RAISE EXCEPTION 'Table % not supported for restore', p_table_name;
  END IF;

  EXECUTE format(
    'UPDATE public.%I SET deleted_at = NULL, deleted_by = NULL, delete_reason = NULL WHERE id = $1 AND deleted_at IS NOT NULL',
    p_table_name
  ) USING p_record_id;

  -- Log to audit_logs
  INSERT INTO public.audit_logs (table_name, record_id, action, user_id, user_email)
  VALUES (
    p_table_name,
    p_record_id,
    'RESTORE',
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid())
  );

  RETURN FOUND;
END;
$$;

-- =====================================================
-- SOFT DELETE SESSION with cascade: also soft-delete inscriptions & emargements
-- =====================================================
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
  -- Soft delete the session
  UPDATE public.sessions 
  SET deleted_at = now(), deleted_by = auth.uid(), delete_reason = p_reason 
  WHERE id = p_session_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session non trouvée ou déjà supprimée');
  END IF;

  -- Soft delete related inscriptions
  UPDATE public.session_inscriptions
  SET deleted_at = now(), deleted_by = auth.uid(), delete_reason = 'Cascade: session supprimée'
  WHERE session_id = p_session_id AND deleted_at IS NULL;
  GET DIAGNOSTICS v_inscriptions_count = ROW_COUNT;

  -- Soft delete related emargements
  UPDATE public.emargements
  SET deleted_at = now(), deleted_by = auth.uid(), delete_reason = 'Cascade: session supprimée'
  WHERE session_id = p_session_id AND deleted_at IS NULL;
  GET DIAGNOSTICS v_emargements_count = ROW_COUNT;

  -- Log
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

-- =====================================================
-- RESTORE SESSION with cascade
-- =====================================================
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
  -- Restore the session
  UPDATE public.sessions 
  SET deleted_at = NULL, deleted_by = NULL, delete_reason = NULL
  WHERE id = p_session_id AND deleted_at IS NOT NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session non trouvée ou pas supprimée');
  END IF;

  -- Restore cascaded inscriptions
  UPDATE public.session_inscriptions
  SET deleted_at = NULL, deleted_by = NULL, delete_reason = NULL
  WHERE session_id = p_session_id AND delete_reason = 'Cascade: session supprimée';
  GET DIAGNOSTICS v_inscriptions_count = ROW_COUNT;

  -- Restore cascaded emargements
  UPDATE public.emargements
  SET deleted_at = NULL, deleted_by = NULL, delete_reason = NULL
  WHERE session_id = p_session_id AND delete_reason = 'Cascade: session supprimée';
  GET DIAGNOSTICS v_emargements_count = ROW_COUNT;

  -- Log
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

-- =====================================================
-- GET TRASH ITEMS: List all soft-deleted records
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_trash_items(
  p_table_filter TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE(
  item_id UUID,
  table_name TEXT,
  item_label TEXT,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  deleted_by_email TEXT,
  delete_reason TEXT,
  related_count INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH trash AS (
    -- Sessions
    SELECT s.id, 'sessions'::TEXT, s.nom::TEXT AS label, s.deleted_at, s.deleted_by, s.delete_reason,
      (SELECT count(*)::INT FROM session_inscriptions si WHERE si.session_id = s.id AND si.delete_reason = 'Cascade: session supprimée') AS rel_count
    FROM sessions s WHERE s.deleted_at IS NOT NULL
      AND (p_table_filter IS NULL OR p_table_filter = 'sessions')
      AND (p_search IS NULL OR s.nom ILIKE '%' || p_search || '%')
    
    UNION ALL
    
    -- Contacts
    SELECT c.id, 'contacts'::TEXT, (c.prenom || ' ' || c.nom)::TEXT, c.deleted_at, c.deleted_by, c.delete_reason, 0
    FROM contacts c WHERE c.deleted_at IS NOT NULL
      AND (p_table_filter IS NULL OR p_table_filter = 'contacts')
      AND (p_search IS NULL OR c.nom ILIKE '%' || p_search || '%' OR c.prenom ILIKE '%' || p_search || '%')
    
    UNION ALL
    
    -- Prospects
    SELECT p.id, 'prospects'::TEXT, (p.prenom || ' ' || p.nom)::TEXT, p.deleted_at, p.deleted_by, p.delete_reason, 0
    FROM prospects p WHERE p.deleted_at IS NOT NULL
      AND (p_table_filter IS NULL OR p_table_filter = 'prospects')
      AND (p_search IS NULL OR p.nom ILIKE '%' || p_search || '%' OR p.prenom ILIKE '%' || p_search || '%')
    
    UNION ALL
    
    -- Factures
    SELECT f.id, 'factures'::TEXT, f.numero_facture::TEXT, f.deleted_at, f.deleted_by, f.delete_reason, 0
    FROM factures f WHERE f.deleted_at IS NOT NULL
      AND (p_table_filter IS NULL OR p_table_filter = 'factures')
      AND (p_search IS NULL OR f.numero_facture ILIKE '%' || p_search || '%')
    
    UNION ALL
    
    -- Devis
    SELECT d.id, 'devis'::TEXT, d.numero_devis::TEXT, d.deleted_at, d.deleted_by, d.delete_reason, 0
    FROM devis d WHERE d.deleted_at IS NOT NULL
      AND (p_table_filter IS NULL OR p_table_filter = 'devis')
      AND (p_search IS NULL OR d.numero_devis ILIKE '%' || p_search || '%')
    
    UNION ALL
    
    -- Session inscriptions
    SELECT si.id, 'session_inscriptions'::TEXT, 
      COALESCE((SELECT c.prenom || ' ' || c.nom FROM contacts c WHERE c.id = si.contact_id), 'Inconnu')::TEXT,
      si.deleted_at, si.deleted_by, si.delete_reason, 0
    FROM session_inscriptions si WHERE si.deleted_at IS NOT NULL
      AND si.delete_reason != 'Cascade: session supprimée' -- Don't show cascaded items separately
      AND (p_table_filter IS NULL OR p_table_filter = 'session_inscriptions')
    
    UNION ALL
    
    -- Contact documents
    SELECT cd.id, 'contact_documents'::TEXT, cd.nom::TEXT, cd.deleted_at, cd.deleted_by, cd.delete_reason, 0
    FROM contact_documents cd WHERE cd.deleted_at IS NOT NULL
      AND (p_table_filter IS NULL OR p_table_filter = 'contact_documents')
      AND (p_search IS NULL OR cd.nom ILIKE '%' || p_search || '%')
    
    UNION ALL
    
    -- Paiements
    SELECT pm.id, 'paiements'::TEXT, ('Paiement ' || pm.montant || '€')::TEXT, pm.deleted_at, pm.deleted_by, pm.delete_reason, 0
    FROM paiements pm WHERE pm.deleted_at IS NOT NULL
      AND (p_table_filter IS NULL OR p_table_filter = 'paiements')
    
    UNION ALL

    -- Catalogue formations
    SELECT cf.id, 'catalogue_formations'::TEXT, cf.intitule::TEXT, cf.deleted_at, cf.deleted_by, cf.delete_reason, 0
    FROM catalogue_formations cf WHERE cf.deleted_at IS NOT NULL
      AND (p_table_filter IS NULL OR p_table_filter = 'catalogue_formations')
      AND (p_search IS NULL OR cf.intitule ILIKE '%' || p_search || '%')

    UNION ALL

    -- Email templates
    SELECT et.id, 'email_templates'::TEXT, et.name::TEXT, et.deleted_at, et.deleted_by, et.delete_reason, 0
    FROM email_templates et WHERE et.deleted_at IS NOT NULL
      AND (p_table_filter IS NULL OR p_table_filter = 'email_templates')
      AND (p_search IS NULL OR et.name ILIKE '%' || p_search || '%')
  )
  SELECT t.id, t.table_name, t.label, t.deleted_at, t.deleted_by,
    (SELECT email FROM auth.users WHERE auth.users.id = t.deleted_by)::TEXT AS deleted_by_email,
    t.delete_reason, t.rel_count
  FROM trash t
  ORDER BY t.deleted_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- =====================================================
-- GET SESSION DELETE IMPACT: Preview what will be affected
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_delete_impact(
  p_table_name TEXT,
  p_record_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSONB := '{}'::JSONB;
BEGIN
  IF p_table_name = 'sessions' THEN
    SELECT jsonb_build_object(
      'inscriptions', (SELECT count(*) FROM session_inscriptions WHERE session_id = p_record_id AND deleted_at IS NULL),
      'emargements', (SELECT count(*) FROM emargements WHERE session_id = p_record_id AND deleted_at IS NULL),
      'factures', (SELECT count(*) FROM factures f JOIN session_inscriptions si ON f.session_inscription_id = si.id WHERE si.session_id = p_record_id AND f.deleted_at IS NULL),
      'documents', (SELECT count(*) FROM document_envois WHERE session_id = p_record_id)
    ) INTO v_result;
  ELSIF p_table_name = 'contacts' THEN
    SELECT jsonb_build_object(
      'inscriptions', (SELECT count(*) FROM session_inscriptions WHERE contact_id = p_record_id AND deleted_at IS NULL),
      'factures', (SELECT count(*) FROM factures WHERE contact_id = p_record_id AND deleted_at IS NULL),
      'documents', (SELECT count(*) FROM contact_documents WHERE contact_id = p_record_id AND deleted_at IS NULL),
      'paiements', (SELECT count(*) FROM paiements p JOIN factures f ON p.facture_id = f.id WHERE f.contact_id = p_record_id AND p.deleted_at IS NULL)
    ) INTO v_result;
  ELSIF p_table_name = 'factures' THEN
    SELECT jsonb_build_object(
      'paiements', (SELECT count(*) FROM paiements WHERE facture_id = p_record_id AND deleted_at IS NULL)
    ) INTO v_result;
  END IF;

  RETURN v_result;
END;
$$;
