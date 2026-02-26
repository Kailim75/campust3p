
-- RPC: Récupérer une demande de signature publiquement (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_signature_request_public(p_signature_id uuid)
RETURNS TABLE(
  id uuid,
  titre text,
  description text,
  type_document text,
  date_expiration timestamptz,
  statut text,
  document_url text,
  signature_url text,
  contact_id uuid,
  contact_nom text,
  contact_prenom text,
  contact_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sr.id,
    sr.titre,
    sr.description,
    sr.type_document,
    sr.date_expiration,
    sr.statut,
    sr.document_url,
    sr.signature_url,
    sr.contact_id,
    c.nom AS contact_nom,
    c.prenom AS contact_prenom,
    c.email AS contact_email
  FROM public.signature_requests sr
  LEFT JOIN public.contacts c ON c.id = sr.contact_id
  WHERE sr.id = p_signature_id;
END;
$$;

-- RPC: Signer un document publiquement (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.sign_document_public(
  p_signature_id uuid,
  p_signature_url text,
  p_user_agent text DEFAULT NULL
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

  IF v_request.statut != 'envoye' THEN
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

-- RPC: Refuser un document publiquement (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.refuse_document_public(
  p_signature_id uuid,
  p_commentaires text DEFAULT 'Refusé par le signataire'
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

  IF v_request.statut NOT IN ('envoye', 'brouillon') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ce document ne peut plus être modifié');
  END IF;

  UPDATE public.signature_requests
  SET 
    statut = 'refuse',
    commentaires = p_commentaires
  WHERE id = p_signature_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- RPC: Récupérer les documents liés d'un contact (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_related_signature_docs(p_contact_id uuid)
RETURNS TABLE(
  id uuid,
  titre text,
  type_document text,
  statut text,
  document_url text,
  date_envoi timestamptz,
  date_signature timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sr.id,
    sr.titre,
    sr.type_document,
    sr.statut,
    sr.document_url,
    sr.date_envoi,
    sr.date_signature
  FROM public.signature_requests sr
  WHERE sr.contact_id = p_contact_id
  ORDER BY sr.created_at DESC;
END;
$$;

-- Accorder l'exécution au rôle anon pour l'accès public
GRANT EXECUTE ON FUNCTION public.get_signature_request_public(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.sign_document_public(uuid, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.refuse_document_public(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_related_signature_docs(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_signature_request_public(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sign_document_public(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refuse_document_public(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_related_signature_docs(uuid) TO authenticated;
