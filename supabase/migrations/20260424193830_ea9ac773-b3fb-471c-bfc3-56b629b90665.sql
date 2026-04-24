-- Add open tracking columns to relance_paiement_queue
ALTER TABLE public.relance_paiement_queue
  ADD COLUMN IF NOT EXISTS opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS open_count integer NOT NULL DEFAULT 0;

-- Add open tracking columns to document_envois
ALTER TABLE public.document_envois
  ADD COLUMN IF NOT EXISTS opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS open_count integer NOT NULL DEFAULT 0;

-- Allow 'open' as a valid event_type on email_tracking_events (no strict check exists,
-- but we add an index to speed up queries by event_type)
CREATE INDEX IF NOT EXISTS idx_email_tracking_events_type
  ON public.email_tracking_events(event_type, source_table, source_id);
