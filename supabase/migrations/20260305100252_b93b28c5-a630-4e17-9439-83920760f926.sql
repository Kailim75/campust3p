
-- Trigger: when a session is created/updated with a catalogue_formation_id, inherit track from catalogue
CREATE OR REPLACE FUNCTION public.inherit_session_track_from_catalogue()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_track public.formation_track;
BEGIN
  -- Only act if catalogue_formation_id is set
  IF NEW.catalogue_formation_id IS NOT NULL THEN
    SELECT cf.track INTO v_track
    FROM public.catalogue_formations cf
    WHERE cf.id = NEW.catalogue_formation_id;
    
    IF v_track IS NOT NULL THEN
      NEW.track := v_track;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inherit_session_track ON public.sessions;
CREATE TRIGGER trg_inherit_session_track
  BEFORE INSERT OR UPDATE OF catalogue_formation_id ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.inherit_session_track_from_catalogue();

-- Backfill existing sessions that have a catalogue_formation_id
UPDATE public.sessions s
SET track = cf.track
FROM public.catalogue_formations cf
WHERE s.catalogue_formation_id = cf.id
  AND s.track IS DISTINCT FROM cf.track;

-- Re-sync session_inscriptions
UPDATE public.session_inscriptions si
SET track = s.track
FROM public.sessions s
WHERE si.session_id = s.id
  AND si.track IS DISTINCT FROM s.track;
