
-- =============================================
-- SPRINT 2 - MIGRATION 1: Storage centre-aware + NOT NULL + immutability + formateur mapping
-- =============================================

-- A) Helper: extract centre_id from storage path (first segment as UUID)
CREATE OR REPLACE FUNCTION public.storage_object_centre_id(object_name text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_first_segment text;
  v_uuid uuid;
BEGIN
  v_first_segment := split_part(object_name, '/', 1);
  BEGIN
    v_uuid := v_first_segment::uuid;
    RETURN v_uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$$;

-- B) Drop ALL existing storage policies
DROP POLICY IF EXISTS "Admin users can delete centre formation assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin users can delete template files from storage" ON storage.objects;
DROP POLICY IF EXISTS "Admin users can update centre formation assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin users can upload centre formation assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view centre formation assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view pedagogie" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users with role can delete generated documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users with role can upload generated documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users with role can upload template files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users with role can view generated documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users with role can view template files" ON storage.objects;
DROP POLICY IF EXISTS "Public can read generated documents" ON storage.objects;
DROP POLICY IF EXISTS "Public can read generated documents for signature" ON storage.objects;
DROP POLICY IF EXISTS "Public can read signatures" ON storage.objects;
DROP POLICY IF EXISTS "Staff can delete contact documents" ON storage.objects;
DROP POLICY IF EXISTS "Staff can delete pedagogie" ON storage.objects;
DROP POLICY IF EXISTS "Staff can delete signatures" ON storage.objects;
DROP POLICY IF EXISTS "Staff can update contact documents" ON storage.objects;
DROP POLICY IF EXISTS "Staff can update pedagogie" ON storage.objects;
DROP POLICY IF EXISTS "Staff can update signatures" ON storage.objects;
DROP POLICY IF EXISTS "Staff can upload contact documents" ON storage.objects;
DROP POLICY IF EXISTS "Staff can upload pedagogie" ON storage.objects;
DROP POLICY IF EXISTS "Staff can upload signatures" ON storage.objects;
DROP POLICY IF EXISTS "Staff can view contact documents" ON storage.objects;
DROP POLICY IF EXISTS "Staff can view signatures" ON storage.objects;

-- C) Recreate storage policies: centre-aware via path prefix {centre_id}/...

-- === centre-formation-assets: centre-aware ===
CREATE POLICY "cfa_select" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'centre-formation-assets'
  AND (
    (public.storage_object_centre_id(name) IS NOT NULL AND public.has_centre_access(public.storage_object_centre_id(name)))
    OR public.is_super_admin()
  )
);
CREATE POLICY "cfa_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'centre-formation-assets'
  AND public.storage_object_centre_id(name) IS NOT NULL
  AND public.has_centre_access(public.storage_object_centre_id(name))
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_super_admin())
);
CREATE POLICY "cfa_update" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'centre-formation-assets'
  AND (
    (public.storage_object_centre_id(name) IS NOT NULL AND public.has_centre_access(public.storage_object_centre_id(name)))
    OR public.is_super_admin()
  )
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_super_admin())
);
CREATE POLICY "cfa_delete" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'centre-formation-assets'
  AND (
    (public.storage_object_centre_id(name) IS NOT NULL AND public.has_centre_access(public.storage_object_centre_id(name)))
    OR public.is_super_admin()
  )
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_super_admin())
);

-- === contact-documents: centre-aware ===
CREATE POLICY "cd_select" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'contact-documents'
  AND (
    (public.storage_object_centre_id(name) IS NOT NULL AND public.has_centre_access(public.storage_object_centre_id(name)))
    OR public.is_super_admin()
  )
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role) OR public.is_super_admin())
);
CREATE POLICY "cd_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'contact-documents'
  AND public.storage_object_centre_id(name) IS NOT NULL
  AND public.has_centre_access(public.storage_object_centre_id(name))
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role) OR public.is_super_admin())
);
CREATE POLICY "cd_update" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'contact-documents'
  AND (
    (public.storage_object_centre_id(name) IS NOT NULL AND public.has_centre_access(public.storage_object_centre_id(name)))
    OR public.is_super_admin()
  )
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role) OR public.is_super_admin())
);
CREATE POLICY "cd_delete" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'contact-documents'
  AND (
    (public.storage_object_centre_id(name) IS NOT NULL AND public.has_centre_access(public.storage_object_centre_id(name)))
    OR public.is_super_admin()
  )
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role) OR public.is_super_admin())
);

-- === pedagogie: centre-aware, formateur can upload ===
CREATE POLICY "ped_select" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'pedagogie'
  AND (
    (public.storage_object_centre_id(name) IS NOT NULL AND public.has_centre_access(public.storage_object_centre_id(name)))
    OR public.is_super_admin()
  )
);
CREATE POLICY "ped_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'pedagogie'
  AND public.storage_object_centre_id(name) IS NOT NULL
  AND public.has_centre_access(public.storage_object_centre_id(name))
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role) OR public.has_role(auth.uid(), 'formateur'::app_role) OR public.is_super_admin())
);
CREATE POLICY "ped_update" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'pedagogie'
  AND (
    (public.storage_object_centre_id(name) IS NOT NULL AND public.has_centre_access(public.storage_object_centre_id(name)))
    OR public.is_super_admin()
  )
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role) OR public.has_role(auth.uid(), 'formateur'::app_role) OR public.is_super_admin())
);
CREATE POLICY "ped_delete" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'pedagogie'
  AND (
    (public.storage_object_centre_id(name) IS NOT NULL AND public.has_centre_access(public.storage_object_centre_id(name)))
    OR public.is_super_admin()
  )
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role) OR public.is_super_admin())
);

-- === signatures: public read (needed for signature verification), authenticated write ===
CREATE POLICY "sig_public_read" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'signatures');
CREATE POLICY "sig_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'signatures'
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role) OR public.is_super_admin())
);
CREATE POLICY "sig_update" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'signatures'
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role) OR public.is_super_admin())
);
CREATE POLICY "sig_delete" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'signatures'
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role) OR public.is_super_admin())
);

-- === generated-documents: public read (certificates/signatures), authenticated write ===
CREATE POLICY "gd_public_read" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'generated-documents');
CREATE POLICY "gd_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'generated-documents'
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role) OR public.is_super_admin())
);
CREATE POLICY "gd_delete" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'generated-documents'
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role) OR public.is_super_admin())
);

-- === document-templates: role-based only (no centre path needed, shared templates) ===
CREATE POLICY "dt_select" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'document-templates'
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role) OR public.is_super_admin())
);
CREATE POLICY "dt_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'document-templates'
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role) OR public.is_super_admin())
);
CREATE POLICY "dt_delete" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'document-templates'
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_super_admin())
);

-- D) centre_id NOT NULL on critical tables (backfill done in Sprint 1)
ALTER TABLE public.contacts ALTER COLUMN centre_id SET NOT NULL;
ALTER TABLE public.factures ALTER COLUMN centre_id SET NOT NULL;
ALTER TABLE public.devis ALTER COLUMN centre_id SET NOT NULL;
ALTER TABLE public.sessions ALTER COLUMN centre_id SET NOT NULL;
ALTER TABLE public.creneaux_conduite ALTER COLUMN centre_id SET NOT NULL;
ALTER TABLE public.formateurs ALTER COLUMN centre_id SET NOT NULL;
ALTER TABLE public.partners ALTER COLUMN centre_id SET NOT NULL;
ALTER TABLE public.vehicules ALTER COLUMN centre_id SET NOT NULL;
ALTER TABLE public.catalogue_formations ALTER COLUMN centre_id SET NOT NULL;

-- E) Immutability trigger: prevent centre_id changes except super_admin
CREATE OR REPLACE FUNCTION public.prevent_centre_id_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF OLD.centre_id IS DISTINCT FROM NEW.centre_id THEN
    IF NOT public.is_super_admin() THEN
      RAISE EXCEPTION 'Modification de centre_id interdite (immutabilité multi-tenant)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_immutable_centre_id_contacts BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.prevent_centre_id_change();
CREATE TRIGGER trg_immutable_centre_id_factures BEFORE UPDATE ON public.factures FOR EACH ROW EXECUTE FUNCTION public.prevent_centre_id_change();
CREATE TRIGGER trg_immutable_centre_id_devis BEFORE UPDATE ON public.devis FOR EACH ROW EXECUTE FUNCTION public.prevent_centre_id_change();
CREATE TRIGGER trg_immutable_centre_id_sessions BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.prevent_centre_id_change();
CREATE TRIGGER trg_immutable_centre_id_creneaux BEFORE UPDATE ON public.creneaux_conduite FOR EACH ROW EXECUTE FUNCTION public.prevent_centre_id_change();
CREATE TRIGGER trg_immutable_centre_id_formateurs BEFORE UPDATE ON public.formateurs FOR EACH ROW EXECUTE FUNCTION public.prevent_centre_id_change();
CREATE TRIGGER trg_immutable_centre_id_partners BEFORE UPDATE ON public.partners FOR EACH ROW EXECUTE FUNCTION public.prevent_centre_id_change();
CREATE TRIGGER trg_immutable_centre_id_vehicules BEFORE UPDATE ON public.vehicules FOR EACH ROW EXECUTE FUNCTION public.prevent_centre_id_change();
CREATE TRIGGER trg_immutable_centre_id_catalogue BEFORE UPDATE ON public.catalogue_formations FOR EACH ROW EXECUTE FUNCTION public.prevent_centre_id_change();

-- F) Add user_id to formateurs for auth mapping
ALTER TABLE public.formateurs ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_formateurs_user_id ON public.formateurs(user_id) WHERE user_id IS NOT NULL;

-- Helper function to get formateur_id for current auth user
CREATE OR REPLACE FUNCTION public.get_user_formateur_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT id FROM public.formateurs WHERE user_id = auth.uid() LIMIT 1;
$$;
