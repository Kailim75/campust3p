-- Add new fields to sessions table for enhanced session management
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS catalogue_formation_id uuid REFERENCES public.catalogue_formations(id),
ADD COLUMN IF NOT EXISTS heure_debut time DEFAULT '09:00',
ADD COLUMN IF NOT EXISTS heure_fin time DEFAULT '17:00',
ADD COLUMN IF NOT EXISTS adresse_rue text,
ADD COLUMN IF NOT EXISTS adresse_code_postal text,
ADD COLUMN IF NOT EXISTS adresse_ville text,
ADD COLUMN IF NOT EXISTS prix_ht numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS tva_percent numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS duree_heures integer,
ADD COLUMN IF NOT EXISTS objectifs text,
ADD COLUMN IF NOT EXISTS prerequis text,
ADD COLUMN IF NOT EXISTS numero_session text;

-- Create index for catalogue_formation_id
CREATE INDEX IF NOT EXISTS idx_sessions_catalogue_formation_id ON public.sessions(catalogue_formation_id);

-- Create index for formateur_id (already exists in schema)
CREATE INDEX IF NOT EXISTS idx_sessions_formateur_id ON public.sessions(formateur_id);

-- Function to generate unique session number
CREATE OR REPLACE FUNCTION public.generate_numero_session()
RETURNS TRIGGER AS $$
DECLARE
  year_part text;
  sequence_num integer;
  new_numero text;
BEGIN
  year_part := to_char(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero_session FROM 'S[0-9]{4}-([0-9]+)') AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM public.sessions
  WHERE numero_session LIKE 'S' || year_part || '-%';
  
  new_numero := 'S' || year_part || '-' || LPAD(sequence_num::text, 4, '0');
  NEW.numero_session := new_numero;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger to auto-generate session number
DROP TRIGGER IF EXISTS generate_session_numero ON public.sessions;
CREATE TRIGGER generate_session_numero
  BEFORE INSERT ON public.sessions
  FOR EACH ROW
  WHEN (NEW.numero_session IS NULL)
  EXECUTE FUNCTION public.generate_numero_session();