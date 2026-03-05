
-- Add relance engine fields to prospects
ALTER TABLE public.prospects 
  ADD COLUMN IF NOT EXISTS next_action_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_action_type text DEFAULT 'call',
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS last_contacted_at timestamptz;

-- Add constraint on next_action_type
ALTER TABLE public.prospects 
  ADD CONSTRAINT chk_next_action_type CHECK (next_action_type IN ('call', 'whatsapp', 'email'));

-- Index for relance queries
CREATE INDEX IF NOT EXISTS idx_prospects_next_action ON public.prospects (next_action_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_prospects_assigned ON public.prospects (assigned_to) WHERE is_active = true;

-- Backfill: set next_action_at from date_prochaine_relance for existing records
UPDATE public.prospects 
SET next_action_at = date_prochaine_relance::timestamptz
WHERE date_prochaine_relance IS NOT NULL AND next_action_at IS NULL;
