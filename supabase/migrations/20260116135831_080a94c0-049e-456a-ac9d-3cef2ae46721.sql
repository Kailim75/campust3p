-- Create bucket for centre formation assets (logo, cachet)
INSERT INTO storage.buckets (id, name, public)
VALUES ('centre-formation-assets', 'centre-formation-assets', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for centre-formation-assets bucket
CREATE POLICY "Authenticated users can view centre formation assets"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'centre-formation-assets');

CREATE POLICY "Admin users can upload centre formation assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'centre-formation-assets' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admin users can update centre formation assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'centre-formation-assets' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admin users can delete centre formation assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'centre-formation-assets' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);