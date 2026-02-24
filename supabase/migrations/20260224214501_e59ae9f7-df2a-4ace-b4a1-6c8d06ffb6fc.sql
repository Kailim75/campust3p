
-- Remplacer la policy trop permissive par une policy restreinte aux admins/staff pour les mutations
DROP POLICY "Service role can manage scoring" ON public.ia_prospect_scoring;

CREATE POLICY "Admins and staff can insert scoring"
  ON public.ia_prospect_scoring FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'staff')
    OR public.is_super_admin()
    OR auth.uid() IS NULL -- service role (edge functions)
  );

CREATE POLICY "Admins and staff can update scoring"
  ON public.ia_prospect_scoring FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'staff')
    OR public.is_super_admin()
    OR auth.uid() IS NULL
  );

CREATE POLICY "Admins and staff can delete scoring"
  ON public.ia_prospect_scoring FOR DELETE
  USING (
    public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'staff')
    OR public.is_super_admin()
    OR auth.uid() IS NULL
  );
