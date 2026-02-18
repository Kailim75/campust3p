
-- 1. attestation_certificates: restrict SELECT to admin/staff
DROP POLICY IF EXISTS "Authenticated users can view certificates" ON public.attestation_certificates;
CREATE POLICY "Staff can view certificates"
  ON public.attestation_certificates FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- 2. creneaux_conduite: restrict SELECT to admin/staff
DROP POLICY IF EXISTS "Authenticated users can view creneaux" ON public.creneaux_conduite;
CREATE POLICY "Staff can view creneaux"
  ON public.creneaux_conduite FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- 3. compliance_checklist_items: restrict SELECT to admin/staff
DROP POLICY IF EXISTS "Authenticated can read checklist items" ON public.compliance_checklist_items;
CREATE POLICY "Staff can read checklist items"
  ON public.compliance_checklist_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- 4. compliance_validation_history: restrict SELECT to admin/staff
DROP POLICY IF EXISTS "Authenticated can read validation history" ON public.compliance_validation_history;
CREATE POLICY "Staff can read validation history"
  ON public.compliance_validation_history FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- 5. signature_requests: drop leftover old permissive policies
DROP POLICY IF EXISTS "Authenticated users can view signature requests" ON public.signature_requests;
DROP POLICY IF EXISTS "Authenticated users can insert signature requests" ON public.signature_requests;
DROP POLICY IF EXISTS "Authenticated users can update signature requests" ON public.signature_requests;
