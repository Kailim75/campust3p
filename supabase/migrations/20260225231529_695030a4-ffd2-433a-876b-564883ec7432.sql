
-- Trigger function: auto-set centre_id on prospect insert from user's primary centre
CREATE OR REPLACE FUNCTION public.auto_set_prospect_centre_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only set if centre_id is NULL and we have an authenticated user
  IF NEW.centre_id IS NULL AND auth.uid() IS NOT NULL THEN
    SELECT centre_id INTO NEW.centre_id
    FROM public.user_centres
    WHERE user_id = auth.uid() AND is_primary = true
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER trg_auto_set_prospect_centre_id
BEFORE INSERT ON public.prospects
FOR EACH ROW
EXECUTE FUNCTION public.auto_set_prospect_centre_id();
