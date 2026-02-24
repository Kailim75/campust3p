
-- Add entity_ids column to ia_action_logs for tracking affected records
ALTER TABLE public.ia_action_logs 
ADD COLUMN IF NOT EXISTS entity_ids text[] DEFAULT '{}';

-- Add anomaly_title for readable history
ALTER TABLE public.ia_action_logs 
ADD COLUMN IF NOT EXISTS anomaly_title text;
