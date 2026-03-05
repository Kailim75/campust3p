
-- Renforcer RLS prospects : isolation par centre_id + rôle
-- Les super_admins passent via has_centre_access() qui inclut is_super_admin()

DROP POLICY IF EXISTS "Admin full access prospects" ON public.prospects;
DROP POLICY IF EXISTS "Staff full access prospects" ON public.prospects;

-- Admin : rôle admin + accès au centre du prospect
CREATE POLICY "Admin access prospects by centre"
ON public.prospects FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND public.has_centre_access(centre_id)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND public.has_centre_access(centre_id)
);

-- Staff : rôle staff + accès au centre du prospect
CREATE POLICY "Staff access prospects by centre"
ON public.prospects FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'staff'::app_role)
  AND public.has_centre_access(centre_id)
)
WITH CHECK (
  public.has_role(auth.uid(), 'staff'::app_role)
  AND public.has_centre_access(centre_id)
);
