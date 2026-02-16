
-- Fix 1: Restrict enquete_tokens SELECT policy to only allow public access via RPC
DROP POLICY IF EXISTS "Allow public read for token validation" ON public.enquete_tokens;
CREATE POLICY "Allow public read for token validation"
ON public.enquete_tokens
FOR SELECT
TO public
USING (false);

-- Fix 2: Restrict signature_requests to authenticated users only
DROP POLICY IF EXISTS "Allow public access to signature requests" ON public.signature_requests;
CREATE POLICY "Authenticated users can view signature requests"
ON public.signature_requests
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow public insert signature requests" ON public.signature_requests;
DROP POLICY IF EXISTS "Allow public update signature requests" ON public.signature_requests;

CREATE POLICY "Authenticated users can insert signature requests"
ON public.signature_requests
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update signature requests"
ON public.signature_requests
FOR UPDATE
TO authenticated
USING (true);
