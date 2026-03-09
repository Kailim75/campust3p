
-- Add contract qualification columns to session_inscriptions
ALTER TABLE public.session_inscriptions
  ADD COLUMN IF NOT EXISTS contract_document_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS contract_frame_status text DEFAULT 'a_qualifier',
  ADD COLUMN IF NOT EXISTS qualification_source text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS qualified_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS qualified_by uuid DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.session_inscriptions.contract_document_type IS 'contrat | convention | null';
COMMENT ON COLUMN public.session_inscriptions.contract_frame_status IS 'qualifie | a_qualifier | auto_detecte';
COMMENT ON COLUMN public.session_inscriptions.qualification_source IS 'manual | auto_financement | auto_personnel';
COMMENT ON COLUMN public.session_inscriptions.qualified_at IS 'When the qualification was set';
COMMENT ON COLUMN public.session_inscriptions.qualified_by IS 'User who qualified (null if auto)';
