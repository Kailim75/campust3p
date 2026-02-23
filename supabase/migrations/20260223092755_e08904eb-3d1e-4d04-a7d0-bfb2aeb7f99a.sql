
-- Drop location contract tables
DROP TABLE IF EXISTS contrats_location_historique CASCADE;
DROP TABLE IF EXISTS contrats_location CASCADE;

-- Drop related functions
DROP FUNCTION IF EXISTS public.generate_numero_contrat() CASCADE;
DROP FUNCTION IF EXISTS public.log_contrat_historique() CASCADE;

-- Drop related enum types
DROP TYPE IF EXISTS public.contrat_location_statut CASCADE;
DROP TYPE IF EXISTS public.contrat_location_type CASCADE;
