
-- Table de scoring IA des prospects
CREATE TABLE public.ia_prospect_scoring (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  centre_id UUID REFERENCES public.centres(id) ON DELETE CASCADE,
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  score_conversion INTEGER NOT NULL DEFAULT 0 CHECK (score_conversion >= 0 AND score_conversion <= 100),
  probabilite_conversion NUMERIC(5,4) NOT NULL DEFAULT 0 CHECK (probabilite_conversion >= 0 AND probabilite_conversion <= 1),
  valeur_potentielle_euros NUMERIC(10,2) NOT NULL DEFAULT 0,
  niveau_chaleur TEXT NOT NULL DEFAULT 'froid' CHECK (niveau_chaleur IN ('froid', 'tiede', 'chaud', 'brulant')),
  delai_optimal_relance INTEGER DEFAULT NULL, -- en jours
  facteurs_positifs TEXT[] DEFAULT '{}',
  facteurs_negatifs TEXT[] DEFAULT '{}',
  date_derniere_analyse TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(prospect_id)
);

-- Index pour performances
CREATE INDEX idx_ia_prospect_scoring_centre ON public.ia_prospect_scoring(centre_id);
CREATE INDEX idx_ia_prospect_scoring_score ON public.ia_prospect_scoring(score_conversion DESC);
CREATE INDEX idx_ia_prospect_scoring_chaleur ON public.ia_prospect_scoring(niveau_chaleur);

-- Enable RLS
ALTER TABLE public.ia_prospect_scoring ENABLE ROW LEVEL SECURITY;

-- Policies: admin/staff peuvent lire/écrire, super_admin tout voir
CREATE POLICY "Super admins can view all scoring"
  ON public.ia_prospect_scoring FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "Users can view scoring for their centre"
  ON public.ia_prospect_scoring FOR SELECT
  USING (public.has_centre_access(centre_id));

CREATE POLICY "Service role can manage scoring"
  ON public.ia_prospect_scoring FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger updated_at
CREATE TRIGGER update_ia_prospect_scoring_updated_at
  BEFORE UPDATE ON public.ia_prospect_scoring
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
