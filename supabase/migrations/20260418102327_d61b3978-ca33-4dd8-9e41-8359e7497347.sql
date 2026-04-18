-- Durcissement RLS parametres_financiers (Option A : table globale)
-- Lecture : tout utilisateur authentifié rattaché à au moins un centre
-- Écriture : admin ou super_admin uniquement

-- 1. Drop des policies existantes
DROP POLICY IF EXISTS "Authenticated users can read params" ON public.parametres_financiers;
DROP POLICY IF EXISTS "Admin can manage params" ON public.parametres_financiers;

-- 2. SELECT : user authentifié appartenant à au moins un centre
CREATE POLICY "Centre members can read params"
ON public.parametres_financiers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_centres
    WHERE user_id = auth.uid()
  )
);

-- 3. INSERT : admin ou super_admin
CREATE POLICY "Admins can insert params"
ON public.parametres_financiers
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role) OR public.is_super_admin()
);

-- 4. UPDATE : admin ou super_admin
CREATE POLICY "Admins can update params"
ON public.parametres_financiers
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR public.is_super_admin()
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role) OR public.is_super_admin()
);

-- 5. DELETE : admin ou super_admin
CREATE POLICY "Admins can delete params"
ON public.parametres_financiers
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR public.is_super_admin()
);