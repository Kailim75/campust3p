ALTER TABLE public.signature_requests
  ADD COLUMN IF NOT EXISTS signing_token TEXT;

CREATE INDEX IF NOT EXISTS idx_signature_requests_signing_token
  ON public.signature_requests(signing_token)
  WHERE signing_token IS NOT NULL;