-- 1. Add requalification columns to contacts
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS is_historical_import boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS import_source text,
  ADD COLUMN IF NOT EXISTS imported_at timestamptz,
  ADD COLUMN IF NOT EXISTS requalification_category text,
  ADD COLUMN IF NOT EXISTS requalification_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS requalification_reviewed_by uuid;

-- CHECK constraint on requalification_category values
ALTER TABLE public.contacts
  DROP CONSTRAINT IF EXISTS contacts_requalification_category_check;
ALTER TABLE public.contacts
  ADD CONSTRAINT contacts_requalification_category_check
  CHECK (requalification_category IS NULL OR requalification_category IN (
    'apprenant_historique_smartof',
    'apprenant_actif_reel',
    'ancien_apprenant_a_archiver',
    'ancien_apprenant_diplome',
    'fiche_incomplete',
    'anomalie_a_verifier',
    'accompagnement_pratique_en_cours',
    'non_classe'
  ));

CREATE INDEX IF NOT EXISTS idx_contacts_is_historical_import
  ON public.contacts(is_historical_import) WHERE is_historical_import = true;
CREATE INDEX IF NOT EXISTS idx_contacts_requalification_category
  ON public.contacts(requalification_category) WHERE requalification_category IS NOT NULL;

-- 2. Audit log table
CREATE TABLE IF NOT EXISTS public.contact_requalification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL,
  centre_id uuid NOT NULL,
  previous_category text,
  new_category text,
  previous_statut_apprenant text,
  new_statut_apprenant text,
  recommended_category text,
  is_smartof_source boolean NOT NULL DEFAULT false,
  action_type text NOT NULL CHECK (action_type IN (
    'mark_smartof',
    'exclude_kpi',
    'archive',
    'mark_diplome',
    'attach_session',
    'create_inscription',
    'add_note',
    'create_task',
    'reset_category'
  )),
  comment text NOT NULL CHECK (length(trim(comment)) > 0),
  reason text NOT NULL CHECK (length(trim(reason)) > 0),
  user_id uuid,
  user_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.contact_requalification_log TO authenticated;
GRANT ALL ON public.contact_requalification_log TO service_role;

ALTER TABLE public.contact_requalification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/staff peuvent lire les logs de leur centre"
ON public.contact_requalification_log FOR SELECT TO authenticated
USING (
  centre_id IN (
    SELECT centre_id FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'staff', 'super_admin')
  )
);

CREATE POLICY "Admin/staff peuvent inserer des logs de leur centre"
ON public.contact_requalification_log FOR INSERT TO authenticated
WITH CHECK (
  centre_id IN (
    SELECT centre_id FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'staff', 'super_admin')
  )
);

CREATE INDEX IF NOT EXISTS idx_contact_requalification_log_contact
  ON public.contact_requalification_log(contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_requalification_log_centre
  ON public.contact_requalification_log(centre_id, created_at DESC);