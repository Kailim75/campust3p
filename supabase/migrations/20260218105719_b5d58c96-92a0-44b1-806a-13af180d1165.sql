
-- Fix signature_requests - drop any existing staff policies first, then recreate
DROP POLICY IF EXISTS "Staff can view signature_requests" ON public.signature_requests;
DROP POLICY IF EXISTS "Staff can insert signature_requests" ON public.signature_requests;
DROP POLICY IF EXISTS "Staff can update signature_requests" ON public.signature_requests;
DROP POLICY IF EXISTS "Admin can delete signature_requests" ON public.signature_requests;

CREATE POLICY "Staff can view signature_requests"
  ON public.signature_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff can insert signature_requests"
  ON public.signature_requests FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff can update signature_requests"
  ON public.signature_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Admin can delete signature_requests"
  ON public.signature_requests FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
