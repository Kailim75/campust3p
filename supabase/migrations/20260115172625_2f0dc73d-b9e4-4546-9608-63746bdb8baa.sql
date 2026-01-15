-- Drop overly permissive policies
DROP POLICY IF EXISTS "Users can view document envois" ON public.document_envois;
DROP POLICY IF EXISTS "Users can create document envois" ON public.document_envois;
DROP POLICY IF EXISTS "Users can update document envois" ON public.document_envois;

-- Create proper RLS policies with role-based access
CREATE POLICY "Staff can select document_envois" 
ON public.document_envois 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can insert document_envois" 
ON public.document_envois 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can update document_envois" 
ON public.document_envois 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Admin can delete document_envois" 
ON public.document_envois 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));