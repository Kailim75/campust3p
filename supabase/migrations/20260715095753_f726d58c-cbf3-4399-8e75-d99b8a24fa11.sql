ALTER TABLE public.contact_historique
ADD COLUMN IF NOT EXISTS auto_category text,
ADD COLUMN IF NOT EXISTS auto_metadata jsonb;

CREATE INDEX IF NOT EXISTS idx_contact_historique_auto_category
ON public.contact_historique(auto_category)
WHERE auto_category IS NOT NULL;