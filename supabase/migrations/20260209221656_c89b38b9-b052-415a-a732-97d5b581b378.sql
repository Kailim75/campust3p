-- Make generated-documents bucket public so learners can view their documents
UPDATE storage.buckets SET public = true WHERE id = 'generated-documents';

-- Add public SELECT policy for generated-documents
CREATE POLICY "Public can read generated documents"
ON storage.objects
FOR SELECT
USING (bucket_id = 'generated-documents');