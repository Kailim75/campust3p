
-- 1. enquete_tokens — Remove public SELECT policy
DROP POLICY IF EXISTS "Tokens are accessible via their token value" ON public.enquete_tokens;

CREATE POLICY "Authenticated users can read tokens for their centre"
ON public.enquete_tokens
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.contacts c
    WHERE c.id = enquete_tokens.contact_id
    AND public.has_centre_access(c.centre_id)
  )
);

-- 2. tokens_reservation — Remove anon blanket SELECT
DROP POLICY IF EXISTS "Anon validate token" ON public.tokens_reservation;

CREATE POLICY "Authenticated users can read reservation tokens for their centre"
ON public.tokens_reservation
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.contacts c
    WHERE c.id = tokens_reservation.apprenant_id
    AND public.has_centre_access(c.centre_id)
  )
);

-- 3. signature_requests — Add access_token and restrict public access
ALTER TABLE public.signature_requests
ADD COLUMN IF NOT EXISTS access_token TEXT DEFAULT encode(gen_random_bytes(32), 'hex');

UPDATE public.signature_requests
SET access_token = encode(gen_random_bytes(32), 'hex')
WHERE access_token IS NULL;

DROP POLICY IF EXISTS "Public can view sent signature requests by id" ON public.signature_requests;

CREATE POLICY "Public can view signature request with valid access token"
ON public.signature_requests
FOR SELECT
TO public
USING (
  statut IN ('envoye', 'signe', 'refuse')
  AND access_token = current_setting('request.headers', true)::json->>'x-signature-token'
);

-- 4. Remove enquete_tokens from realtime publication
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.enquete_tokens;
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

-- 5. Recreate centres_stats with security_invoker
DROP VIEW IF EXISTS public.centres_stats;
CREATE VIEW public.centres_stats WITH (security_invoker = true) AS
SELECT 
  c.id, c.nom, c.email, c.plan_type, c.actif, c.health_score,
  c.created_at, c.last_activity_at, c.onboarding_completed_at,
  c.max_users, c.max_contacts, c.plan_start_date, c.plan_end_date,
  c.stripe_customer_id, c.stripe_subscription_id, c.settings,
  c.siret, c.nda, c.nom_commercial, c.adresse_complete, c.telephone,
  c.logo_url, c.updated_at,
  COALESCE(cc.total, 0) AS total_contacts,
  COALESCE(uc.total, 0) AS total_users,
  COALESCE(sc.total, 0) AS total_sessions,
  COALESCE(rev.ca_total, 0) AS ca_total
FROM public.centres c
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS total FROM public.contacts WHERE centre_id = c.id AND archived = false AND deleted_at IS NULL
) cc ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS total FROM public.user_centres WHERE centre_id = c.id
) uc ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS total FROM public.sessions WHERE centre_id = c.id AND deleted_at IS NULL
) sc ON true
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(f.montant_total), 0) AS ca_total 
  FROM public.factures f
  JOIN public.contacts ct ON f.contact_id = ct.id
  WHERE ct.centre_id = c.id AND f.statut IN ('payee', 'partiel') AND f.deleted_at IS NULL
) rev ON true;
