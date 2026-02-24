
-- 1. Rendre centre_id NOT NULL sur ia_prospect_scoring
ALTER TABLE public.ia_prospect_scoring
  ALTER COLUMN centre_id SET NOT NULL;

-- 2. Rendre centre_id NOT NULL sur ia_score_history
ALTER TABLE public.ia_score_history
  ALTER COLUMN centre_id SET NOT NULL;

-- 3. Corriger la policy SELECT sur ia_score_history qui permettait centre_id IS NULL
DROP POLICY IF EXISTS "Users can view score history for their centre" ON public.ia_score_history;
CREATE POLICY "Users can view score history for their centre"
  ON public.ia_score_history
  FOR SELECT
  USING (public.has_centre_access(centre_id));

-- 4. Corriger les INSERT policies pour imposer centre_id lié au centre de l'utilisateur
DROP POLICY IF EXISTS "Admins can insert score history" ON public.ia_score_history;
CREATE POLICY "Admins can insert score history"
  ON public.ia_score_history
  FOR INSERT
  WITH CHECK (
    public.has_centre_access(centre_id)
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') OR public.is_super_admin() OR auth.uid() IS NULL)
  );

DROP POLICY IF EXISTS "Admins can update score history" ON public.ia_score_history;
CREATE POLICY "Admins can update score history"
  ON public.ia_score_history
  FOR UPDATE
  USING (
    public.has_centre_access(centre_id)
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') OR public.is_super_admin() OR auth.uid() IS NULL)
  );

-- 5. Corriger les policies ia_prospect_scoring pour imposer centre_access
DROP POLICY IF EXISTS "Admins and staff can insert scoring" ON public.ia_prospect_scoring;
CREATE POLICY "Admins and staff can insert scoring"
  ON public.ia_prospect_scoring
  FOR INSERT
  WITH CHECK (
    public.has_centre_access(centre_id)
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') OR public.is_super_admin() OR auth.uid() IS NULL)
  );

DROP POLICY IF EXISTS "Admins and staff can update scoring" ON public.ia_prospect_scoring;
CREATE POLICY "Admins and staff can update scoring"
  ON public.ia_prospect_scoring
  FOR UPDATE
  USING (
    public.has_centre_access(centre_id)
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') OR public.is_super_admin() OR auth.uid() IS NULL)
  );

DROP POLICY IF EXISTS "Admins and staff can delete scoring" ON public.ia_prospect_scoring;
CREATE POLICY "Admins and staff can delete scoring"
  ON public.ia_prospect_scoring
  FOR DELETE
  USING (
    public.has_centre_access(centre_id)
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') OR public.is_super_admin() OR auth.uid() IS NULL)
  );

-- 6. Ajouter DELETE policy manquante sur ia_score_history
CREATE POLICY "Admins can delete score history"
  ON public.ia_score_history
  FOR DELETE
  USING (
    public.has_centre_access(centre_id)
    AND (public.has_role(auth.uid(), 'admin') OR public.is_super_admin())
  );
