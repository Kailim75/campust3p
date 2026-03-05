
-- Create statut_apprenant enum
CREATE TYPE public.statut_apprenant AS ENUM ('actif', 'diplome', 'abandon', 'archive');

-- Create statut_cma enum
CREATE TYPE public.statut_cma AS ENUM ('docs_manquants', 'en_cours', 'valide', 'rejete');

-- Add columns to contacts table
ALTER TABLE public.contacts 
  ADD COLUMN statut_apprenant public.statut_apprenant NOT NULL DEFAULT 'actif',
  ADD COLUMN statut_cma public.statut_cma NOT NULL DEFAULT 'docs_manquants';

-- Migrate existing data: map "Bravo" or "Client" with T3P obtenu -> diplome
UPDATE public.contacts
SET statut_apprenant = 'diplome'
WHERE statut IN ('Bravo', 'T3P obtenu') AND archived = false;

-- Map "Abandonné" -> abandon
UPDATE public.contacts
SET statut_apprenant = 'abandon'
WHERE statut = 'Abandonné' AND archived = false;

-- Map archived contacts -> archive
UPDATE public.contacts
SET statut_apprenant = 'archive'
WHERE archived = true;
