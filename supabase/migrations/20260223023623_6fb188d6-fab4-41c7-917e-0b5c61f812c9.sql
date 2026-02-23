
-- Enum types for charges
CREATE TYPE public.charge_categorie AS ENUM (
  'loyer', 'salaires', 'charges_sociales', 'formateurs_vacataires',
  'materiel_pedagogique', 'logiciels_abonnements', 'marketing_publicite',
  'comptabilite_juridique', 'assurances', 'telephone_internet',
  'fournitures_bureau', 'deplacement', 'entretien_locaux', 'taxes_impots', 'autre'
);

CREATE TYPE public.type_charge AS ENUM ('fixe', 'variable');
CREATE TYPE public.charge_statut AS ENUM ('active', 'annulee');
CREATE TYPE public.charge_periodicite AS ENUM ('unique', 'mensuelle', 'trimestrielle', 'annuelle');
CREATE TYPE public.mode_versement AS ENUM ('especes', 'cb', 'virement', 'alma', 'cpf');
CREATE TYPE public.budget_type AS ENUM ('charge', 'revenu');

-- Table charges
CREATE TABLE public.charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categorie charge_categorie NOT NULL,
  type_charge type_charge NOT NULL,
  libelle TEXT NOT NULL,
  montant NUMERIC(10,2) NOT NULL,
  date_charge DATE NOT NULL,
  periodicite charge_periodicite NOT NULL DEFAULT 'unique',
  statut charge_statut NOT NULL DEFAULT 'active',
  prestataire TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Validation trigger for montant > 0
CREATE OR REPLACE FUNCTION public.validate_charge_montant()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.montant <= 0 THEN
    RAISE EXCEPTION 'Le montant doit être supérieur à 0';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER validate_charge_montant_trigger
  BEFORE INSERT OR UPDATE ON public.charges
  FOR EACH ROW EXECUTE FUNCTION public.validate_charge_montant();

ALTER TABLE public.charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and staff can manage charges" ON public.charges
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- Table versements
CREATE TABLE public.versements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paiement_id UUID NOT NULL REFERENCES public.paiements(id) ON DELETE CASCADE,
  montant NUMERIC(10,2) NOT NULL,
  date_encaissement DATE NOT NULL,
  mode mode_versement NOT NULL,
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_versement_montant()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.montant <= 0 THEN
    RAISE EXCEPTION 'Le montant doit être supérieur à 0';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER validate_versement_montant_trigger
  BEFORE INSERT OR UPDATE ON public.versements
  FOR EACH ROW EXECUTE FUNCTION public.validate_versement_montant();

ALTER TABLE public.versements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and staff can manage versements" ON public.versements
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- Table budget_previsionnel
CREATE TABLE public.budget_previsionnel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annee INT NOT NULL,
  mois INT NOT NULL,
  type budget_type NOT NULL,
  categorie TEXT NOT NULL,
  montant_prevu NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(annee, mois, type, categorie)
);

CREATE OR REPLACE FUNCTION public.validate_budget_previsionnel()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.annee < 2024 THEN
    RAISE EXCEPTION 'L''année doit être >= 2024';
  END IF;
  IF NEW.mois < 1 OR NEW.mois > 12 THEN
    RAISE EXCEPTION 'Le mois doit être entre 1 et 12';
  END IF;
  IF NEW.montant_prevu < 0 THEN
    RAISE EXCEPTION 'Le montant prévu doit être >= 0';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER validate_budget_previsionnel_trigger
  BEFORE INSERT OR UPDATE ON public.budget_previsionnel
  FOR EACH ROW EXECUTE FUNCTION public.validate_budget_previsionnel();

ALTER TABLE public.budget_previsionnel ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage budget" ON public.budget_previsionnel
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can read budget" ON public.budget_previsionnel
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'staff'));

-- Table parametres_financiers
CREATE TABLE public.parametres_financiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prix_moyen_taxi NUMERIC(10,2) DEFAULT 990.00,
  prix_moyen_vtc NUMERIC(10,2) DEFAULT 990.00,
  prix_moyen_vmdtr NUMERIC(10,2) DEFAULT 990.00,
  prix_moyen_recyclage NUMERIC(10,2) DEFAULT 350.00,
  regime_tva BOOLEAN DEFAULT false,
  devise TEXT DEFAULT 'EUR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.parametres_financiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage params" ON public.parametres_financiers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Others can read params" ON public.parametres_financiers
  FOR SELECT TO authenticated
  USING (true);

-- Insert default params
INSERT INTO public.parametres_financiers (prix_moyen_taxi, prix_moyen_vtc, prix_moyen_vmdtr, prix_moyen_recyclage, regime_tva, devise)
VALUES (990.00, 990.00, 990.00, 350.00, false, 'EUR');
