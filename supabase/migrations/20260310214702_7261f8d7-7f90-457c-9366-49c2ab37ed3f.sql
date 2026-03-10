
-- Make audit_logs.centre_id nullable for service-role operations (edge functions, webhooks)
ALTER TABLE public.audit_logs ALTER COLUMN centre_id DROP NOT NULL;

-- Update audit trigger to try deriving centre_id from the record
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  old_data JSONB;
  new_data JSONB;
  changed TEXT[];
  record_uuid UUID;
  v_centre_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    old_data := to_jsonb(OLD);
    new_data := NULL;
    record_uuid := OLD.id;
    changed := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    old_data := to_jsonb(OLD);
    new_data := to_jsonb(NEW);
    record_uuid := NEW.id;
    SELECT ARRAY_AGG(key) INTO changed
    FROM jsonb_each(new_data) AS n(key, value)
    WHERE old_data->key IS DISTINCT FROM new_data->key;
  ELSE
    old_data := NULL;
    new_data := to_jsonb(NEW);
    record_uuid := NEW.id;
    changed := NULL;
  END IF;

  -- Try to derive centre_id: from the record itself, then from user context
  v_centre_id := NULL;
  IF new_data IS NOT NULL AND new_data ? 'centre_id' AND new_data->>'centre_id' IS NOT NULL THEN
    v_centre_id := (new_data->>'centre_id')::UUID;
  ELSIF old_data IS NOT NULL AND old_data ? 'centre_id' AND old_data->>'centre_id' IS NOT NULL THEN
    v_centre_id := (old_data->>'centre_id')::UUID;
  END IF;

  -- Fallback: get from user's primary centre
  IF v_centre_id IS NULL AND auth.uid() IS NOT NULL THEN
    SELECT centre_id INTO v_centre_id
    FROM public.user_centres
    WHERE user_id = auth.uid() AND is_primary = true
    LIMIT 1;
  END IF;

  INSERT INTO public.audit_logs (
    table_name, record_id, action, old_data, new_data, changed_fields,
    user_id, user_email, centre_id, created_at
  ) VALUES (
    TG_TABLE_NAME,
    record_uuid,
    TG_OP,
    old_data,
    new_data,
    changed,
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    v_centre_id,
    now()
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$function$;
