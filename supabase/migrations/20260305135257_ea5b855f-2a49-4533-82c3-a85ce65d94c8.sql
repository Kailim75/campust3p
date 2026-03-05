
-- =====================================================
-- SPRINT 1 - MIGRATION 1/2: Auto-set triggers + Backfill + RLS hardening
-- =====================================================

-- =====================================================
-- A) GENERIC AUTO-SET CENTRE_ID TRIGGER FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.generic_auto_set_centre_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.centre_id IS NULL AND auth.uid() IS NOT NULL THEN
    SELECT centre_id INTO NEW.centre_id
    FROM public.user_centres
    WHERE user_id = auth.uid() AND is_primary = true
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

-- =====================================================
-- B) ADD TRIGGERS ON ALL CRITICAL TABLES WITH centre_id
-- =====================================================

-- contacts
DROP TRIGGER IF EXISTS trg_auto_set_centre_id_contacts ON public.contacts;
CREATE TRIGGER trg_auto_set_centre_id_contacts
BEFORE INSERT ON public.contacts
FOR EACH ROW EXECUTE FUNCTION public.generic_auto_set_centre_id();

-- sessions
DROP TRIGGER IF EXISTS trg_auto_set_centre_id_sessions ON public.sessions;
CREATE TRIGGER trg_auto_set_centre_id_sessions
BEFORE INSERT ON public.sessions
FOR EACH ROW EXECUTE FUNCTION public.generic_auto_set_centre_id();

-- factures
DROP TRIGGER IF EXISTS trg_auto_set_centre_id_factures ON public.factures;
CREATE TRIGGER trg_auto_set_centre_id_factures
BEFORE INSERT ON public.factures
FOR EACH ROW EXECUTE FUNCTION public.generic_auto_set_centre_id();

-- devis
DROP TRIGGER IF EXISTS trg_auto_set_centre_id_devis ON public.devis;
CREATE TRIGGER trg_auto_set_centre_id_devis
BEFORE INSERT ON public.devis
FOR EACH ROW EXECUTE FUNCTION public.generic_auto_set_centre_id();

-- catalogue_formations
DROP TRIGGER IF EXISTS trg_auto_set_centre_id_catalogue ON public.catalogue_formations;
CREATE TRIGGER trg_auto_set_centre_id_catalogue
BEFORE INSERT ON public.catalogue_formations
FOR EACH ROW EXECUTE FUNCTION public.generic_auto_set_centre_id();

-- creneaux_conduite
DROP TRIGGER IF EXISTS trg_auto_set_centre_id_creneaux ON public.creneaux_conduite;
CREATE TRIGGER trg_auto_set_centre_id_creneaux
BEFORE INSERT ON public.creneaux_conduite
FOR EACH ROW EXECUTE FUNCTION public.generic_auto_set_centre_id();

-- formateurs
DROP TRIGGER IF EXISTS trg_auto_set_centre_id_formateurs ON public.formateurs;
CREATE TRIGGER trg_auto_set_centre_id_formateurs
BEFORE INSERT ON public.formateurs
FOR EACH ROW EXECUTE FUNCTION public.generic_auto_set_centre_id();

-- partners
DROP TRIGGER IF EXISTS trg_auto_set_centre_id_partners ON public.partners;
CREATE TRIGGER trg_auto_set_centre_id_partners
BEFORE INSERT ON public.partners
FOR EACH ROW EXECUTE FUNCTION public.generic_auto_set_centre_id();

-- vehicules
DROP TRIGGER IF EXISTS trg_auto_set_centre_id_vehicules ON public.vehicules;
CREATE TRIGGER trg_auto_set_centre_id_vehicules
BEFORE INSERT ON public.vehicules
FOR EACH ROW EXECUTE FUNCTION public.generic_auto_set_centre_id();

-- prospects (replace existing specific function trigger)
DROP TRIGGER IF EXISTS trg_auto_set_prospect_centre_id ON public.prospects;
CREATE TRIGGER trg_auto_set_centre_id_prospects
BEFORE INSERT ON public.prospects
FOR EACH ROW EXECUTE FUNCTION public.generic_auto_set_centre_id();

-- objectifs
DROP TRIGGER IF EXISTS trg_auto_set_centre_id_objectifs ON public.objectifs;
CREATE TRIGGER trg_auto_set_centre_id_objectifs
BEFORE INSERT ON public.objectifs
FOR EACH ROW EXECUTE FUNCTION public.generic_auto_set_centre_id();

-- workflows
DROP TRIGGER IF EXISTS trg_auto_set_centre_id_workflows ON public.workflows;
CREATE TRIGGER trg_auto_set_centre_id_workflows
BEFORE INSERT ON public.workflows
FOR EACH ROW EXECUTE FUNCTION public.generic_auto_set_centre_id();

-- email_templates
DROP TRIGGER IF EXISTS trg_auto_set_centre_id_email_templates ON public.email_templates;
CREATE TRIGGER trg_auto_set_centre_id_email_templates
BEFORE INSERT ON public.email_templates
FOR EACH ROW EXECUTE FUNCTION public.generic_auto_set_centre_id();

-- reclamations
DROP TRIGGER IF EXISTS trg_auto_set_centre_id_reclamations ON public.reclamations;
CREATE TRIGGER trg_auto_set_centre_id_reclamations
BEFORE INSERT ON public.reclamations
FOR EACH ROW EXECUTE FUNCTION public.generic_auto_set_centre_id();

-- satisfaction_reponses
DROP TRIGGER IF EXISTS trg_auto_set_centre_id_satisfaction ON public.satisfaction_reponses;
CREATE TRIGGER trg_auto_set_centre_id_satisfaction
BEFORE INSERT ON public.satisfaction_reponses
FOR EACH ROW EXECUTE FUNCTION public.generic_auto_set_centre_id();

-- lms_formations
DROP TRIGGER IF EXISTS trg_auto_set_centre_id_lms ON public.lms_formations;
CREATE TRIGGER trg_auto_set_centre_id_lms
BEFORE INSERT ON public.lms_formations
FOR EACH ROW EXECUTE FUNCTION public.generic_auto_set_centre_id();

-- document_template_files
DROP TRIGGER IF EXISTS trg_auto_set_centre_id_doc_templates ON public.document_template_files;
CREATE TRIGGER trg_auto_set_centre_id_doc_templates
BEFORE INSERT ON public.document_template_files
FOR EACH ROW EXECUTE FUNCTION public.generic_auto_set_centre_id();

-- =====================================================
-- C) BACKFILL: set centre_id on orphan rows
-- =====================================================
UPDATE public.contacts SET centre_id = '97e69258-f616-4424-9aca-78080cb6437e' WHERE centre_id IS NULL;
UPDATE public.sessions SET centre_id = '97e69258-f616-4424-9aca-78080cb6437e' WHERE centre_id IS NULL;
UPDATE public.factures SET centre_id = '97e69258-f616-4424-9aca-78080cb6437e' WHERE centre_id IS NULL;
UPDATE public.devis SET centre_id = '97e69258-f616-4424-9aca-78080cb6437e' WHERE centre_id IS NULL;
UPDATE public.catalogue_formations SET centre_id = '97e69258-f616-4424-9aca-78080cb6437e' WHERE centre_id IS NULL;
UPDATE public.creneaux_conduite SET centre_id = '97e69258-f616-4424-9aca-78080cb6437e' WHERE centre_id IS NULL;
UPDATE public.formateurs SET centre_id = '97e69258-f616-4424-9aca-78080cb6437e' WHERE centre_id IS NULL;
UPDATE public.partners SET centre_id = '97e69258-f616-4424-9aca-78080cb6437e' WHERE centre_id IS NULL;
UPDATE public.vehicules SET centre_id = '97e69258-f616-4424-9aca-78080cb6437e' WHERE centre_id IS NULL;
UPDATE public.prospects SET centre_id = '97e69258-f616-4424-9aca-78080cb6437e' WHERE centre_id IS NULL;
UPDATE public.objectifs SET centre_id = '97e69258-f616-4424-9aca-78080cb6437e' WHERE centre_id IS NULL;
UPDATE public.workflows SET centre_id = '97e69258-f616-4424-9aca-78080cb6437e' WHERE centre_id IS NULL;
UPDATE public.email_templates SET centre_id = '97e69258-f616-4424-9aca-78080cb6437e' WHERE centre_id IS NULL;
UPDATE public.reclamations SET centre_id = '97e69258-f616-4424-9aca-78080cb6437e' WHERE centre_id IS NULL;
UPDATE public.satisfaction_reponses SET centre_id = '97e69258-f616-4424-9aca-78080cb6437e' WHERE centre_id IS NULL;
UPDATE public.lms_formations SET centre_id = '97e69258-f616-4424-9aca-78080cb6437e' WHERE centre_id IS NULL;
UPDATE public.document_template_files SET centre_id = '97e69258-f616-4424-9aca-78080cb6437e' WHERE centre_id IS NULL;

-- =====================================================
-- D) RLS HARDENING: contacts
-- =====================================================
DROP POLICY IF EXISTS "Staff can select contacts" ON public.contacts;
DROP POLICY IF EXISTS "Staff can insert contacts" ON public.contacts;
DROP POLICY IF EXISTS "Staff can update contacts" ON public.contacts;
DROP POLICY IF EXISTS "Staff can delete contacts" ON public.contacts;

CREATE POLICY "centre_select_contacts" ON public.contacts FOR SELECT TO authenticated
USING (
  public.has_centre_access(centre_id)
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
);
CREATE POLICY "centre_insert_contacts" ON public.contacts FOR INSERT TO authenticated
WITH CHECK (
  centre_id IS NOT NULL
  AND public.has_centre_access(centre_id)
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
);
CREATE POLICY "centre_update_contacts" ON public.contacts FOR UPDATE TO authenticated
USING (
  public.has_centre_access(centre_id)
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
)
WITH CHECK (
  centre_id IS NOT NULL
  AND public.has_centre_access(centre_id)
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
);
CREATE POLICY "centre_delete_contacts" ON public.contacts FOR DELETE TO authenticated
USING (
  public.has_centre_access(centre_id)
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
);

-- =====================================================
-- D) RLS HARDENING: sessions
-- =====================================================
DROP POLICY IF EXISTS "Staff can select sessions" ON public.sessions;
DROP POLICY IF EXISTS "Staff can insert sessions" ON public.sessions;
DROP POLICY IF EXISTS "Staff can update sessions" ON public.sessions;
DROP POLICY IF EXISTS "Staff can delete sessions" ON public.sessions;

CREATE POLICY "centre_select_sessions" ON public.sessions FOR SELECT TO authenticated
USING (
  public.has_centre_access(centre_id)
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role) OR public.has_role(auth.uid(), 'formateur'::app_role))
);
CREATE POLICY "centre_insert_sessions" ON public.sessions FOR INSERT TO authenticated
WITH CHECK (
  centre_id IS NOT NULL
  AND public.has_centre_access(centre_id)
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
);
CREATE POLICY "centre_update_sessions" ON public.sessions FOR UPDATE TO authenticated
USING (
  public.has_centre_access(centre_id)
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
)
WITH CHECK (
  centre_id IS NOT NULL
  AND public.has_centre_access(centre_id)
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
);
CREATE POLICY "centre_delete_sessions" ON public.sessions FOR DELETE TO authenticated
USING (
  public.has_centre_access(centre_id)
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
);

-- =====================================================
-- D) RLS HARDENING: factures
-- =====================================================
DROP POLICY IF EXISTS "Staff can select factures" ON public.factures;
DROP POLICY IF EXISTS "Staff can insert factures" ON public.factures;
DROP POLICY IF EXISTS "Staff can update factures" ON public.factures;
DROP POLICY IF EXISTS "Staff can delete factures" ON public.factures;

CREATE POLICY "centre_select_factures" ON public.factures FOR SELECT TO authenticated
USING (
  public.has_centre_access(centre_id)
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
);
CREATE POLICY "centre_insert_factures" ON public.factures FOR INSERT TO authenticated
WITH CHECK (
  centre_id IS NOT NULL
  AND public.has_centre_access(centre_id)
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
);
CREATE POLICY "centre_update_factures" ON public.factures FOR UPDATE TO authenticated
USING (
  public.has_centre_access(centre_id)
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
)
WITH CHECK (
  centre_id IS NOT NULL
  AND public.has_centre_access(centre_id)
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
);
CREATE POLICY "centre_delete_factures" ON public.factures FOR DELETE TO authenticated
USING (
  public.has_centre_access(centre_id)
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
);

-- =====================================================
-- D) RLS HARDENING: devis
-- =====================================================
DROP POLICY IF EXISTS "Staff can select devis" ON public.devis;
DROP POLICY IF EXISTS "Staff can insert devis" ON public.devis;
DROP POLICY IF EXISTS "Staff can update devis" ON public.devis;
DROP POLICY IF EXISTS "Staff can delete devis" ON public.devis;

CREATE POLICY "centre_select_devis" ON public.devis FOR SELECT TO authenticated
USING (
  public.has_centre_access(centre_id)
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
);
CREATE POLICY "centre_insert_devis" ON public.devis FOR INSERT TO authenticated
WITH CHECK (
  centre_id IS NOT NULL
  AND public.has_centre_access(centre_id)
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
);
CREATE POLICY "centre_update_devis" ON public.devis FOR UPDATE TO authenticated
USING (
  public.has_centre_access(centre_id)
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
)
WITH CHECK (
  centre_id IS NOT NULL
  AND public.has_centre_access(centre_id)
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
);
CREATE POLICY "centre_delete_devis" ON public.devis FOR DELETE TO authenticated
USING (
  public.has_centre_access(centre_id)
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
);

-- =====================================================
-- D) RLS HARDENING: catalogue_formations
-- =====================================================
DROP POLICY IF EXISTS "Staff can select catalogue_formations" ON public.catalogue_formations;
DROP POLICY IF EXISTS "Staff can insert catalogue_formations" ON public.catalogue_formations;
DROP POLICY IF EXISTS "Staff can update catalogue_formations" ON public.catalogue_formations;
DROP POLICY IF EXISTS "Staff can delete catalogue_formations" ON public.catalogue_formations;

CREATE POLICY "centre_select_catalogue" ON public.catalogue_formations FOR SELECT TO authenticated
USING (
  public.has_centre_access(centre_id)
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role) OR public.has_role(auth.uid(), 'formateur'::app_role))
);
CREATE POLICY "centre_insert_catalogue" ON public.catalogue_formations FOR INSERT TO authenticated
WITH CHECK (
  centre_id IS NOT NULL
  AND public.has_centre_access(centre_id)
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
);
CREATE POLICY "centre_update_catalogue" ON public.catalogue_formations FOR UPDATE TO authenticated
USING (
  public.has_centre_access(centre_id)
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
)
WITH CHECK (
  centre_id IS NOT NULL
  AND public.has_centre_access(centre_id)
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
);
CREATE POLICY "centre_delete_catalogue" ON public.catalogue_formations FOR DELETE TO authenticated
USING (
  public.has_centre_access(centre_id)
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
);

-- =====================================================
-- D) RLS HARDENING: creneaux_conduite
-- =====================================================
DROP POLICY IF EXISTS "Admin and staff can manage all creneaux" ON public.creneaux_conduite;
DROP POLICY IF EXISTS "Staff can view creneaux" ON public.creneaux_conduite;
-- Keep anon policy for public booking

CREATE POLICY "centre_select_creneaux" ON public.creneaux_conduite FOR SELECT TO authenticated
USING (
  public.has_centre_access(centre_id)
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role) OR public.has_role(auth.uid(), 'formateur'::app_role))
);
CREATE POLICY "centre_insert_creneaux" ON public.creneaux_conduite FOR INSERT TO authenticated
WITH CHECK (
  centre_id IS NOT NULL
  AND public.has_centre_access(centre_id)
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
);
CREATE POLICY "centre_update_creneaux" ON public.creneaux_conduite FOR UPDATE TO authenticated
USING (
  public.has_centre_access(centre_id)
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
)
WITH CHECK (
  centre_id IS NOT NULL
  AND public.has_centre_access(centre_id)
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
);
CREATE POLICY "centre_delete_creneaux" ON public.creneaux_conduite FOR DELETE TO authenticated
USING (
  public.has_centre_access(centre_id)
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
);

-- =====================================================
-- D) RLS HARDENING: formateurs
-- =====================================================
DROP POLICY IF EXISTS "Staff can select formateurs" ON public.formateurs;
DROP POLICY IF EXISTS "Staff can insert formateurs" ON public.formateurs;
DROP POLICY IF EXISTS "Staff can update formateurs" ON public.formateurs;
DROP POLICY IF EXISTS "Staff can delete formateurs" ON public.formateurs;
DROP POLICY IF EXISTS "Admin full access formateurs" ON public.formateurs;
DROP POLICY IF EXISTS "Staff full access formateurs" ON public.formateurs;

CREATE POLICY "centre_select_formateurs" ON public.formateurs FOR SELECT TO authenticated
USING (
  public.has_centre_access(centre_id)
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role) OR public.has_role(auth.uid(), 'formateur'::app_role))
);
CREATE POLICY "centre_insert_formateurs" ON public.formateurs FOR INSERT TO authenticated
WITH CHECK (
  centre_id IS NOT NULL
  AND public.has_centre_access(centre_id)
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
);
CREATE POLICY "centre_update_formateurs" ON public.formateurs FOR UPDATE TO authenticated
USING (
  public.has_centre_access(centre_id)
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
)
WITH CHECK (
  centre_id IS NOT NULL
  AND public.has_centre_access(centre_id)
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
);
CREATE POLICY "centre_delete_formateurs" ON public.formateurs FOR DELETE TO authenticated
USING (
  public.has_centre_access(centre_id)
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
);

-- =====================================================
-- D) RLS HARDENING: partners
-- =====================================================
DROP POLICY IF EXISTS "Admin full access partners" ON public.partners;
DROP POLICY IF EXISTS "Staff full access partners" ON public.partners;
DROP POLICY IF EXISTS "Staff can select partners" ON public.partners;
DROP POLICY IF EXISTS "Staff can insert partners" ON public.partners;
DROP POLICY IF EXISTS "Staff can update partners" ON public.partners;
DROP POLICY IF EXISTS "Staff can delete partners" ON public.partners;

CREATE POLICY "centre_select_partners" ON public.partners FOR SELECT TO authenticated
USING (
  public.has_centre_access(centre_id)
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
);
CREATE POLICY "centre_insert_partners" ON public.partners FOR INSERT TO authenticated
WITH CHECK (
  centre_id IS NOT NULL
  AND public.has_centre_access(centre_id)
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
);
CREATE POLICY "centre_update_partners" ON public.partners FOR UPDATE TO authenticated
USING (
  public.has_centre_access(centre_id)
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
)
WITH CHECK (
  centre_id IS NOT NULL
  AND public.has_centre_access(centre_id)
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
);
CREATE POLICY "centre_delete_partners" ON public.partners FOR DELETE TO authenticated
USING (
  public.has_centre_access(centre_id)
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
);

-- =====================================================
-- D) RLS HARDENING: vehicules
-- =====================================================
DROP POLICY IF EXISTS "Admin full access vehicules" ON public.vehicules;
DROP POLICY IF EXISTS "Staff full access vehicules" ON public.vehicules;
DROP POLICY IF EXISTS "Staff can select vehicules" ON public.vehicules;
DROP POLICY IF EXISTS "Staff can insert vehicules" ON public.vehicules;
DROP POLICY IF EXISTS "Staff can update vehicules" ON public.vehicules;
DROP POLICY IF EXISTS "Staff can delete vehicules" ON public.vehicules;

CREATE POLICY "centre_select_vehicules" ON public.vehicules FOR SELECT TO authenticated
USING (
  public.has_centre_access(centre_id)
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role) OR public.has_role(auth.uid(), 'formateur'::app_role))
);
CREATE POLICY "centre_insert_vehicules" ON public.vehicules FOR INSERT TO authenticated
WITH CHECK (
  centre_id IS NOT NULL
  AND public.has_centre_access(centre_id)
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
);
CREATE POLICY "centre_update_vehicules" ON public.vehicules FOR UPDATE TO authenticated
USING (
  public.has_centre_access(centre_id)
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
)
WITH CHECK (
  centre_id IS NOT NULL
  AND public.has_centre_access(centre_id)
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
);
CREATE POLICY "centre_delete_vehicules" ON public.vehicules FOR DELETE TO authenticated
USING (
  public.has_centre_access(centre_id)
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
);
