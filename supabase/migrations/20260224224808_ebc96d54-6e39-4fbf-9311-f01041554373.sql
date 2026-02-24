
-- ═══════════════════════════════════════════════════════════
-- Extend Template Studio schema (incremental, no breaking changes)
-- ═══════════════════════════════════════════════════════════

-- 1) Add new enum values for template_type (only if not already present)
DO $$ BEGIN
  ALTER TYPE public.template_type ADD VALUE IF NOT EXISTS 'evaluation_chaud';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.template_type ADD VALUE IF NOT EXISTS 'evaluation_froid';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.template_type ADD VALUE IF NOT EXISTS 'test_positionnement';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.template_type ADD VALUE IF NOT EXISTS 'feuille_emargement';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.template_type ADD VALUE IF NOT EXISTS 'procedure_reclamation';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2) Add 'archived' to template_status enum
DO $$ BEGIN
  ALTER TYPE public.template_status ADD VALUE IF NOT EXISTS 'archived';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3) Add missing columns to template_studio_templates
ALTER TABLE public.template_studio_templates
  ADD COLUMN IF NOT EXISTS scenario TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS compliance_score INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS compliance_report_json JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS compliance_validated_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS compliance_validated_by UUID DEFAULT NULL;

-- 4) Add missing columns to template_versions
ALTER TABLE public.template_versions
  ADD COLUMN IF NOT EXISTS centre_id UUID DEFAULT NULL REFERENCES public.centres(id),
  ADD COLUMN IF NOT EXISTS compliance_score INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS compliance_report_json JSONB DEFAULT NULL;

-- 5) Create index on scenario for email scoping
CREATE INDEX IF NOT EXISTS idx_template_studio_scenario 
  ON public.template_studio_templates(type, scenario) 
  WHERE scenario IS NOT NULL;

-- 6) Create index for active template lookup
CREATE INDEX IF NOT EXISTS idx_template_studio_active_type 
  ON public.template_studio_templates(centre_id, type, is_active) 
  WHERE is_active = true;
