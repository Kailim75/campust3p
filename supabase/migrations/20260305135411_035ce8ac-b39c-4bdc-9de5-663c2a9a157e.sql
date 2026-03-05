
-- =====================================================
-- SPRINT 1 - MIGRATION 2/2: RPC hardening + Storage policies
-- =====================================================

-- =====================================================
-- A) RPC HARDENING: anonymize_contact - add centre check
-- =====================================================
CREATE OR REPLACE FUNCTION public.anonymize_contact(p_contact_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_anonymous_id TEXT;
  v_centre_id UUID;
BEGIN
  -- Get contact's centre_id
  SELECT centre_id INTO v_centre_id FROM public.contacts WHERE id = p_contact_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contact non trouvé'; END IF;

  -- Check role + centre access
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.is_super_admin()) THEN
    RAISE EXCEPTION 'Seuls les administrateurs peuvent anonymiser des contacts';
  END IF;
  IF NOT public.has_centre_access(v_centre_id) THEN
    RAISE EXCEPTION 'Accès refusé: ce contact n''appartient pas à votre centre';
  END IF;

  v_anonymous_id := 'ANONYME-' || SUBSTRING(p_contact_id::TEXT, 1, 8);

  UPDATE public.contacts
  SET nom = v_anonymous_id, prenom = 'Contact', nom_naissance = NULL, email = NULL,
      telephone = NULL, date_naissance = NULL, ville_naissance = NULL, pays_naissance = NULL,
      rue = NULL, code_postal = NULL, ville = NULL, numero_permis = NULL,
      prefecture_permis = NULL, numero_carte_professionnelle = NULL, prefecture_carte = NULL,
      commentaires = 'Données anonymisées conformément au RGPD le ' || TO_CHAR(now(), 'DD/MM/YYYY'),
      archived = true, updated_at = now()
  WHERE id = p_contact_id;

  INSERT INTO public.audit_logs (table_name, record_id, action, new_data, user_id, user_email)
  VALUES ('contacts', p_contact_id, 'ANONYMIZE_GDPR',
    jsonb_build_object('anonymized_at', now(), 'reason', 'GDPR Right to Erasure'),
    auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()));

  RETURN FOUND;
END;
$$;

-- =====================================================
-- A) RPC HARDENING: export_contact_data - add centre check
-- =====================================================
CREATE OR REPLACE FUNCTION public.export_contact_data(p_contact_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSONB;
  v_centre_id UUID;
BEGIN
  SELECT centre_id INTO v_centre_id FROM public.contacts WHERE id = p_contact_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contact non trouvé'; END IF;

  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') OR public.is_super_admin()) THEN
    RAISE EXCEPTION 'Accès non autorisé';
  END IF;
  IF NOT public.has_centre_access(v_centre_id) THEN
    RAISE EXCEPTION 'Accès refusé: ce contact n''appartient pas à votre centre';
  END IF;

  SELECT jsonb_build_object(
    'contact', (SELECT to_jsonb(c.*) FROM public.contacts c WHERE c.id = p_contact_id),
    'documents', (SELECT COALESCE(jsonb_agg(to_jsonb(d.*)), '[]'::jsonb) FROM public.contact_documents d WHERE d.contact_id = p_contact_id),
    'historique', (SELECT COALESCE(jsonb_agg(to_jsonb(h.*)), '[]'::jsonb) FROM public.contact_historique h WHERE h.contact_id = p_contact_id),
    'inscriptions', (SELECT COALESCE(jsonb_agg(to_jsonb(i.*)), '[]'::jsonb) FROM public.session_inscrits i WHERE i.contact_id = p_contact_id),
    'factures', (SELECT COALESCE(jsonb_agg(to_jsonb(f.*)), '[]'::jsonb) FROM public.factures f WHERE f.contact_id = p_contact_id),
    'certificats', (SELECT COALESCE(jsonb_agg(to_jsonb(ac.*)), '[]'::jsonb) FROM public.attestation_certificates ac WHERE ac.contact_id = p_contact_id),
    'satisfaction', (SELECT COALESCE(jsonb_agg(to_jsonb(s.*)), '[]'::jsonb) FROM public.satisfaction_reponses s WHERE s.contact_id = p_contact_id),
    'exported_at', now(),
    'exported_by', auth.uid()
  ) INTO v_result;

  INSERT INTO public.audit_logs (table_name, record_id, action, new_data, user_id, user_email)
  VALUES ('contacts', p_contact_id, 'EXPORT_GDPR',
    jsonb_build_object('exported_at', now()),
    auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()));

  RETURN v_result;
END;
$$;

-- =====================================================
-- A) RPC HARDENING: create_attestation_certificate - add centre check
-- =====================================================
CREATE OR REPLACE FUNCTION public.create_attestation_certificate(p_contact_id uuid, p_session_id uuid DEFAULT NULL, p_type_attestation text DEFAULT 'formation', p_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS TABLE(id uuid, numero_certificat text, date_emission timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_numero TEXT;
  v_id UUID;
  v_date TIMESTAMP WITH TIME ZONE;
  v_existing RECORD;
  v_centre_id UUID;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') OR public.is_super_admin()) THEN
    RAISE EXCEPTION 'Accès refusé: rôle admin ou staff requis';
  END IF;

  SELECT c.centre_id INTO v_centre_id FROM public.contacts c WHERE c.id = p_contact_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contact non trouvé'; END IF;
  IF NOT public.has_centre_access(v_centre_id) THEN
    RAISE EXCEPTION 'Accès refusé: ce contact n''appartient pas à votre centre';
  END IF;

  SELECT ac.id, ac.numero_certificat, ac.date_emission INTO v_existing
  FROM public.attestation_certificates ac
  WHERE ac.contact_id = p_contact_id
    AND (ac.session_id = p_session_id OR (ac.session_id IS NULL AND p_session_id IS NULL))
    AND ac.type_attestation = p_type_attestation;

  IF FOUND THEN
    RETURN QUERY SELECT v_existing.id, v_existing.numero_certificat, v_existing.date_emission;
    RETURN;
  END IF;

  v_numero := generate_numero_certificat(p_type_attestation);
  v_date := now();

  INSERT INTO public.attestation_certificates (numero_certificat, contact_id, session_id, type_attestation, emis_par, metadata, date_emission)
  VALUES (v_numero, p_contact_id, p_session_id, p_type_attestation, auth.uid(), p_metadata, v_date)
  RETURNING attestation_certificates.id INTO v_id;

  RETURN QUERY SELECT v_id, v_numero, v_date;
END;
$$;

-- =====================================================
-- A) RPC HARDENING: archive_session - add centre check
-- =====================================================
CREATE OR REPLACE FUNCTION public.archive_session(p_session_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_date_fin date;
  v_centre_id UUID;
BEGIN
  SELECT date_fin, centre_id INTO v_date_fin, v_centre_id FROM public.sessions WHERE id = p_session_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Session non trouvée'; END IF;

  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') OR public.is_super_admin()) THEN
    RAISE EXCEPTION 'Accès refusé: rôle admin ou staff requis';
  END IF;
  IF NOT public.has_centre_access(v_centre_id) THEN
    RAISE EXCEPTION 'Accès refusé: cette session n''appartient pas à votre centre';
  END IF;

  IF v_date_fin > CURRENT_DATE THEN
    RAISE EXCEPTION 'Impossible d''archiver une session dont la date de fin n''est pas dépassée';
  END IF;

  UPDATE public.sessions SET archived = true, archived_at = now(), archived_by = auth.uid()
  WHERE id = p_session_id AND archived = false;

  RETURN FOUND;
END;
$$;

-- =====================================================
-- A) RPC HARDENING: unarchive_session - add centre check
-- =====================================================
CREATE OR REPLACE FUNCTION public.unarchive_session(p_session_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_centre_id UUID;
BEGIN
  SELECT centre_id INTO v_centre_id FROM public.sessions WHERE id = p_session_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Session non trouvée'; END IF;

  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') OR public.is_super_admin()) THEN
    RAISE EXCEPTION 'Accès refusé: rôle admin ou staff requis';
  END IF;
  IF NOT public.has_centre_access(v_centre_id) THEN
    RAISE EXCEPTION 'Accès refusé: cette session n''appartient pas à votre centre';
  END IF;

  UPDATE public.sessions SET archived = false, archived_at = null, archived_by = null
  WHERE id = p_session_id AND archived = true;

  RETURN FOUND;
END;
$$;

-- =====================================================
-- A) RPC HARDENING: pay_partner_commission - add centre check
-- =====================================================
CREATE OR REPLACE FUNCTION public.pay_partner_commission(p_partner_id uuid, p_amount numeric)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_centre_id UUID;
BEGIN
  SELECT centre_id INTO v_centre_id FROM public.partners WHERE id = p_partner_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Partenaire non trouvé'; END IF;

  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') OR public.is_super_admin()) THEN
    RAISE EXCEPTION 'Accès refusé: rôle admin ou staff requis';
  END IF;
  IF NOT public.has_centre_access(v_centre_id) THEN
    RAISE EXCEPTION 'Accès refusé: ce partenaire n''appartient pas à votre centre';
  END IF;

  UPDATE public.partners SET commission_payee = COALESCE(commission_payee, 0) + p_amount, updated_at = now()
  WHERE id = p_partner_id;

  RETURN FOUND;
END;
$$;

-- =====================================================
-- A) RPC HARDENING: admin_recalc_track_for_catalogue - add centre check
-- =====================================================
CREATE OR REPLACE FUNCTION public.admin_recalc_track_for_catalogue(p_catalogue_id uuid, p_recalc_inscriptions boolean DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_track public.formation_track;
  v_updated_sessions integer;
  v_updated_inscriptions integer := 0;
  v_centre_id UUID;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') OR public.is_super_admin()) THEN
    RAISE EXCEPTION 'Accès refusé: rôle admin ou staff requis';
  END IF;

  SELECT cf.track, cf.centre_id INTO v_track, v_centre_id
  FROM public.catalogue_formations cf WHERE cf.id = p_catalogue_id;
  IF v_track IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Catalogue introuvable ou track null');
  END IF;
  IF NOT public.has_centre_access(v_centre_id) THEN
    RAISE EXCEPTION 'Accès refusé: ce catalogue n''appartient pas à votre centre';
  END IF;

  UPDATE public.sessions s SET track = v_track
  WHERE s.catalogue_formation_id = p_catalogue_id AND s.track IS DISTINCT FROM v_track;
  GET DIAGNOSTICS v_updated_sessions = ROW_COUNT;

  IF p_recalc_inscriptions THEN
    UPDATE public.session_inscriptions si SET track = v_track
    FROM public.sessions s
    WHERE si.session_id = s.id AND s.catalogue_formation_id = p_catalogue_id AND si.track IS DISTINCT FROM v_track;
    GET DIAGNOSTICS v_updated_inscriptions = ROW_COUNT;
  END IF;

  INSERT INTO public.audit_logs (table_name, record_id, action, new_data, user_id, user_email)
  VALUES ('catalogue_formations', p_catalogue_id, 'catalogue_track_recalc',
    jsonb_build_object('track', v_track, 'updated_sessions', v_updated_sessions, 'updated_inscriptions', v_updated_inscriptions, 'recalc_inscriptions', p_recalc_inscriptions),
    auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()));

  RETURN jsonb_build_object('success', true, 'track', v_track, 'updated_sessions', v_updated_sessions, 'updated_inscriptions', v_updated_inscriptions);
END;
$$;

-- =====================================================
-- A) RPC HARDENING: reserver_creneau - add centre check
-- =====================================================
CREATE OR REPLACE FUNCTION public.reserver_creneau(p_creneau_id uuid, p_contact_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_creneau RECORD; v_conflicts RECORD; v_centre_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Non autorisé');
  END IF;
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Accès refusé: rôle admin ou staff requis');
  END IF;

  SELECT * INTO v_creneau FROM creneaux_conduite WHERE id = p_creneau_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Créneau introuvable'); END IF;

  IF NOT public.has_centre_access(v_creneau.centre_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Accès refusé: ce créneau n''appartient pas à votre centre');
  END IF;

  IF v_creneau.statut != 'disponible' THEN RETURN jsonb_build_object('success', false, 'error', 'Ce créneau n''est plus disponible'); END IF;

  SELECT * INTO v_conflicts FROM check_creneau_conflicts(v_creneau.date_creneau, v_creneau.heure_debut, v_creneau.heure_fin, NULL, NULL, p_contact_id, p_creneau_id) LIMIT 1;
  IF FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Vous avez déjà un créneau sur cette plage horaire'); END IF;

  UPDATE creneaux_conduite SET contact_id = p_contact_id, statut = 'reserve', reserve_at = now() WHERE id = p_creneau_id AND statut = 'disponible';
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Réservation impossible'); END IF;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- =====================================================
-- A) RPC HARDENING: revoke_certificate - add centre check
-- =====================================================
CREATE OR REPLACE FUNCTION public.revoke_certificate(p_certificate_id uuid, p_reason text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_centre_id UUID;
BEGIN
  SELECT c.centre_id INTO v_centre_id
  FROM public.attestation_certificates ac
  JOIN public.contacts c ON c.id = ac.contact_id
  WHERE ac.id = p_certificate_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Certificat non trouvé'; END IF;

  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') OR public.is_super_admin()) THEN
    RAISE EXCEPTION 'Accès refusé: rôle admin ou staff requis';
  END IF;
  IF NOT public.has_centre_access(v_centre_id) THEN
    RAISE EXCEPTION 'Accès refusé: ce certificat n''appartient pas à votre centre';
  END IF;

  UPDATE public.attestation_certificates
  SET status = 'revoked', revoked_at = now(), revoked_by = auth.uid(), revocation_reason = p_reason
  WHERE id = p_certificate_id AND status = 'generated';

  RETURN FOUND;
END;
$$;

-- =====================================================
-- A) RPC HARDENING: cancel_certificate - add centre check
-- =====================================================
CREATE OR REPLACE FUNCTION public.cancel_certificate(p_certificate_id uuid, p_reason text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_centre_id UUID;
BEGIN
  SELECT c.centre_id INTO v_centre_id
  FROM public.attestation_certificates ac
  JOIN public.contacts c ON c.id = ac.contact_id
  WHERE ac.id = p_certificate_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Certificat non trouvé'; END IF;

  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') OR public.is_super_admin()) THEN
    RAISE EXCEPTION 'Accès refusé: rôle admin ou staff requis';
  END IF;
  IF NOT public.has_centre_access(v_centre_id) THEN
    RAISE EXCEPTION 'Accès refusé: ce certificat n''appartient pas à votre centre';
  END IF;

  UPDATE public.attestation_certificates
  SET status = 'cancelled', revoked_at = now(), revoked_by = auth.uid(), revocation_reason = p_reason
  WHERE id = p_certificate_id AND status = 'generated';

  RETURN FOUND;
END;
$$;

-- =====================================================
-- B) STORAGE: Make centre-formation-assets PRIVATE
-- =====================================================
UPDATE storage.buckets SET public = false WHERE id = 'centre-formation-assets';

-- =====================================================
-- B) STORAGE: Harden pedagogie bucket policies
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can upload pedagogie" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete pedagogie" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update pedagogie" ON storage.objects;

CREATE POLICY "Staff can upload pedagogie" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'pedagogie'
  AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role) OR public.has_role(auth.uid(), 'formateur'::public.app_role))
);
CREATE POLICY "Staff can update pedagogie" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'pedagogie'
  AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role) OR public.has_role(auth.uid(), 'formateur'::public.app_role))
);
CREATE POLICY "Staff can delete pedagogie" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'pedagogie'
  AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role))
);

-- =====================================================
-- B) STORAGE: Remove public upload on signatures
-- =====================================================
DROP POLICY IF EXISTS "Public can upload signatures" ON storage.objects;
-- The existing "Staff can upload signatures" policy already handles authenticated uploads
-- Public read for signatures is needed for the signature portal workflow
