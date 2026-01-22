-- Add is_default column to document_template_files
-- This allows setting a template as default for its document type
-- Can be global (formation_type = NULL) or specific to a formation type
ALTER TABLE public.document_template_files
ADD COLUMN is_default BOOLEAN NOT NULL DEFAULT false;

-- Add a comment to explain the behavior
COMMENT ON COLUMN public.document_template_files.is_default IS 
'When true, this template is used by default for generating documents of this type_document. If formation_type is set, it only applies to that formation. If formation_type is NULL and is_default is true, it serves as the global default.';

-- Create a function to ensure only one default per (type_document, formation_type) combination
CREATE OR REPLACE FUNCTION public.ensure_single_default_template()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only act when setting is_default to true
  IF NEW.is_default = true THEN
    -- Unset other defaults for the same type_document and formation_type combination
    UPDATE public.document_template_files
    SET is_default = false
    WHERE id != NEW.id
      AND type_document = NEW.type_document
      AND (
        (formation_type IS NULL AND NEW.formation_type IS NULL)
        OR formation_type = NEW.formation_type
      )
      AND is_default = true;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER ensure_single_default_template_trigger
BEFORE INSERT OR UPDATE ON public.document_template_files
FOR EACH ROW
EXECUTE FUNCTION public.ensure_single_default_template();