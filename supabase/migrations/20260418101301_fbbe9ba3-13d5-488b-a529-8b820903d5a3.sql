
-- 1. leads : INSERT réservé aux authentifiés
DROP POLICY IF EXISTS "Anyone can insert leads" ON public.leads;

CREATE POLICY "Authenticated users can insert leads"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- 2. parametres_financiers : SELECT restreint aux authentifiés
DROP POLICY IF EXISTS "Others can read params" ON public.parametres_financiers;

CREATE POLICY "Authenticated users can read params"
ON public.parametres_financiers
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 3. template_audit_log : INSERT restreint aux authentifiés
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.template_audit_log;

CREATE POLICY "Authenticated users can insert audit logs"
ON public.template_audit_log
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
