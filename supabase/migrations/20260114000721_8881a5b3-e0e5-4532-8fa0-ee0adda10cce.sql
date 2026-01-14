-- Table du catalogue des formations
CREATE TABLE public.catalogue_formations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  intitule text NOT NULL,
  description text,
  categorie text NOT NULL DEFAULT 'Autre',
  type_formation text NOT NULL DEFAULT 'initiale',
  duree_heures integer NOT NULL DEFAULT 14,
  prix_ht numeric NOT NULL DEFAULT 0,
  tva_percent numeric NOT NULL DEFAULT 0,
  actif boolean NOT NULL DEFAULT true,
  prerequis text,
  objectifs text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.catalogue_formations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Allow read access to catalogue" ON public.catalogue_formations
  FOR SELECT USING (true);

CREATE POLICY "Allow insert access to catalogue" ON public.catalogue_formations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update access to catalogue" ON public.catalogue_formations
  FOR UPDATE USING (true);

CREATE POLICY "Allow delete access to catalogue" ON public.catalogue_formations
  FOR DELETE USING (true);

-- Trigger updated_at
CREATE TRIGGER update_catalogue_formations_updated_at
  BEFORE UPDATE ON public.catalogue_formations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Table des lignes de facture (articles)
CREATE TABLE public.facture_lignes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  facture_id uuid NOT NULL REFERENCES public.factures(id) ON DELETE CASCADE,
  catalogue_formation_id uuid REFERENCES public.catalogue_formations(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantite integer NOT NULL DEFAULT 1,
  prix_unitaire_ht numeric NOT NULL,
  tva_percent numeric NOT NULL DEFAULT 0,
  montant_ht numeric GENERATED ALWAYS AS (quantite * prix_unitaire_ht) STORED,
  montant_tva numeric GENERATED ALWAYS AS (quantite * prix_unitaire_ht * tva_percent / 100) STORED,
  montant_ttc numeric GENERATED ALWAYS AS (quantite * prix_unitaire_ht * (1 + tva_percent / 100)) STORED,
  ordre integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.facture_lignes ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Allow read access to facture_lignes" ON public.facture_lignes
  FOR SELECT USING (true);

CREATE POLICY "Allow insert access to facture_lignes" ON public.facture_lignes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update access to facture_lignes" ON public.facture_lignes
  FOR UPDATE USING (true);

CREATE POLICY "Allow delete access to facture_lignes" ON public.facture_lignes
  FOR DELETE USING (true);

-- Insérer le catalogue par défaut T3P
INSERT INTO public.catalogue_formations (code, intitule, categorie, type_formation, duree_heures, prix_ht, description) VALUES
('TAXI-INIT', 'Formation Initiale Taxi', 'Taxi', 'initiale', 250, 1800, 'Formation initiale pour l''obtention de la carte professionnelle Taxi'),
('VTC-INIT', 'Formation Initiale VTC', 'VTC', 'initiale', 250, 1800, 'Formation initiale pour l''obtention de la carte professionnelle VTC'),
('VMDTR', 'Formation VMDTR', 'VMDTR', 'initiale', 14, 350, 'Formation conducteur de véhicule motorisé à deux ou trois roues'),
('ACC-VTC', 'Accompagnement VTC', 'Accompagnement', 'accompagnement', 20, 500, 'Accompagnement personnalisé pour la préparation à l''examen VTC'),
('ACC-VTC-75', 'Accompagnement VTC Paris', 'Accompagnement', 'accompagnement', 25, 600, 'Accompagnement VTC spécifique zone Paris'),
('TAXI-CONT', 'Formation Continue Taxi', 'Taxi', 'continue', 14, 350, 'Formation continue obligatoire pour le renouvellement de la carte Taxi'),
('VTC-CONT', 'Formation Continue VTC', 'VTC', 'continue', 14, 350, 'Formation continue obligatoire pour le renouvellement de la carte VTC'),
('TAXI-MOB', 'Formation Mobilité Taxi', 'Taxi', 'mobilite', 7, 200, 'Formation pour le passage de VTC à Taxi'),
('FRAIS-EXAM', 'Frais d''examen', 'Autre', 'autre', 0, 50, 'Frais d''inscription à l''examen'),
('FRAIS-DOSSIER', 'Frais de dossier', 'Autre', 'autre', 0, 30, 'Frais administratifs de constitution du dossier'),
('SUPPORT-COURS', 'Support de cours', 'Autre', 'autre', 0, 25, 'Livret et supports pédagogiques');