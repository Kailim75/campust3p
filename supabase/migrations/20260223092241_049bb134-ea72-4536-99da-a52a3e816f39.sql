
-- Drop BIM tables (CASCADE handles foreign keys)
DROP TABLE IF EXISTS bim_interactions CASCADE;
DROP TABLE IF EXISTS bim_evaluations CASCADE;
DROP TABLE IF EXISTS bim_progressions CASCADE;
DROP TABLE IF EXISTS bim_scenes CASCADE;
DROP TABLE IF EXISTS bim_projets CASCADE;

-- Drop related function
DROP FUNCTION IF EXISTS public.update_bim_progression() CASCADE;

-- Drop related enum types
DROP TYPE IF EXISTS public.bim_evaluation_type CASCADE;
DROP TYPE IF EXISTS public.bim_progression_statut CASCADE;
DROP TYPE IF EXISTS public.bim_projet_statut CASCADE;
DROP TYPE IF EXISTS public.bim_formation_type CASCADE;
