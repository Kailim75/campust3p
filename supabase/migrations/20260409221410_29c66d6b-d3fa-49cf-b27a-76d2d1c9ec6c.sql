
-- Fonction de normalisation email (lowercase + trim)
CREATE OR REPLACE FUNCTION public.normalize_email()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN
    NEW.email := LOWER(TRIM(NEW.email));
  END IF;
  RETURN NEW;
END;
$$;

-- Fonction de nettoyage nom/prénom (trim + suppression caractères invisibles, PAS de changement de casse)
CREATE OR REPLACE FUNCTION public.normalize_name_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  -- Trim + suppression caractères invisibles Unicode (U+200B-U+200F, U+FEFF, U+00A0, U+202A-U+202C)
  IF NEW.nom IS NOT NULL THEN
    NEW.nom := TRIM(REGEXP_REPLACE(NEW.nom, E'[\\u200B-\\u200F\\uFEFF\\u00A0\\u202A-\\u202C]', '', 'g'));
  END IF;
  IF NEW.prenom IS NOT NULL THEN
    NEW.prenom := TRIM(REGEXP_REPLACE(NEW.prenom, E'[\\u200B-\\u200F\\uFEFF\\u00A0\\u202A-\\u202C]', '', 'g'));
  END IF;
  RETURN NEW;
END;
$$;

-- Triggers sur contacts
CREATE TRIGGER normalize_email_trigger
  BEFORE INSERT OR UPDATE OF email ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.normalize_email();

CREATE TRIGGER normalize_name_trigger
  BEFORE INSERT OR UPDATE OF nom, prenom ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.normalize_name_fields();

-- Triggers sur prospects
CREATE TRIGGER normalize_email_trigger
  BEFORE INSERT OR UPDATE OF email ON public.prospects
  FOR EACH ROW EXECUTE FUNCTION public.normalize_email();

CREATE TRIGGER normalize_name_trigger
  BEFORE INSERT OR UPDATE OF nom, prenom ON public.prospects
  FOR EACH ROW EXECUTE FUNCTION public.normalize_name_fields();
