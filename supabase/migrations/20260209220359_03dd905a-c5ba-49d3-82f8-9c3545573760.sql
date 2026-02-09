-- Allow public (unauthenticated) users to read signature requests that have been sent
CREATE POLICY "Public can view sent signature requests by id"
ON public.signature_requests
FOR SELECT
USING (statut IN ('envoye', 'signe', 'refuse'));

-- Allow public users to update signature requests (for signing/refusing)
CREATE POLICY "Public can sign or refuse sent signature requests"
ON public.signature_requests
FOR UPDATE
USING (statut = 'envoye')
WITH CHECK (statut IN ('signe', 'refuse'));

-- Allow public upload to signatures bucket for signing
INSERT INTO storage.objects (bucket_id, name, owner, metadata) SELECT 'signatures', '', null, null WHERE false;
-- Actually we need storage policies
CREATE POLICY "Public can upload signatures"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'signatures');

CREATE POLICY "Public can read signatures"
ON storage.objects
FOR SELECT
USING (bucket_id = 'signatures');