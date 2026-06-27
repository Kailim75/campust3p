DROP FUNCTION IF EXISTS public.get_related_signature_docs(uuid);

CREATE OR REPLACE FUNCTION public.get_related_signature_docs(p_contact_id uuid)
RETURNS TABLE(
  id uuid,
  titre text,
  type_document text,
  statut text,
  document_url text,
  date_envoi timestamptz,
  date_signature timestamptz,
  access_token text,
  date_expiration date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    sr.id,
    sr.titre,
    sr.type_document,
    sr.statut,
    sr.document_url,
    sr.date_envoi,
    sr.date_signature,
    sr.access_token,
    sr.date_expiration
  FROM public.signature_requests sr
  WHERE sr.contact_id = p_contact_id
  ORDER BY
    CASE
      WHEN sr.statut = 'signe' THEN 0
      WHEN sr.statut = 'envoye' AND (sr.date_expiration IS NULL OR sr.date_expiration >= CURRENT_DATE) THEN 1
      ELSE 2
    END,
    COALESCE(sr.date_signature, sr.date_envoi, sr.created_at) DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_related_signature_docs(uuid) TO anon, authenticated;