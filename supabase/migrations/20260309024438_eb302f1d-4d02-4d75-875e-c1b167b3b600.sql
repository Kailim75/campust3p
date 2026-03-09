-- Add soft delete columns to generated_documents_v2
ALTER TABLE public.generated_documents_v2
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deleted_by UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS delete_reason TEXT DEFAULT NULL;

-- Update soft_delete_record to support generated_documents_v2
CREATE OR REPLACE FUNCTION public.soft_delete_record(p_table_name text, p_record_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_table_name NOT IN ('sessions', 'contacts', 'session_inscriptions', 'factures', 'paiements', 'contact_documents', 'prospects', 'devis', 'emargements', 'document_templates', 'catalogue_formations', 'email_templates', 'generated_documents_v2') THEN
    RAISE EXCEPTION 'Table % not supported for soft delete', p_table_name;
  END IF;

  EXECUTE format(
    'UPDATE public.%I SET deleted_at = now(), deleted_by = $1, delete_reason = $2 WHERE id = $3 AND deleted_at IS NULL',
    p_table_name
  ) USING auth.uid(), p_reason, p_record_id;

  INSERT INTO public.audit_logs (table_name, record_id, action, user_id, user_email, new_data)
  VALUES (
    p_table_name,
    p_record_id,
    'SOFT_DELETE',
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    jsonb_build_object('reason', p_reason, 'deleted_at', now())
  );

  RETURN FOUND;
END;
$function$;

-- Update restore_record to support generated_documents_v2
CREATE OR REPLACE FUNCTION public.restore_record(p_table_name text, p_record_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_table_name NOT IN ('sessions', 'contacts', 'session_inscriptions', 'factures', 'paiements', 'contact_documents', 'prospects', 'devis', 'emargements', 'document_templates', 'catalogue_formations', 'email_templates', 'generated_documents_v2') THEN
    RAISE EXCEPTION 'Table % not supported for restore', p_table_name;
  END IF;

  EXECUTE format(
    'UPDATE public.%I SET deleted_at = NULL, deleted_by = NULL, delete_reason = NULL WHERE id = $1 AND deleted_at IS NOT NULL',
    p_table_name
  ) USING p_record_id;

  INSERT INTO public.audit_logs (table_name, record_id, action, user_id, user_email)
  VALUES (
    p_table_name,
    p_record_id,
    'RESTORE',
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid())
  );

  RETURN FOUND;
END;
$function$;