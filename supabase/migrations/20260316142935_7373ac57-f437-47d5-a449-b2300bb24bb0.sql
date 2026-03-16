
-- Phase 1: Ajouter les colonnes de financement sur session_inscriptions
-- Migration non destructive : tous les champs sont nullable ou ont des défauts

ALTER TABLE public.session_inscriptions
  ADD COLUMN IF NOT EXISTS type_payeur TEXT NOT NULL DEFAULT 'apprenant',
  ADD COLUMN IF NOT EXISTS payeur_partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS montant_formation NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS montant_pris_en_charge NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reste_a_charge NUMERIC DEFAULT 0;

-- Commentaires
COMMENT ON COLUMN public.session_inscriptions.type_payeur IS 'Type de payeur : apprenant, entreprise, mixte, opco, autre';
COMMENT ON COLUMN public.session_inscriptions.payeur_partner_id IS 'Référence vers le partenaire/entreprise qui finance';
COMMENT ON COLUMN public.session_inscriptions.montant_formation IS 'Montant total de la formation pour cet apprenant';
COMMENT ON COLUMN public.session_inscriptions.montant_pris_en_charge IS 'Montant pris en charge par le tiers financeur';
COMMENT ON COLUMN public.session_inscriptions.reste_a_charge IS 'Reste à charge pour apprenant = montant_formation - montant_pris_en_charge';

-- Trigger de validation et calcul automatique du reste à charge
CREATE OR REPLACE FUNCTION public.validate_inscription_financement()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  -- Valeurs par défaut
  IF NEW.montant_formation IS NULL THEN NEW.montant_formation := 0; END IF;
  IF NEW.montant_pris_en_charge IS NULL THEN NEW.montant_pris_en_charge := 0; END IF;

  -- Validations
  IF NEW.montant_formation < 0 THEN
    RAISE EXCEPTION 'Le montant de formation ne peut pas être négatif';
  END IF;

  IF NEW.montant_pris_en_charge < 0 THEN
    RAISE EXCEPTION 'Le montant pris en charge ne peut pas être négatif';
  END IF;

  IF NEW.montant_pris_en_charge > NEW.montant_formation THEN
    RAISE EXCEPTION 'Le montant pris en charge ne peut pas dépasser le montant total de la formation';
  END IF;

  -- Si type_payeur = entreprise ou mixte, payeur_partner_id obligatoire
  IF NEW.type_payeur IN ('entreprise', 'mixte') AND NEW.payeur_partner_id IS NULL THEN
    RAISE EXCEPTION 'Un partenaire/entreprise financeur doit être sélectionné pour ce type de payeur';
  END IF;

  -- Calcul automatique du reste à charge
  NEW.reste_a_charge := NEW.montant_formation - NEW.montant_pris_en_charge;

  -- Si type_payeur = apprenant, reset des champs tiers
  IF NEW.type_payeur = 'apprenant' THEN
    NEW.payeur_partner_id := NULL;
    NEW.montant_pris_en_charge := 0;
    NEW.reste_a_charge := NEW.montant_formation;
  END IF;

  -- Si type_payeur = entreprise et prise en charge = 100%, reste à charge = 0
  IF NEW.type_payeur = 'entreprise' THEN
    IF NEW.montant_pris_en_charge = 0 THEN
      NEW.montant_pris_en_charge := NEW.montant_formation;
    END IF;
    NEW.reste_a_charge := NEW.montant_formation - NEW.montant_pris_en_charge;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_validate_inscription_financement ON public.session_inscriptions;
CREATE TRIGGER trg_validate_inscription_financement
  BEFORE INSERT OR UPDATE ON public.session_inscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_inscription_financement();

-- Index pour les requêtes de jointure
CREATE INDEX IF NOT EXISTS idx_session_inscriptions_payeur_partner 
  ON public.session_inscriptions(payeur_partner_id) 
  WHERE payeur_partner_id IS NOT NULL;
