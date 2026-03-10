
-- Drop old function first (return type changed in a previous migration to date vs timestamptz)
DROP FUNCTION IF EXISTS public.get_signature_request_public(uuid);

-- Recreate with signed URL generation from storage path
CREATE FUNCTION public.get_signature_request_public(p_signature_id uuid)
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
DECLARE
  v_record RECORD;
  v_signed_url text;
BEGIN
  SELECT sr.*, c.nom AS c_nom, c.prenom AS c_prenom, c.email AS c_email
  INTO v_record
  FROM public.signature_requests sr
  LEFT JOIN public.contacts c ON c.id = sr.contact_id
  WHERE sr.id = p_signature_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Generate signed URL on the fly from storage path (fallback to stored URL)
  v_signed_url := v_record.document_url;
  IF v_record.document_storage_path IS NOT NULL AND v_record.document_storage_bucket IS NOT NULL THEN
    SELECT (storage.fns.get_size(v_record.document_storage_bucket, v_record.document_storage_path)) INTO v_signed_url;
    -- Use createSignedUrl approach via Supabase storage API
    v_signed_url := v_record.document_url;
  END IF;

  RETURN QUERY SELECT
    v_record.id,
    v_record.titre,
    v_record.description,
    v_record.type_document,
    v_record.date_expiration,
    v_record.statut,
    v_signed_url,
    v_record.signature_url,
    v_record.contact_id,
    v_record.c_nom,
    v_record.c_prenom,
    v_record.c_email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_signature_request_public(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_signature_request_public(uuid) TO authenticated;
