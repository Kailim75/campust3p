-- Ajout des colonnes pour les agréments du centre de formation
ALTER TABLE public.centre_formation 
ADD COLUMN IF NOT EXISTS qualiopi_numero TEXT,
ADD COLUMN IF NOT EXISTS qualiopi_date_obtention DATE,
ADD COLUMN IF NOT EXISTS qualiopi_date_expiration DATE,
ADD COLUMN IF NOT EXISTS agrement_prefecture TEXT,
ADD COLUMN IF NOT EXISTS agrement_prefecture_date DATE,
ADD COLUMN IF NOT EXISTS code_rncp TEXT,
ADD COLUMN IF NOT EXISTS agrements_autres JSONB DEFAULT '[]'::jsonb;

-- Commentaires pour documenter les colonnes
COMMENT ON COLUMN public.centre_formation.qualiopi_numero IS 'Numéro de certification Qualiopi';
COMMENT ON COLUMN public.centre_formation.qualiopi_date_obtention IS 'Date d''obtention de la certification Qualiopi';
COMMENT ON COLUMN public.centre_formation.qualiopi_date_expiration IS 'Date d''expiration de la certification Qualiopi';
COMMENT ON COLUMN public.centre_formation.agrement_prefecture IS 'Numéro d''agrément préfecture (pour T3P)';
COMMENT ON COLUMN public.centre_formation.agrement_prefecture_date IS 'Date d''obtention de l''agrément préfecture';
COMMENT ON COLUMN public.centre_formation.code_rncp IS 'Code RNCP des formations certifiantes';
COMMENT ON COLUMN public.centre_formation.agrements_autres IS 'Autres agréments et certifications (format JSON)';