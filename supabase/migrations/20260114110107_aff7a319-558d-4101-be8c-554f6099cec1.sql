-- Drop existing overly permissive storage policies for contact-documents bucket
DROP POLICY IF EXISTS "Authenticated users can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON storage.objects;

-- Drop existing overly permissive storage policies for signatures bucket
DROP POLICY IF EXISTS "Allow read access to signatures" ON storage.objects;
DROP POLICY IF EXISTS "Allow insert access to signatures" ON storage.objects;
DROP POLICY IF EXISTS "Allow update access to signatures" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete access to signatures" ON storage.objects;

-- Create role-based storage policies for contact-documents bucket
CREATE POLICY "Staff can view contact documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'contact-documents' AND
  (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role))
);

CREATE POLICY "Staff can upload contact documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'contact-documents' AND
  (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role))
);

CREATE POLICY "Staff can update contact documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'contact-documents' AND
  (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role))
)
WITH CHECK (
  bucket_id = 'contact-documents' AND
  (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role))
);

CREATE POLICY "Staff can delete contact documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'contact-documents' AND
  (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role))
);

-- Create role-based storage policies for signatures bucket
CREATE POLICY "Staff can view signatures"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'signatures' AND
  (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role))
);

CREATE POLICY "Staff can upload signatures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'signatures' AND
  (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role))
);

CREATE POLICY "Staff can update signatures"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'signatures' AND
  (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role))
)
WITH CHECK (
  bucket_id = 'signatures' AND
  (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role))
);

CREATE POLICY "Staff can delete signatures"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'signatures' AND
  (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role))
);