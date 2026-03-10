CREATE OR REPLACE FUNCTION public.sign_document_public(
  p_signature_id UUID,
  p_signature_url TEXT,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_request RECORD;
BEGIN
  SELECT * INTO v_request
  FROM public.signature_requests
  WHERE id = p_signature_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Document introuvable');
  END IF;

  -- Accept both en_attente and envoye statuses
  IF v_request.statut NOT IN ('en_attente', 'envoye') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ce document ne peut plus être signé');
  END IF;

  IF v_request.date_expiration IS NOT NULL AND v_request.date_expiration < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ce lien de signature a expiré');
  END IF;

  UPDATE public.signature_requests
  SET 
    statut = 'signe',
    signature_url = p_signature_url,
    date_signature = now(),
    ip_signature = NULL,
    user_agent_signature = p_user_agent
  WHERE id = p_signature_id;

  RETURN jsonb_build_object('success', true);
END;
$$;