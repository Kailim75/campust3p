
DROP FUNCTION IF EXISTS public.get_signature_request_public(uuid);

CREATE FUNCTION public.get_signature_request_public(p_signature_id uuid)
 RETURNS TABLE(id uuid, titre text, description text, type_document text, date_expiration date, statut text, document_url text, signature_url text, contact_id uuid, contact_nom text, contact_prenom text, contact_email text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;
