
DROP FUNCTION IF EXISTS public.get_signature_request_public(uuid);

CREATE FUNCTION public.get_signature_request_public(p_signature_id uuid)
RETURNS TABLE(
  id uuid,
  titre text,
  description text,
  type_document text,
  date_expiration date,
  statut text,
  document_url text,
  signature_url text,
  contact_id uuid,
  contact_nom text,
  contact_prenom text,
  contact_email text,
  document_storage_path text,
  document_storage_bucket text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_record RECORD;
BEGIN
  SELECT sr.*, c.nom AS c_nom, c.prenom AS c_prenom, c.email AS c_email
  INTO v_record
  FROM public.signature_requests sr
  LEFT JOIN public.contacts c ON c.id = sr.contact_id
  WHERE sr.id = p_signature_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  RETURN QUERY SELECT
    v_record.id,
    v_record.titre,
    v_record.description,
    v_record.type_document,
    v_record.date_expiration,
    v_record.statut,
    v_record.document_url,
    v_record.signature_url,
    v_record.contact_id,
    v_record.c_nom,
    v_record.c_prenom,
    v_record.c_email,
    v_record.document_storage_path,
    v_record.document_storage_bucket;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_signature_request_public(uuid) TO anon, authenticated;
