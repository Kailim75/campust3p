
-- Politique SELECT publique pour le bucket generated-documents
CREATE POLICY "Public can read generated documents for signature"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'generated-documents');
