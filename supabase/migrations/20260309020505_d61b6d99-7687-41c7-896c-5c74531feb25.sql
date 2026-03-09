-- Auto-fill centre_id for generated_documents_v2 from contact or session
CREATE OR REPLACE FUNCTION public.auto_set_generated_doc_centre_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If centre_id is already set, don't override
  IF NEW.centre_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Try to get centre_id from contact
  IF NEW.contact_id IS NOT NULL THEN
    SELECT centre_id INTO NEW.centre_id
    FROM public.contacts
    WHERE id = NEW.contact_id;
  END IF;
  
  -- If still null, try to get from session
  IF NEW.centre_id IS NULL AND NEW.session_id IS NOT NULL THEN
    SELECT centre_id INTO NEW.centre_id
    FROM public.sessions
    WHERE id = NEW.session_id;
  END IF;
  
  -- If still null, get from current user's primary centre
  IF NEW.centre_id IS NULL AND auth.uid() IS NOT NULL THEN
    SELECT centre_id INTO NEW.centre_id
    FROM public.user_centres
    WHERE user_id = auth.uid() AND is_primary = true
    LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trg_auto_set_generated_doc_centre_id ON public.generated_documents_v2;

-- Create the trigger
CREATE TRIGGER trg_auto_set_generated_doc_centre_id
  BEFORE INSERT ON public.generated_documents_v2
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_set_generated_doc_centre_id();