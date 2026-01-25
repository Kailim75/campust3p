-- Corriger la vue centres_stats avec security_invoker
DROP VIEW IF EXISTS public.centres_stats;

CREATE VIEW public.centres_stats 
WITH (security_invoker=on) AS
SELECT 
  c.id,
  c.nom,
  c.plan_type,
  c.actif,
  c.created_at,
  (SELECT COUNT(*) FROM public.user_centres uc WHERE uc.centre_id = c.id) as nb_users,
  (SELECT COUNT(*) FROM public.contacts co WHERE co.centre_id = c.id) as nb_contacts,
  (SELECT COUNT(*) FROM public.sessions s WHERE s.centre_id = c.id) as nb_sessions,
  (SELECT COALESCE(SUM(montant_total), 0) FROM public.factures f WHERE f.centre_id = c.id AND f.statut = 'payee') as ca_total
FROM public.centres c;