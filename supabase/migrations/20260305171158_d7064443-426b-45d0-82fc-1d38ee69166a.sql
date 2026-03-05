
-- =============================================
-- Sprint 2-F: Fix all remaining FAIL items
-- =============================================

-- ========== 1. action_logs: add centre_id + RLS ==========

-- Add centre_id (nullable first for backfill, but table is empty so set NOT NULL)
ALTER TABLE public.action_logs ADD COLUMN IF NOT EXISTS centre_id uuid;

-- Auto-set trigger
CREATE OR REPLACE TRIGGER trg_action_logs_auto_centre
  BEFORE INSERT ON public.action_logs
  FOR EACH ROW EXECUTE FUNCTION public.generic_auto_set_centre_id();

-- Drop old policies
DROP POLICY IF EXISTS "Authenticated users can insert action_logs" ON public.action_logs;
DROP POLICY IF EXISTS "Admin/staff can read all action_logs" ON public.action_logs;
DROP POLICY IF EXISTS "Authenticated users can read own action_logs" ON public.action_logs;

-- New centre-aware policies
CREATE POLICY "centre_select_action_logs" ON public.action_logs
  FOR SELECT TO authenticated
  USING (
    (user_id = auth.uid())
    OR (
      public.has_centre_access(centre_id)
      AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') OR public.is_super_admin())
    )
  );

CREATE POLICY "centre_insert_action_logs" ON public.action_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
  );

-- ========== 2. audit_logs: add centre_id + RLS ==========

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS centre_id uuid;

-- Auto-set trigger
CREATE OR REPLACE TRIGGER trg_audit_logs_auto_centre
  BEFORE INSERT ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.generic_auto_set_centre_id();

-- Backfill existing rows from user_id -> user_centres
UPDATE public.audit_logs al
SET centre_id = uc.centre_id
FROM public.user_centres uc
WHERE al.user_id = uc.user_id
  AND uc.is_primary = true
  AND al.centre_id IS NULL;

-- Backfill remaining via record_id -> contacts.centre_id for known table types
UPDATE public.audit_logs al
SET centre_id = c.centre_id
FROM public.contacts c
WHERE al.table_name = 'contacts'
  AND al.record_id = c.id
  AND al.centre_id IS NULL;

UPDATE public.audit_logs al
SET centre_id = s.centre_id
FROM public.sessions s
WHERE al.table_name = 'sessions'
  AND al.record_id = s.id
  AND al.centre_id IS NULL;

UPDATE public.audit_logs al
SET centre_id = f.centre_id
FROM public.factures f
WHERE al.table_name = 'factures'
  AND al.record_id = f.id
  AND al.centre_id IS NULL;

-- For any remaining NULLs, assign the first available centre
UPDATE public.audit_logs
SET centre_id = (SELECT id FROM public.centres WHERE actif = true ORDER BY created_at LIMIT 1)
WHERE centre_id IS NULL;

-- Now set NOT NULL
ALTER TABLE public.audit_logs ALTER COLUMN centre_id SET NOT NULL;

-- Drop old policy
DROP POLICY IF EXISTS "Admins can view audit_logs" ON public.audit_logs;

-- New centre-aware policies
CREATE POLICY "centre_select_audit_logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    public.has_centre_access(centre_id)
    AND (public.has_role(auth.uid(), 'admin') OR public.is_super_admin())
  );

CREATE POLICY "centre_insert_audit_logs" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_centre_access(centre_id)
  );

-- Immutability trigger for centre_id on both tables
CREATE OR REPLACE TRIGGER trg_action_logs_immutable_centre
  BEFORE UPDATE ON public.action_logs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_centre_id_change();

CREATE OR REPLACE TRIGGER trg_audit_logs_immutable_centre
  BEFORE UPDATE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_centre_id_change();

-- ========== 3. Storage policies: make dt/gd/sig centre-aware ==========

-- Drop old non-centre-aware policies
DROP POLICY IF EXISTS "dt_select" ON storage.objects;
DROP POLICY IF EXISTS "dt_insert" ON storage.objects;
DROP POLICY IF EXISTS "dt_delete" ON storage.objects;
DROP POLICY IF EXISTS "gd_insert" ON storage.objects;
DROP POLICY IF EXISTS "gd_delete" ON storage.objects;
DROP POLICY IF EXISTS "gd_public_read" ON storage.objects;
DROP POLICY IF EXISTS "sig_insert" ON storage.objects;
DROP POLICY IF EXISTS "sig_delete" ON storage.objects;
DROP POLICY IF EXISTS "sig_update" ON storage.objects;
DROP POLICY IF EXISTS "sig_public_read" ON storage.objects;

-- document-templates: centre-aware
CREATE POLICY "dt_select" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'document-templates'
    AND public.storage_object_centre_id(name) IS NOT NULL
    AND public.has_centre_access(public.storage_object_centre_id(name))
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') OR public.is_super_admin())
  );

CREATE POLICY "dt_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'document-templates'
    AND public.storage_object_centre_id(name) IS NOT NULL
    AND public.has_centre_access(public.storage_object_centre_id(name))
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') OR public.is_super_admin())
  );

CREATE POLICY "dt_delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'document-templates'
    AND public.storage_object_centre_id(name) IS NOT NULL
    AND public.has_centre_access(public.storage_object_centre_id(name))
    AND (public.has_role(auth.uid(), 'admin') OR public.is_super_admin())
  );

-- generated-documents: centre-aware, NO public read
CREATE POLICY "gd_select" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'generated-documents'
    AND public.storage_object_centre_id(name) IS NOT NULL
    AND public.has_centre_access(public.storage_object_centre_id(name))
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') OR public.is_super_admin())
  );

CREATE POLICY "gd_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'generated-documents'
    AND public.storage_object_centre_id(name) IS NOT NULL
    AND public.has_centre_access(public.storage_object_centre_id(name))
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') OR public.is_super_admin())
  );

CREATE POLICY "gd_delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'generated-documents'
    AND public.storage_object_centre_id(name) IS NOT NULL
    AND public.has_centre_access(public.storage_object_centre_id(name))
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') OR public.is_super_admin())
  );

-- signatures: centre-aware, NO public read (RPC sign_document_public uses SECURITY DEFINER)
CREATE POLICY "sig_select" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'signatures'
    AND public.storage_object_centre_id(name) IS NOT NULL
    AND public.has_centre_access(public.storage_object_centre_id(name))
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') OR public.is_super_admin())
  );

CREATE POLICY "sig_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'signatures'
    AND public.storage_object_centre_id(name) IS NOT NULL
    AND public.has_centre_access(public.storage_object_centre_id(name))
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') OR public.is_super_admin())
  );

CREATE POLICY "sig_update" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'signatures'
    AND public.storage_object_centre_id(name) IS NOT NULL
    AND public.has_centre_access(public.storage_object_centre_id(name))
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') OR public.is_super_admin())
  )
  WITH CHECK (
    bucket_id = 'signatures'
    AND public.storage_object_centre_id(name) IS NOT NULL
    AND public.has_centre_access(public.storage_object_centre_id(name))
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') OR public.is_super_admin())
  );

CREATE POLICY "sig_delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'signatures'
    AND public.storage_object_centre_id(name) IS NOT NULL
    AND public.has_centre_access(public.storage_object_centre_id(name))
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') OR public.is_super_admin())
  );

-- ========== 4. partner_stats view: security invoker ==========

-- Recreate as security invoker so RLS on partners/contacts/factures is enforced
DROP VIEW IF EXISTS public.partner_stats;
CREATE VIEW public.partner_stats WITH (security_invoker = true) AS
SELECT 
  p.id AS partner_id,
  p.company_name,
  p.statut_partenaire,
  p.type_partenaire,
  p.mode_remuneration,
  p.taux_commission,
  p.montant_forfait,
  p.commission_payee,
  p.centre_id,
  count(DISTINCT c.id) AS nb_apprenants,
  COALESCE(sum(CASE WHEN f.statut IN ('payee', 'partiel') THEN f.montant_total ELSE 0 END), 0) AS ca_genere,
  CASE
    WHEN p.mode_remuneration = 'commission' THEN
      COALESCE(sum(CASE WHEN f.statut IN ('payee', 'partiel') THEN f.montant_total ELSE 0 END), 0) * COALESCE(p.taux_commission, 0) / 100
    WHEN p.mode_remuneration = 'forfait' THEN
      count(DISTINCT c.id)::numeric * COALESCE(p.montant_forfait, 0)
    ELSE 0
  END AS commission_calculee,
  CASE
    WHEN p.mode_remuneration = 'commission' THEN
      COALESCE(sum(CASE WHEN f.statut IN ('payee', 'partiel') THEN f.montant_total ELSE 0 END), 0) * COALESCE(p.taux_commission, 0) / 100 - COALESCE(p.commission_payee, 0)
    WHEN p.mode_remuneration = 'forfait' THEN
      count(DISTINCT c.id)::numeric * COALESCE(p.montant_forfait, 0) - COALESCE(p.commission_payee, 0)
    ELSE 0
  END AS commission_restante
FROM partners p
LEFT JOIN contacts c ON c.partenaire_referent_id = p.id AND c.archived = false
LEFT JOIN factures f ON f.contact_id = c.id
WHERE p.is_active = true
GROUP BY p.id, p.company_name, p.statut_partenaire, p.type_partenaire, p.mode_remuneration, p.taux_commission, p.montant_forfait, p.commission_payee, p.centre_id;
