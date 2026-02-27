
-- Fix: Replace SECURITY DEFINER view with a regular view
-- The session_inscription_counts view doesn't need SECURITY DEFINER
-- since RLS on session_inscriptions already controls access
DROP VIEW IF EXISTS public.session_inscription_counts;

CREATE VIEW public.session_inscription_counts 
WITH (security_invoker = true) AS
SELECT 
  session_id,
  count(*)::integer AS inscription_count
FROM public.session_inscriptions
GROUP BY session_id;
