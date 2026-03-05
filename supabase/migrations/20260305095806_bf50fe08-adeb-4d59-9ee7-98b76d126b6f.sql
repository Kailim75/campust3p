
-- Add track column to catalogue_formations (idempotent)
ALTER TABLE public.catalogue_formations
  ADD COLUMN IF NOT EXISTS track public.formation_track NOT NULL DEFAULT 'initial';

-- Backfill catalogue_formations
UPDATE public.catalogue_formations
SET track = 'continuing'
WHERE lower(type_formation) ~ '(continue|passerelle|recyclage|mobilit)';

-- Backfill sessions.track from catalogue_formations
UPDATE public.sessions s
SET track = 'continuing'
FROM public.catalogue_formations cf
WHERE s.formation_type::text = cf.type_formation
  AND cf.track = 'continuing'::public.formation_track;

-- Trigger: snapshot track on inscription insert
CREATE OR REPLACE FUNCTION public.snapshot_inscription_track()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  SELECT s.track INTO NEW.track
  FROM public.sessions s
  WHERE s.id = NEW.session_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_snapshot_inscription_track ON public.session_inscriptions;
CREATE TRIGGER trg_snapshot_inscription_track
  BEFORE INSERT ON public.session_inscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.snapshot_inscription_track();

-- Trigger: re-snapshot track on session_id change
CREATE OR REPLACE FUNCTION public.update_inscription_track_on_session_change()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.session_id IS DISTINCT FROM OLD.session_id THEN
    SELECT s.track INTO NEW.track
    FROM public.sessions s
    WHERE s.id = NEW.session_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_inscription_track ON public.session_inscriptions;
CREATE TRIGGER trg_update_inscription_track
  BEFORE UPDATE ON public.session_inscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_inscription_track_on_session_change();

-- Re-backfill session_inscriptions
UPDATE public.session_inscriptions si
SET track = s.track
FROM public.sessions s
WHERE si.session_id = s.id
  AND si.track IS DISTINCT FROM s.track;
