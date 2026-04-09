
-- ============================================================
-- QW-4 : Colonne telephone_normalise + trigger
-- ============================================================

-- Ajout de la colonne sur contacts
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS telephone_normalise TEXT;

-- Ajout de la colonne sur prospects
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS telephone_normalise TEXT;

-- Fonction de normalisation téléphone
CREATE OR REPLACE FUNCTION public.normalize_telephone()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
  v_clean TEXT;
BEGIN
  -- Nettoyer le téléphone d'affichage (supprimer caractères invisibles)
  IF NEW.telephone IS NOT NULL THEN
    NEW.telephone := TRIM(REGEXP_REPLACE(NEW.telephone, E'[\\u200B-\\u200F\\uFEFF\\u00A0\\u202A-\\u202C]', '', 'g'));
  END IF;

  -- Calculer la valeur normalisée E.164
  IF NEW.telephone IS NOT NULL AND TRIM(NEW.telephone) != '' THEN
    -- Supprimer tout sauf chiffres et +
    v_clean := REGEXP_REPLACE(NEW.telephone, '[^0-9+]', '', 'g');
    
    -- Convertir format 06/07 → +33
    IF v_clean ~ '^0[1-9]' THEN
      v_clean := '+33' || SUBSTRING(v_clean FROM 2);
    -- Convertir format 33X sans + → +33X
    ELSIF v_clean ~ '^33[1-9]' THEN
      v_clean := '+' || v_clean;
    END IF;
    
    NEW.telephone_normalise := v_clean;
  ELSE
    NEW.telephone_normalise := NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- Triggers sur contacts
CREATE TRIGGER normalize_telephone_trigger
  BEFORE INSERT OR UPDATE OF telephone ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.normalize_telephone();

-- Triggers sur prospects
CREATE TRIGGER normalize_telephone_trigger
  BEFORE INSERT OR UPDATE OF telephone ON public.prospects
  FOR EACH ROW EXECUTE FUNCTION public.normalize_telephone();

-- Index pour recherche de doublons
CREATE INDEX IF NOT EXISTS idx_contacts_telephone_normalise ON public.contacts (telephone_normalise) WHERE telephone_normalise IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prospects_telephone_normalise ON public.prospects (telephone_normalise) WHERE telephone_normalise IS NOT NULL;

-- ============================================================
-- QW-5 : Auto-populate montant_formation à l'inscription
-- ============================================================

CREATE OR REPLACE FUNCTION public.auto_populate_inscription_montant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_prix NUMERIC;
BEGIN
  -- Ne remplir que si montant_formation est 0 ou NULL
  IF COALESCE(NEW.montant_formation, 0) = 0 THEN
    -- Priorité 1 : prix de la session
    SELECT s.prix INTO v_prix
    FROM public.sessions s
    WHERE s.id = NEW.session_id;
    
    -- Priorité 2 : prix du catalogue
    IF v_prix IS NULL OR v_prix = 0 THEN
      SELECT cf.prix_ht INTO v_prix
      FROM public.sessions s
      JOIN public.catalogue_formations cf ON cf.id = s.catalogue_formation_id
      WHERE s.id = NEW.session_id;
    END IF;
    
    IF v_prix IS NOT NULL AND v_prix > 0 THEN
      NEW.montant_formation := v_prix;
      NEW.reste_a_charge := v_prix - COALESCE(NEW.montant_pris_en_charge, 0);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_populate_montant_trigger
  BEFORE INSERT ON public.session_inscriptions
  FOR EACH ROW EXECUTE FUNCTION public.auto_populate_inscription_montant();
