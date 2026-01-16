-- Create table for objectives
CREATE TABLE public.objectifs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type_periode TEXT NOT NULL CHECK (type_periode IN ('mensuel', 'trimestriel', 'annuel')),
  mois INTEGER CHECK (mois >= 1 AND mois <= 12),
  trimestre INTEGER CHECK (trimestre >= 1 AND trimestre <= 4),
  annee INTEGER NOT NULL,
  type_objectif TEXT NOT NULL CHECK (type_objectif IN ('ca', 'encaissements', 'nouveaux_contacts', 'nouveaux_clients', 'sessions', 'inscriptions', 'taux_reussite')),
  valeur_cible NUMERIC NOT NULL,
  description TEXT,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(type_periode, annee, mois, trimestre, type_objectif)
);

-- Enable RLS
ALTER TABLE public.objectifs ENABLE ROW LEVEL SECURITY;

-- RLS policies (authenticated users can manage objectives)
CREATE POLICY "Authenticated users can view objectives"
  ON public.objectifs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert objectives"
  ON public.objectifs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update objectives"
  ON public.objectifs FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete objectives"
  ON public.objectifs FOR DELETE
  TO authenticated
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_objectifs_updated_at
  BEFORE UPDATE ON public.objectifs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();