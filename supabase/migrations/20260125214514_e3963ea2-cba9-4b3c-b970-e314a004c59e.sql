-- Supprimer et recréer la vue centres_stats avec les nouvelles colonnes
DROP VIEW IF EXISTS public.centres_stats CASCADE;

CREATE VIEW public.centres_stats 
WITH (security_invoker=on) AS
SELECT 
  c.id,
  c.nom,
  c.plan_type,
  c.actif,
  c.created_at,
  c.onboarding_completed_at,
  c.last_activity_at,
  c.health_score,
  (SELECT COUNT(*) FROM public.user_centres uc WHERE uc.centre_id = c.id) as nb_users,
  (SELECT COUNT(*) FROM public.contacts ct WHERE ct.centre_id = c.id AND ct.archived = false) as nb_contacts,
  (SELECT COUNT(*) FROM public.sessions s WHERE s.centre_id = c.id) as nb_sessions,
  (SELECT COALESCE(SUM(f.montant_total), 0) FROM public.factures f WHERE f.centre_id = c.id AND f.statut = 'payee') as ca_total
FROM public.centres c;