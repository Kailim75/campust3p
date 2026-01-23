-- Ajouter les colonnes manquantes à attestation_certificates
ALTER TABLE public.attestation_certificates 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'generated' 
  CHECK (status IN ('generated', 'cancelled', 'revoked'));

ALTER TABLE public.attestation_certificates 
ADD COLUMN IF NOT EXISTS document_url TEXT;

ALTER TABLE public.attestation_certificates 
ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.attestation_certificates 
ADD COLUMN IF NOT EXISTS revoked_by UUID;

ALTER TABLE public.attestation_certificates 
ADD COLUMN IF NOT EXISTS revocation_reason TEXT;

-- Index pour recherche par statut
CREATE INDEX IF NOT EXISTS idx_attestation_certificates_status 
ON public.attestation_certificates(status);

-- Fonction pour révoquer un certificat
CREATE OR REPLACE FUNCTION public.revoke_certificate(
  p_certificate_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

-- Fonction pour annuler un certificat
CREATE OR REPLACE FUNCTION public.cancel_certificate(
  p_certificate_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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