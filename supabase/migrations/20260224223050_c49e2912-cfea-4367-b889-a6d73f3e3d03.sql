
-- ═══════════════════════════════════════════════════════════════
-- Template & Compliance Studio — Database Schema
-- ═══════════════════════════════════════════════════════════════

-- Enum for template status workflow
CREATE TYPE public.template_status AS ENUM ('draft', 'review', 'approved', 'published', 'inactive');

-- Enum for template type
CREATE TYPE public.template_type AS ENUM (
  'invoice', 'email', 'attestation', 'programme', 'contrat', 'convention',
  'bulletin_inscription', 'positionnement', 'evaluation', 'emargement',
  'chef_oeuvre', 'reglement_interieur', 'convocation', 'autre'
);

-- Enum for template format
CREATE TYPE public.template_format AS ENUM ('html', 'pdf', 'docx', 'email', 'markdown');

-- Enum for document instance status
CREATE TYPE public.document_instance_status AS ENUM ('generated', 'sent', 'signed', 'archived');

-- Enum for entity type
CREATE TYPE public.template_entity_type AS ENUM ('prospect', 'stagiaire', 'inscription', 'session', 'paiement', 'centre');

-- ───────────────────────────────────────────────────────────────
-- 1) template_studio_templates — Main template registry
-- ───────────────────────────────────────────────────────────────
CREATE TABLE public.template_studio_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  centre_id UUID REFERENCES public.centres(id) ON DELETE CASCADE,
  type public.template_type NOT NULL DEFAULT 'autre',
  format public.template_format NOT NULL DEFAULT 'html',
  name TEXT NOT NULL,
  description TEXT,
  template_body TEXT NOT NULL DEFAULT '',
  variables_schema JSONB DEFAULT '[]'::jsonb,
  compliance_tags JSONB DEFAULT '[]'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  status public.template_status NOT NULL DEFAULT 'draft',
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.template_studio_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with centre access can view templates"
  ON public.template_studio_templates FOR SELECT
  USING (public.has_centre_access(centre_id) OR public.is_super_admin());

CREATE POLICY "Admin/staff can insert templates"
  ON public.template_studio_templates FOR INSERT
  WITH CHECK (
    public.has_centre_access(centre_id)
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  );

CREATE POLICY "Admin/staff can update templates"
  ON public.template_studio_templates FOR UPDATE
  USING (
    public.has_centre_access(centre_id)
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  );

CREATE POLICY "Admin can delete templates"
  ON public.template_studio_templates FOR DELETE
  USING (
    public.has_centre_access(centre_id)
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE TRIGGER update_template_studio_updated_at
  BEFORE UPDATE ON public.template_studio_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ───────────────────────────────────────────────────────────────
-- 2) template_versions — Version history
-- ───────────────────────────────────────────────────────────────
CREATE TABLE public.template_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.template_studio_templates(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  template_body TEXT NOT NULL,
  variables_schema JSONB DEFAULT '[]'::jsonb,
  compliance_tags JSONB DEFAULT '[]'::jsonb,
  status public.template_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(template_id, version)
);

ALTER TABLE public.template_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with centre access can view versions"
  ON public.template_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.template_studio_templates t
      WHERE t.id = template_id
        AND (public.has_centre_access(t.centre_id) OR public.is_super_admin())
    )
  );

CREATE POLICY "Admin/staff can insert versions"
  ON public.template_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.template_studio_templates t
      WHERE t.id = template_id
        AND public.has_centre_access(t.centre_id)
        AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
    )
  );

-- ───────────────────────────────────────────────────────────────
-- 3) document_instances — Generated document instances
-- ───────────────────────────────────────────────────────────────
CREATE TABLE public.document_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  centre_id UUID REFERENCES public.centres(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.template_studio_templates(id) ON DELETE SET NULL,
  entity_type public.template_entity_type NOT NULL,
  entity_id UUID NOT NULL,
  rendered_output_url TEXT,
  status public.document_instance_status NOT NULL DEFAULT 'generated',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.document_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with centre access can view instances"
  ON public.document_instances FOR SELECT
  USING (public.has_centre_access(centre_id) OR public.is_super_admin());

CREATE POLICY "Admin/staff can insert instances"
  ON public.document_instances FOR INSERT
  WITH CHECK (
    public.has_centre_access(centre_id)
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  );

CREATE POLICY "Admin/staff can update instances"
  ON public.document_instances FOR UPDATE
  USING (
    public.has_centre_access(centre_id)
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  );

-- ───────────────────────────────────────────────────────────────
-- 4) template_approval_logs — Approval workflow audit trail
-- ───────────────────────────────────────────────────────────────
CREATE TABLE public.template_approval_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  centre_id UUID REFERENCES public.centres(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.template_studio_templates(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  action TEXT NOT NULL, -- submit_review, approve, publish, rollback, reject
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.template_approval_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with centre access can view approval logs"
  ON public.template_approval_logs FOR SELECT
  USING (public.has_centre_access(centre_id) OR public.is_super_admin());

CREATE POLICY "Admin/staff can insert approval logs"
  ON public.template_approval_logs FOR INSERT
  WITH CHECK (
    public.has_centre_access(centre_id)
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  );

-- ───────────────────────────────────────────────────────────────
-- 5) Indexes for performance
-- ───────────────────────────────────────────────────────────────
CREATE INDEX idx_tst_centre_type ON public.template_studio_templates(centre_id, type);
CREATE INDEX idx_tst_status ON public.template_studio_templates(status);
CREATE INDEX idx_tst_active ON public.template_studio_templates(is_active) WHERE is_active = true;
CREATE INDEX idx_tv_template ON public.template_versions(template_id);
CREATE INDEX idx_di_centre ON public.document_instances(centre_id);
CREATE INDEX idx_di_template ON public.document_instances(template_id);
CREATE INDEX idx_di_entity ON public.document_instances(entity_type, entity_id);
CREATE INDEX idx_tal_template ON public.template_approval_logs(template_id);
