
-- Add has_inbound flag to threads
ALTER TABLE public.crm_email_threads
ADD COLUMN IF NOT EXISTS has_inbound boolean NOT NULL DEFAULT true;

-- Backfill: set has_inbound = false for threads with no inbound messages
UPDATE public.crm_email_threads t
SET has_inbound = false
WHERE NOT EXISTS (
  SELECT 1 FROM public.crm_email_messages m
  WHERE m.thread_id = t.id AND m.direction = 'inbound'
);

-- Index for fast filtering
CREATE INDEX IF NOT EXISTS idx_crm_email_threads_has_inbound
ON public.crm_email_threads (has_inbound)
WHERE has_inbound = true;
