DROP FUNCTION IF EXISTS public.get_related_signature_docs(uuid);

CREATE OR REPLACE FUNCTION public.get_related_signature_docs(p_contact_id uuid)
RETURNS TABLE(
  id uuid,
  titre text,
  type_document text,
  statut text,
  document_url text,
  date_envoi timestamp with time zone,
  date_signature timestamp with time zone,
  access_token text
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
    sr.access_token
  FROM public.signature_requests sr
  WHERE sr.contact_id = p_contact_id
  ORDER BY
    CASE WHEN sr.statut = 'envoye' THEN 0 ELSE 1 END,
    sr.created_at DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_related_signature_docs(uuid) TO anon, authenticated;