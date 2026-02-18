
-- =============================================
-- FIX 1: Add auth checks to SECURITY DEFINER functions
-- =============================================

-- 1a. reserver_creneau - Add authentication check
CREATE OR REPLACE FUNCTION public.reserver_creneau(p_creneau_id uuid, p_contact_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE v_creneau RECORD; v_conflicts RECORD;
BEGIN
  -- Auth check: require authenticated user with admin or staff role
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Non autorisé');
  END IF;
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Accès refusé: rôle admin ou staff requis');
  END IF;

  SELECT * INTO v_creneau FROM creneaux_conduite WHERE id = p_creneau_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Créneau introuvable'); END IF;
  IF v_creneau.statut != 'disponible' THEN RETURN jsonb_build_object('success', false, 'error', 'Ce créneau n''est plus disponible'); END IF;
  
  SELECT * INTO v_conflicts FROM check_creneau_conflicts(v_creneau.date_creneau, v_creneau.heure_debut, v_creneau.heure_fin, NULL, NULL, p_contact_id, p_creneau_id) LIMIT 1;
  IF FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Vous avez déjà un créneau sur cette plage horaire'); END IF;
  
  UPDATE creneaux_conduite SET contact_id = p_contact_id, statut = 'reserve', reserve_at = now() WHERE id = p_creneau_id AND statut = 'disponible';
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Réservation impossible'); END IF;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 1b. archive_session - Add auth check
CREATE OR REPLACE FUNCTION public.archive_session(p_session_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_date_fin date;
BEGIN
  -- Auth check
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')) THEN
    RAISE EXCEPTION 'Accès refusé: rôle admin ou staff requis';
  END IF;

  SELECT date_fin INTO v_date_fin
  FROM public.sessions
  WHERE id = p_session_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session non trouvée';
  END IF;
  
  IF v_date_fin > CURRENT_DATE THEN
    RAISE EXCEPTION 'Impossible d''archiver une session dont la date de fin n''est pas dépassée';
  END IF;
  
  UPDATE public.sessions
  SET 
    archived = true,
    archived_at = now(),
    archived_by = auth.uid()
  WHERE id = p_session_id
    AND archived = false;
  
  RETURN FOUND;
END;
$$;

-- 1c. unarchive_session - Add auth check
CREATE OR REPLACE FUNCTION public.unarchive_session(p_session_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')) THEN
    RAISE EXCEPTION 'Accès refusé: rôle admin ou staff requis';
  END IF;

  UPDATE public.sessions
  SET 
    archived = false,
    archived_at = null,
    archived_by = null
  WHERE id = p_session_id
    AND archived = true;
  
  RETURN FOUND;
END;
$$;

-- 1d. create_attestation_certificate - Add auth check
CREATE OR REPLACE FUNCTION public.create_attestation_certificate(p_contact_id uuid, p_session_id uuid DEFAULT NULL::uuid, p_type_attestation text DEFAULT 'formation'::text, p_metadata jsonb DEFAULT '{}'::jsonb)
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
BEGIN
  -- Auth check
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')) THEN
    RAISE EXCEPTION 'Accès refusé: rôle admin ou staff requis';
  END IF;

  SELECT ac.id, ac.numero_certificat, ac.date_emission
  INTO v_existing
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
  
  INSERT INTO public.attestation_certificates (
    numero_certificat, contact_id, session_id, type_attestation, emis_par, metadata, date_emission
  ) VALUES (
    v_numero, p_contact_id, p_session_id, p_type_attestation, auth.uid(), p_metadata, v_date
  )
  RETURNING attestation_certificates.id INTO v_id;
  
  RETURN QUERY SELECT v_id, v_numero, v_date;
END;
$$;

-- 1e. pay_partner_commission - Add auth check
CREATE OR REPLACE FUNCTION public.pay_partner_commission(p_partner_id uuid, p_amount numeric)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')) THEN
    RAISE EXCEPTION 'Accès refusé: rôle admin ou staff requis';
  END IF;

  UPDATE public.partners
  SET commission_payee = COALESCE(commission_payee, 0) + p_amount,
      updated_at = now()
  WHERE id = p_partner_id;
  
  RETURN FOUND;
END;
$$;

-- 1f. revoke_certificate - Add auth check
CREATE OR REPLACE FUNCTION public.revoke_certificate(p_certificate_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')) THEN
    RAISE EXCEPTION 'Accès refusé: rôle admin ou staff requis';
  END IF;

  UPDATE public.attestation_certificates
  SET 
    status = 'revoked',
    revoked_at = now(),
    revoked_by = auth.uid(),
    revocation_reason = p_reason
  WHERE id = p_certificate_id
    AND status = 'generated';
  
  RETURN FOUND;
END;
$$;

-- 1g. cancel_certificate - Add auth check
CREATE OR REPLACE FUNCTION public.cancel_certificate(p_certificate_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')) THEN
    RAISE EXCEPTION 'Accès refusé: rôle admin ou staff requis';
  END IF;

  UPDATE public.attestation_certificates
  SET 
    status = 'cancelled',
    revoked_at = now(),
    revoked_by = auth.uid(),
    revocation_reason = p_reason
  WHERE id = p_certificate_id
    AND status = 'generated';
  
  RETURN FOUND;
END;
$$;

-- =============================================
-- FIX 2: Make generated-documents bucket private
-- =============================================
UPDATE storage.buckets SET public = false WHERE id = 'generated-documents';
