CREATE OR REPLACE VIEW public.session_inscription_counts AS
SELECT 
  session_id,
  count(*)::integer AS inscription_count
FROM public.session_inscriptions
WHERE deleted_at IS NULL
GROUP BY session_id;