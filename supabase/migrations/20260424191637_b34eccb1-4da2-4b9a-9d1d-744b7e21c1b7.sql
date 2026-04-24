
-- ═══════════════════════════════════════════════════════════════
-- TRACKING DES ENVOIS : statut envoyé + clic + dérivé "sans réponse"
-- Couvre : relances paiement (relance_paiement_queue) + envois docs (document_envois)
-- ═══════════════════════════════════════════════════════════════

-- 1. Colonnes communes pour le tracking
ALTER TABLE public.relance_paiement_queue
  ADD COLUMN IF NOT EXISTS tracking_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS clicked_at timestamptz,
  ADD COLUMN IF NOT EXISTS click_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.document_envois
  ADD COLUMN IF NOT EXISTS tracking_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS clicked_at timestamptz,
  ADD COLUMN IF NOT EXISTS click_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz;

-- Backfill sent_at pour cohérence (date_envoi existante)
UPDATE public.document_envois SET sent_at = date_envoi WHERE sent_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_relance_queue_tracking_token ON public.relance_paiement_queue(tracking_token) WHERE tracking_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_document_envois_tracking_token ON public.document_envois(tracking_token) WHERE tracking_token IS NOT NULL;

-- 2. Table d'événements de tracking (un row par clic, pour audit complet)
CREATE TABLE IF NOT EXISTS public.email_tracking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_token text NOT NULL,
  source_table text NOT NULL CHECK (source_table IN ('relance_paiement_queue','document_envois')),
  source_id uuid NOT NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  centre_id uuid,
  event_type text NOT NULL CHECK (event_type IN ('click')),
  target_url text,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_tracking_token ON public.email_tracking_events(tracking_token);
CREATE INDEX IF NOT EXISTS idx_email_tracking_contact ON public.email_tracking_events(contact_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_source ON public.email_tracking_events(source_table, source_id);

ALTER TABLE public.email_tracking_events ENABLE ROW LEVEL SECURITY;

-- Insertion publique (depuis l'edge function de redirection — appelée sans auth)
CREATE POLICY "service_role_insert_tracking" ON public.email_tracking_events
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "admins_staff_view_tracking" ON public.email_tracking_events
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM public.user_centres uc
      JOIN public.user_roles ur ON ur.user_id = uc.user_id
      WHERE uc.user_id = auth.uid()
        AND uc.centre_id = email_tracking_events.centre_id
        AND ur.role::text IN ('admin','staff')
    )
  );

-- 3. Vue dérivée "sans réponse" : envoi le plus récent par contact/source dont l'âge dépasse un seuil
-- (consommée par la UI ; pas de logique métier complexe, juste un helper)
CREATE OR REPLACE VIEW public.v_communication_timeline AS
SELECT
  'document'::text AS kind,
  de.id,
  de.contact_id,
  de.session_id,
  de.document_type AS subject_type,
  de.document_name AS title,
  de.statut,
  de.sent_at,
  de.clicked_at,
  de.click_count,
  de.tracking_token,
  NULL::uuid AS facture_id,
  NULL::integer AS numero_relance,
  de.metadata
FROM public.document_envois de
UNION ALL
SELECT
  'relance_paiement'::text AS kind,
  rpq.id,
  rpq.contact_id,
  NULL::uuid AS session_id,
  'paiement'::text AS subject_type,
  ('Relance n°' || rpq.numero_relance) AS title,
  rpq.statut,
  rpq.sent_at,
  rpq.clicked_at,
  rpq.click_count,
  rpq.tracking_token,
  rpq.facture_id,
  rpq.numero_relance,
  rpq.metadata
FROM public.relance_paiement_queue rpq;
