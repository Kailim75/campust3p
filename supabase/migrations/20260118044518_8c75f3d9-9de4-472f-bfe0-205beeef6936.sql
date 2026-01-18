-- Fix remaining permissive RLS policies

-- grilles_evaluation: Fix permissive policies
DROP POLICY IF EXISTS "Staff can view all grilles" ON grilles_evaluation;
DROP POLICY IF EXISTS "Staff can insert grilles" ON grilles_evaluation;
DROP POLICY IF EXISTS "Staff can update grilles" ON grilles_evaluation;
DROP POLICY IF EXISTS "Staff can delete grilles" ON grilles_evaluation;

CREATE POLICY "Staff can select grilles_evaluation" ON grilles_evaluation
FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can insert grilles_evaluation" ON grilles_evaluation
FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can update grilles_evaluation" ON grilles_evaluation
FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can delete grilles_evaluation" ON grilles_evaluation
FOR DELETE USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

-- objectifs: Fix permissive policies
DROP POLICY IF EXISTS "Authenticated users can view objectives" ON objectifs;
DROP POLICY IF EXISTS "Authenticated users can insert objectives" ON objectifs;
DROP POLICY IF EXISTS "Authenticated users can update objectives" ON objectifs;
DROP POLICY IF EXISTS "Authenticated users can delete objectives" ON objectifs;

CREATE POLICY "Staff can select objectifs" ON objectifs
FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can insert objectifs" ON objectifs
FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can update objectifs" ON objectifs
FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Admin can delete objectifs" ON objectifs
FOR DELETE USING (public.has_role(auth.uid(), 'admin'::app_role));

-- qualiopi_actions: Fix permissive policies
DROP POLICY IF EXISTS "Gestion actions authentifiés" ON qualiopi_actions;
DROP POLICY IF EXISTS "Lecture actions authentifiés" ON qualiopi_actions;

CREATE POLICY "Staff can manage qualiopi_actions" ON qualiopi_actions
FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

-- qualiopi_audits: Fix permissive policies  
DROP POLICY IF EXISTS "Lecture audits authentifiés" ON qualiopi_audits;

CREATE POLICY "Staff can select qualiopi_audits" ON qualiopi_audits
FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

-- qualiopi_indicateurs: Fix permissive policies
DROP POLICY IF EXISTS "Lecture indicateurs authentifiés" ON qualiopi_indicateurs;

CREATE POLICY "Staff can select qualiopi_indicateurs" ON qualiopi_indicateurs
FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

-- qualiopi_preuves: Fix permissive policies
DROP POLICY IF EXISTS "Gestion preuves authentifiés" ON qualiopi_preuves;
DROP POLICY IF EXISTS "Lecture preuves authentifiés" ON qualiopi_preuves;

CREATE POLICY "Staff can manage qualiopi_preuves" ON qualiopi_preuves
FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

-- workflows: Fix permissive policies
DROP POLICY IF EXISTS "Authenticated users can manage workflows" ON workflows;

CREATE POLICY "Staff can manage workflows" ON workflows
FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

-- workflow_executions: Fix permissive policies
DROP POLICY IF EXISTS "Authenticated users can view executions" ON workflow_executions;

CREATE POLICY "Staff can manage workflow_executions" ON workflow_executions
FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));