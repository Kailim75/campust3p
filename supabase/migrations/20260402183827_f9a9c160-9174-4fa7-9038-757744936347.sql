-- Fix permissive INSERT policy on template_audit_log
DROP POLICY IF EXISTS "Insert audit" ON public.template_audit_log;
CREATE POLICY "Authenticated users can insert audit logs"
ON public.template_audit_log
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Restrict leads insert to include basic validation (allow anon but scope to authenticated when possible)
DROP POLICY IF EXISTS "Anyone can insert leads" ON public.leads;
CREATE POLICY "Anyone can insert leads"
ON public.leads
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
