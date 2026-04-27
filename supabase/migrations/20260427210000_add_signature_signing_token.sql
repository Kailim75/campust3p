-- ============================================================================
-- Public signature flow: add a per-request signing_token to harden /signature/:id
-- ----------------------------------------------------------------------------
-- Before: anyone with the signature_request UUID could sign at the contact's
--         place (UUIDs leak via email forwards, server logs, browser history).
-- After:  signing requires UUID + signing_token. The token is generated on
--         email send and rotated each time send-signature-email is called.
--
-- Rollout safety:
--   - Column is NULLABLE -> existing rows have signing_token = NULL.
--   - public-sign-document uses a "legacy fallback" when signing_token IS NULL
--     so previously-sent links keep working until they expire naturally.
--   - New rows / re-sent links automatically get a token.
-- ============================================================================

ALTER TABLE public.signature_requests
  ADD COLUMN IF NOT EXISTS signing_token TEXT;

-- Partial index: only rows with a token are indexed (smaller, faster).
-- Used by public-sign-document for token lookup.
CREATE INDEX IF NOT EXISTS idx_signature_requests_signing_token
  ON public.signature_requests(signing_token)
  WHERE signing_token IS NOT NULL;
