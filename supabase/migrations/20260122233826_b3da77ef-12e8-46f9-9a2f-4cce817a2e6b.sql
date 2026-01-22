-- Table pour stocker les certificats d'attestation avec numéro unique
CREATE TABLE public.attestation_certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_certificat TEXT NOT NULL UNIQUE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE RESTRICT,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  type_attestation TEXT NOT NULL DEFAULT 'formation',
  date_emission TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  emis_par UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Contrainte pour éviter les doublons contact+session+type
  CONSTRAINT unique_attestation_per_contact_session_type UNIQUE (contact_id, session_id, type_attestation)
);

-- Index pour recherche rapide par numéro
CREATE INDEX idx_attestation_certificates_numero ON public.attestation_certificates(numero_certificat);
CREATE INDEX idx_attestation_certificates_contact ON public.attestation_certificates(contact_id);
CREATE INDEX idx_attestation_certificates_session ON public.attestation_certificates(session_id);

-- Séquence pour l'ID incrémental (ne repart jamais à zéro)
CREATE SEQUENCE public.attestation_certificate_seq START WITH 1 INCREMENT BY 1 NO CYCLE;

-- Fonction de génération du numéro de certificat
CREATE OR REPLACE FUNCTION public.generate_numero_certificat(p_type_attestation TEXT DEFAULT 'formation')
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_year TEXT;
  v_seq INTEGER;
  v_prefix TEXT;
  v_numero TEXT;
BEGIN
  -- Année courante
  v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  -- Préfixe selon le type
  CASE p_type_attestation
    WHEN 'mobilite' THEN v_prefix := 'T3P-MOB';
    WHEN 'formation' THEN v_prefix := 'T3P-ATTEST';
    WHEN 'competences' THEN v_prefix := 'T3P-COMP';
    ELSE v_prefix := 'T3P-ATTEST';
  END CASE;
  
  -- Récupérer le prochain numéro de séquence
  v_seq := nextval('public.attestation_certificate_seq');
  
  -- Construire le numéro final
  v_numero := v_prefix || '-' || v_year || '-' || LPAD(v_seq::TEXT, 6, '0');
  
  RETURN v_numero;
END;
$$;

-- Fonction pour créer un certificat et retourner les infos
CREATE OR REPLACE FUNCTION public.create_attestation_certificate(
  p_contact_id UUID,
  p_session_id UUID DEFAULT NULL,
  p_type_attestation TEXT DEFAULT 'formation',
  p_metadata JSONB DEFAULT '{}'
)
RETURNS TABLE(
  id UUID,
  numero_certificat TEXT,
  date_emission TIMESTAMP WITH TIME ZONE
)
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
  -- Vérifier si un certificat existe déjà pour ce contact/session/type
  SELECT ac.id, ac.numero_certificat, ac.date_emission
  INTO v_existing
  FROM public.attestation_certificates ac
  WHERE ac.contact_id = p_contact_id
    AND (ac.session_id = p_session_id OR (ac.session_id IS NULL AND p_session_id IS NULL))
    AND ac.type_attestation = p_type_attestation;
  
  IF FOUND THEN
    -- Retourner le certificat existant
    RETURN QUERY SELECT v_existing.id, v_existing.numero_certificat, v_existing.date_emission;
    RETURN;
  END IF;
  
  -- Générer un nouveau numéro
  v_numero := generate_numero_certificat(p_type_attestation);
  v_date := now();
  
  -- Insérer le nouveau certificat
  INSERT INTO public.attestation_certificates (
    numero_certificat,
    contact_id,
    session_id,
    type_attestation,
    emis_par,
    metadata,
    date_emission
  ) VALUES (
    v_numero,
    p_contact_id,
    p_session_id,
    p_type_attestation,
    auth.uid(),
    p_metadata,
    v_date
  )
  RETURNING attestation_certificates.id INTO v_id;
  
  RETURN QUERY SELECT v_id, v_numero, v_date;
END;
$$;

-- RLS
ALTER TABLE public.attestation_certificates ENABLE ROW LEVEL SECURITY;

-- Politique de lecture pour tous les utilisateurs authentifiés
CREATE POLICY "Authenticated users can view certificates"
ON public.attestation_certificates
FOR SELECT
TO authenticated
USING (true);

-- Politique d'insertion pour les utilisateurs authentifiés
CREATE POLICY "Authenticated users can create certificates"
ON public.attestation_certificates
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Pas de politique UPDATE/DELETE - les certificats sont immuables

-- Ajouter l'audit trail
CREATE TRIGGER audit_attestation_certificates
AFTER INSERT OR DELETE ON public.attestation_certificates
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Commentaires
COMMENT ON TABLE public.attestation_certificates IS 'Certificats d''attestation avec numéros uniques et immuables';
COMMENT ON COLUMN public.attestation_certificates.numero_certificat IS 'Numéro unique au format T3P-TYPE-YYYY-XXXXXX';
COMMENT ON FUNCTION public.generate_numero_certificat IS 'Génère un numéro de certificat unique et incrémental';