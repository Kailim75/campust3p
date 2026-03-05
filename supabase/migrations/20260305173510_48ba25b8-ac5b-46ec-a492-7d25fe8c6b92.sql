
-- ══════════════════════════════════════════════════════════════
-- Template Studio V2 — Part 1: Enums + Extend existing tables
-- ══════════════════════════════════════════════════════════════

DO $$ BEGIN CREATE TYPE public.template_track_scope AS ENUM ('initial', 'continuing', 'both'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.template_category AS ENUM ('finance', 'formation', 'admin', 'qualite'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.template_applies_to AS ENUM ('contact', 'session', 'inscription'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.generated_doc_status AS ENUM ('queued', 'generated', 'failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend template_studio_templates
ALTER TABLE public.template_studio_templates
  ADD COLUMN IF NOT EXISTS track_scope public.template_track_scope DEFAULT 'both',
  ADD COLUMN IF NOT EXISTS category public.template_category DEFAULT 'formation',
  ADD COLUMN IF NOT EXISTS applies_to public.template_applies_to DEFAULT 'contact',
  ADD COLUMN IF NOT EXISTS current_version_id uuid;

-- Extend template_versions
ALTER TABLE public.template_versions
  ADD COLUMN IF NOT EXISTS css text DEFAULT '',
  ADD COLUMN IF NOT EXISTS changelog text DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT false;
