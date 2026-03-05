
-- ══════════════════════════════════════════════════════════════
-- Template Studio V2 — Part 2: New tables + storage + audit
-- ══════════════════════════════════════════════════════════════

-- Document Packs
CREATE TABLE public.document_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id uuid NOT NULL REFERENCES public.centres(id) ON DELETE CASCADE,
  name text NOT NULL,
  track_scope public.template_track_scope NOT NULL DEFAULT 'both',
  applies_to public.template_applies_to NOT NULL DEFAULT 'session',
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.document_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Centre read packs" ON public.document_packs FOR SELECT TO authenticated USING (public.has_centre_access(centre_id));
CREATE POLICY "Admin manage packs" ON public.document_packs FOR ALL TO authenticated
  USING (public.has_centre_access(centre_id) AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff') OR public.is_super_admin()))
  WITH CHECK (public.has_centre_access(centre_id) AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff') OR public.is_super_admin()));
DROP TRIGGER IF EXISTS trg_auto_set_centre_id ON public.document_packs;
CREATE TRIGGER trg_auto_set_centre_id BEFORE INSERT ON public.document_packs FOR EACH ROW EXECUTE FUNCTION public.generic_auto_set_centre_id();

-- Document Pack Items
CREATE TABLE public.document_pack_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id uuid NOT NULL REFERENCES public.document_packs(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.template_studio_templates(id) ON DELETE CASCADE,
  sort_order int DEFAULT 0,
  is_required boolean DEFAULT false,
  auto_generate boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.document_pack_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Items follow pack" ON public.document_pack_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.document_packs dp WHERE dp.id = pack_id AND public.has_centre_access(dp.centre_id)));
CREATE POLICY "Admin manage items" ON public.document_pack_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.document_packs dp WHERE dp.id = pack_id AND public.has_centre_access(dp.centre_id) AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff') OR public.is_super_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.document_packs dp WHERE dp.id = pack_id AND public.has_centre_access(dp.centre_id) AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff') OR public.is_super_admin())));

-- Rename old generated_documents -> generated_documents_legacy
ALTER TABLE public.generated_documents RENAME TO generated_documents_legacy;

-- New generated_documents (V2)
CREATE TABLE public.generated_documents_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id uuid NOT NULL REFERENCES public.centres(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.template_studio_templates(id),
  template_version_id uuid REFERENCES public.template_versions(id),
  pack_id uuid REFERENCES public.document_packs(id),
  contact_id uuid REFERENCES public.contacts(id),
  session_id uuid REFERENCES public.sessions(id),
  inscription_id uuid REFERENCES public.session_inscriptions(id),
  file_path text,
  file_type text DEFAULT 'pdf',
  file_name text,
  status public.generated_doc_status DEFAULT 'queued',
  error_message text,
  variables_snapshot jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  created_by uuid DEFAULT auth.uid()
);
ALTER TABLE public.generated_documents_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Centre read gen_docs" ON public.generated_documents_v2 FOR SELECT TO authenticated USING (public.has_centre_access(centre_id));
CREATE POLICY "Admin manage gen_docs" ON public.generated_documents_v2 FOR ALL TO authenticated
  USING (public.has_centre_access(centre_id) AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff') OR public.is_super_admin()))
  WITH CHECK (public.has_centre_access(centre_id) AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff') OR public.is_super_admin()));
DROP TRIGGER IF EXISTS trg_auto_set_centre_id ON public.generated_documents_v2;
CREATE TRIGGER trg_auto_set_centre_id BEFORE INSERT ON public.generated_documents_v2 FOR EACH ROW EXECUTE FUNCTION public.generic_auto_set_centre_id();

-- Template Audit Log
CREATE TABLE public.template_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id uuid REFERENCES public.centres(id),
  template_id uuid REFERENCES public.template_studio_templates(id),
  version_id uuid REFERENCES public.template_versions(id),
  generated_document_id uuid REFERENCES public.generated_documents_v2(id),
  action text NOT NULL,
  contact_id uuid REFERENCES public.contacts(id),
  session_id uuid REFERENCES public.sessions(id),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  created_by uuid DEFAULT auth.uid()
);
ALTER TABLE public.template_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Centre read audit" ON public.template_audit_log FOR SELECT TO authenticated USING (centre_id IS NULL OR public.has_centre_access(centre_id));
CREATE POLICY "Insert audit" ON public.template_audit_log FOR INSERT TO authenticated WITH CHECK (true);
DROP TRIGGER IF EXISTS trg_auto_set_centre_id ON public.template_audit_log;
CREATE TRIGGER trg_auto_set_centre_id BEFORE INSERT ON public.template_audit_log FOR EACH ROW EXECUTE FUNCTION public.generic_auto_set_centre_id();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('generated-docs', 'generated-docs', false) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Centre read gen-docs storage" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'generated-docs' AND public.has_centre_access(public.storage_object_centre_id(name)) AND public.storage_object_centre_id(name) IS NOT NULL);
CREATE POLICY "Admin upload gen-docs storage" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'generated-docs' AND public.has_centre_access(public.storage_object_centre_id(name)) AND public.storage_object_centre_id(name) IS NOT NULL);
CREATE POLICY "Admin delete gen-docs storage" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'generated-docs' AND public.has_centre_access(public.storage_object_centre_id(name)) AND public.storage_object_centre_id(name) IS NOT NULL);
