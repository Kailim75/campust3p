-- Ajouter le champ remise_percent au catalogue des formations
ALTER TABLE public.catalogue_formations
ADD COLUMN remise_percent numeric NOT NULL DEFAULT 0;