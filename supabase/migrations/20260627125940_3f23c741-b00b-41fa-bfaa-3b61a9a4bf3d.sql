BEGIN;

DROP POLICY IF EXISTS admin_staff_read_crm_attachments ON storage.objects;

DROP POLICY IF EXISTS "Centre read audit" ON public.template_audit_log;
CREATE POLICY "Centre read audit"
ON public.template_audit_log
FOR SELECT
TO authenticated
USING ( has_centre_access(centre_id) );

DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.template_audit_log;
CREATE POLICY "Authenticated users can insert audit logs"
ON public.template_audit_log
FOR INSERT
TO authenticated
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role)
   OR has_role(auth.uid(), 'staff'::app_role)
   OR has_role(auth.uid(), 'super_admin'::app_role))
  AND has_centre_access(centre_id)
);

COMMIT;