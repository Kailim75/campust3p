-- Création de l'enum pour le statut des devis
CREATE TYPE public.devis_statut AS ENUM ('brouillon', 'envoye', 'accepte', 'refuse', 'expire', 'converti');

-- Création de la table des devis
CREATE TABLE public.devis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_devis TEXT NOT NULL UNIQUE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE RESTRICT,
  session_inscription_id UUID REFERENCES public.session_inscriptions(id) ON DELETE SET NULL,
  statut public.devis_statut NOT NULL DEFAULT 'brouillon',
  type_financement public.financement_type NOT NULL DEFAULT 'personnel',
  montant_total NUMERIC NOT NULL DEFAULT 0,
  date_emission DATE,
  date_validite DATE,
  commentaires TEXT,
  facture_id UUID REFERENCES public.factures(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Création de la table des lignes de devis
CREATE TABLE public.devis_lignes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  devis_id UUID NOT NULL REFERENCES public.devis(id) ON DELETE CASCADE,
  catalogue_formation_id UUID REFERENCES public.catalogue_formations(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantite INTEGER NOT NULL DEFAULT 1,
  prix_unitaire_ht NUMERIC NOT NULL,
  tva_percent NUMERIC NOT NULL DEFAULT 0,
  remise_percent NUMERIC NOT NULL DEFAULT 0,
  montant_ht NUMERIC GENERATED ALWAYS AS (quantite * prix_unitaire_ht * (1 - remise_percent / 100)) STORED,
  montant_tva NUMERIC GENERATED ALWAYS AS (quantite * prix_unitaire_ht * (1 - remise_percent / 100) * tva_percent / 100) STORED,
  montant_ttc NUMERIC GENERATED ALWAYS AS (quantite * prix_unitaire_ht * (1 - remise_percent / 100) * (1 + tva_percent / 100)) STORED,
  ordre INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer RLS
ALTER TABLE public.devis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devis_lignes ENABLE ROW LEVEL SECURITY;

-- Policies pour devis
CREATE POLICY "Allow read access to devis" ON public.devis FOR SELECT USING (true);
CREATE POLICY "Allow insert access to devis" ON public.devis FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update access to devis" ON public.devis FOR UPDATE USING (true);
CREATE POLICY "Allow delete access to devis" ON public.devis FOR DELETE USING (true);

-- Policies pour devis_lignes
CREATE POLICY "Allow read access to devis_lignes" ON public.devis_lignes FOR SELECT USING (true);
CREATE POLICY "Allow insert access to devis_lignes" ON public.devis_lignes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update access to devis_lignes" ON public.devis_lignes FOR UPDATE USING (true);
CREATE POLICY "Allow delete access to devis_lignes" ON public.devis_lignes FOR DELETE USING (true);

-- Trigger pour updated_at
CREATE TRIGGER update_devis_updated_at
  BEFORE UPDATE ON public.devis
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Fonction pour générer le numéro de devis
CREATE OR REPLACE FUNCTION public.generate_numero_devis()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  current_year TEXT;
  next_number INTEGER;
  new_numero TEXT;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  SELECT COALESCE(MAX(
    CASE 
      WHEN numero_devis ~ ('^DEV-' || current_year || '-[0-9]+$')
      THEN SUBSTRING(numero_devis FROM 'DEV-' || current_year || '-([0-9]+)')::INTEGER
      ELSE 0
    END
  ), 0) + 1
  INTO next_number
  FROM public.devis;
  
  new_numero := 'DEV-' || current_year || '-' || LPAD(next_number::TEXT, 4, '0');
  
  RETURN new_numero;
END;
$$;