-- Fix remaining permissive RLS policies on examens_t3p and cartes_professionnelles

-- examens_t3p: Drop old policies with USING(true) and create role-based ones  
DROP POLICY IF EXISTS "Staff can view all T3P exams" ON examens_t3p;
DROP POLICY IF EXISTS "Staff can insert T3P exams" ON examens_t3p;
DROP POLICY IF EXISTS "Staff can update T3P exams" ON examens_t3p;
DROP POLICY IF EXISTS "Staff can delete T3P exams" ON examens_t3p;

CREATE POLICY "Staff can select examens_t3p" ON examens_t3p
FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can insert examens_t3p v2" ON examens_t3p
FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can update examens_t3p v2" ON examens_t3p
FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can delete examens_t3p v2" ON examens_t3p
FOR DELETE USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

-- cartes_professionnelles: Drop old policies with USING(true) and create role-based ones
DROP POLICY IF EXISTS "Staff can view all cartes" ON cartes_professionnelles;
DROP POLICY IF EXISTS "Staff can insert cartes" ON cartes_professionnelles;
DROP POLICY IF EXISTS "Staff can update cartes" ON cartes_professionnelles;
DROP POLICY IF EXISTS "Staff can delete cartes" ON cartes_professionnelles;

CREATE POLICY "Staff can select cartes_pro" ON cartes_professionnelles
FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can insert cartes_pro" ON cartes_professionnelles
FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can update cartes_pro" ON cartes_professionnelles
FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can delete cartes_pro" ON cartes_professionnelles
FOR DELETE USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));