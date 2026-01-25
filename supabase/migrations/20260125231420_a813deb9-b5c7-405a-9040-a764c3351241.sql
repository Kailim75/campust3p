-- =============================================
-- CORRECTIFS SÉCURITÉ CRITIQUES
-- =============================================

-- 1. FIX: enquete_tokens - Restreindre le SELECT aux tokens valides uniquement
-- Supprimer l'ancienne politique trop permissive
DROP POLICY IF EXISTS "Public can validate tokens" ON public.enquete_tokens;

-- Créer une politique plus restrictive : seuls les utilisateurs authentifiés avec rôle peuvent lister
CREATE POLICY "Staff can view tokens"
ON public.enquete_tokens
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'staff', 'super_admin')
  )
);

-- 2. FIX: attestation_certificates - Restreindre INSERT aux admin/staff
DROP POLICY IF EXISTS "Authenticated users can create certificates" ON public.attestation_certificates;
DROP POLICY IF EXISTS "Users can create certificates" ON public.attestation_certificates;

CREATE POLICY "Staff can create certificates"
ON public.attestation_certificates
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'staff', 'super_admin')
  )
);

-- 3. Ajouter une politique UPDATE restrictive pour les certificats
DROP POLICY IF EXISTS "Staff can update certificates" ON public.attestation_certificates;

CREATE POLICY "Staff can update certificates"
ON public.attestation_certificates
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'staff', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'staff', 'super_admin')
  )
);

-- 4. Fonction RGPD : Anonymisation des contacts (droit à l'effacement)
CREATE OR REPLACE FUNCTION public.anonymize_contact(p_contact_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_anonymous_id TEXT;
BEGIN
  -- Vérifier que l'appelant est admin ou staff
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Seuls les administrateurs peuvent anonymiser des contacts';
  END IF;

  -- Générer un identifiant anonyme
  v_anonymous_id := 'ANONYME-' || SUBSTRING(p_contact_id::TEXT, 1, 8);

  -- Anonymiser les données personnelles
  UPDATE public.contacts
  SET
    nom = v_anonymous_id,
    prenom = 'Contact',
    nom_naissance = NULL,
    email = NULL,
    telephone = NULL,
    date_naissance = NULL,
    ville_naissance = NULL,
    pays_naissance = NULL,
    rue = NULL,
    code_postal = NULL,
    ville = NULL,
    numero_permis = NULL,
    prefecture_permis = NULL,
    numero_carte_professionnelle = NULL,
    prefecture_carte = NULL,
    commentaires = 'Données anonymisées conformément au RGPD le ' || TO_CHAR(now(), 'DD/MM/YYYY'),
    archived = true,
    updated_at = now()
  WHERE id = p_contact_id;

  -- Logger l'action d'anonymisation
  INSERT INTO public.audit_logs (
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    user_id,
    user_email
  ) VALUES (
    'contacts',
    p_contact_id,
    'ANONYMIZE_GDPR',
    NULL,
    jsonb_build_object('anonymized_at', now(), 'reason', 'GDPR Right to Erasure'),
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid())
  );

  RETURN FOUND;
END;
$$;

-- 5. Fonction RGPD : Export des données personnelles (droit à la portabilité)
CREATE OR REPLACE FUNCTION public.export_contact_data(p_contact_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Vérifier que l'appelant est admin ou staff
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'staff', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Accès non autorisé';
  END IF;

  -- Collecter toutes les données du contact
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

  -- Logger l'export
  INSERT INTO public.audit_logs (
    table_name,
    record_id,
    action,
    new_data,
    user_id,
    user_email
  ) VALUES (
    'contacts',
    p_contact_id,
    'EXPORT_GDPR',
    jsonb_build_object('exported_at', now()),
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid())
  );

  RETURN v_result;
END;
$$;