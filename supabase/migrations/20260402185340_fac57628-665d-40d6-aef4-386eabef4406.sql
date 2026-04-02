
DROP VIEW IF EXISTS public.centres_stats;
CREATE VIEW public.centres_stats WITH (security_invoker = true) AS
SELECT 
  c.id, c.nom, c.email, c.plan_type, c.actif, c.health_score,
  c.created_at, c.last_activity_at, c.onboarding_completed_at,
  c.max_users, c.max_contacts, c.plan_start_date, c.plan_end_date,
  c.stripe_customer_id, c.stripe_subscription_id, c.settings,
  c.siret, c.nda, c.nom_commercial, c.adresse_complete, c.telephone,
  c.logo_url, c.updated_at,
  COALESCE(cc.total, 0) AS nb_contacts,
  COALESCE(uc.total, 0) AS nb_users,
  COALESCE(sc.total, 0) AS nb_sessions,
  COALESCE(rev.ca_total, 0) AS ca_total
FROM public.centres c
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int AS total FROM public.contacts WHERE centre_id = c.id AND archived = false AND deleted_at IS NULL
) cc ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int AS total FROM public.user_centres WHERE centre_id = c.id
) uc ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int AS total FROM public.sessions WHERE centre_id = c.id AND deleted_at IS NULL
) sc ON true
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(f.montant_total), 0)::numeric AS ca_total 
  FROM public.factures f
  JOIN public.contacts ct ON f.contact_id = ct.id
  WHERE ct.centre_id = c.id AND f.statut IN ('payee', 'partiel') AND f.deleted_at IS NULL
) rev ON true;
