
-- 1) crm_email_accounts: remove staff SELECT to protect OAuth tokens
DROP POLICY IF EXISTS staff_read_accounts ON public.crm_email_accounts;

-- 2) document_instances: restrict SELECT to admin/staff/formateur within centre
DROP POLICY IF EXISTS auth_select_doc_instances ON public.document_instances;
CREATE POLICY auth_select_doc_instances ON public.document_instances
  FOR SELECT
  USING (
    is_super_admin()
    OR (
      has_centre_access(centre_id) AND (
        has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'staff'::app_role)
        OR has_role(auth.uid(), 'formateur'::app_role)
      )
    )
  );

-- 3) leads: restrict INSERT to admin/staff only
DROP POLICY IF EXISTS "Authenticated users can insert leads" ON public.leads;
CREATE POLICY "Admin/staff can insert leads" ON public.leads
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'staff'::app_role)
    OR is_super_admin()
  );
