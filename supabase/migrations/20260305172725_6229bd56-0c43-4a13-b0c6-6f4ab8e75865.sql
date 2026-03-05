-- 1. Add super_admin policy for prospects
CREATE POLICY "Super admin full access prospects"
ON public.prospects FOR ALL TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- 2. Backfill NULL centre_id
UPDATE public.prospects p
SET centre_id = uc.centre_id
FROM public.user_centres uc
WHERE p.centre_id IS NULL
  AND uc.user_id = p.created_by
  AND uc.is_primary = true;

UPDATE public.prospects p
SET centre_id = (SELECT id FROM public.centres LIMIT 1)
WHERE p.centre_id IS NULL;

-- 3. Set created_by default
ALTER TABLE public.prospects ALTER COLUMN created_by SET DEFAULT auth.uid();

-- 4. Ensure auto-set centre_id trigger
DROP TRIGGER IF EXISTS trg_auto_set_centre_id ON public.prospects;
CREATE TRIGGER trg_auto_set_centre_id
  BEFORE INSERT ON public.prospects
  FOR EACH ROW
  EXECUTE FUNCTION public.generic_auto_set_centre_id();

-- 5. Make centre_id NOT NULL
ALTER TABLE public.prospects ALTER COLUMN centre_id SET NOT NULL;