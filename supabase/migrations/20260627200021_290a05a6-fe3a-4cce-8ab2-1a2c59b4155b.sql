CREATE OR REPLACE FUNCTION public.lock_signed_signature_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF OLD.date_signature IS NOT NULL THEN
    IF NEW.date_signature IS DISTINCT FROM OLD.date_signature THEN
      RAISE EXCEPTION 'Signature déjà posée : date_signature est immuable (ligne %).', OLD.id
        USING ERRCODE = 'check_violation';
    END IF;

    IF NEW.signature_data       IS DISTINCT FROM OLD.signature_data
    OR NEW.signature_url        IS DISTINCT FROM OLD.signature_url
    OR NEW.ip_signature         IS DISTINCT FROM OLD.ip_signature
    OR NEW.user_agent_signature IS DISTINCT FROM OLD.user_agent_signature
    OR NEW.statut               IS DISTINCT FROM OLD.statut
    OR NEW.document_url         IS DISTINCT FROM OLD.document_url
    OR NEW.document_storage_path   IS DISTINCT FROM OLD.document_storage_path
    OR NEW.document_storage_bucket IS DISTINCT FROM OLD.document_storage_bucket
    OR NEW.type_document        IS DISTINCT FROM OLD.type_document
    OR NEW.contact_id           IS DISTINCT FROM OLD.contact_id
    OR NEW.session_inscription_id IS DISTINCT FROM OLD.session_inscription_id
    THEN
      RAISE EXCEPTION 'Document signé : les champs de signature et le document sont immuables (ligne %).', OLD.id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_signed_signature_request ON public.signature_requests;
CREATE TRIGGER trg_lock_signed_signature_request
BEFORE UPDATE ON public.signature_requests
FOR EACH ROW
EXECUTE FUNCTION public.lock_signed_signature_request();