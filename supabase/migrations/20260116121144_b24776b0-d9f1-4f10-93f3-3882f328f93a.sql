-- Create table for T3P (theoretical) exams
CREATE TABLE public.examens_t3p (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  type_formation TEXT NOT NULL, -- TAXI, VTC, VMDTR
  date_examen DATE NOT NULL,
  heure_examen TIME,
  centre_examen TEXT, -- CCI, centres agréés
  departement TEXT,
  numero_convocation TEXT,
  statut TEXT NOT NULL DEFAULT 'planifie', -- planifie, passe, reussi, echoue, absent, reporte
  resultat TEXT, -- admis, ajourne, absent
  score NUMERIC(4,2), -- score sur 20 ou pourcentage
  numero_tentative INTEGER NOT NULL DEFAULT 1,
  date_reussite DATE,
  date_expiration DATE, -- 5 ans après réussite
  observations TEXT,
  document_resultat_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.examens_t3p ENABLE ROW LEVEL SECURITY;

-- RLS policies for examens_t3p (staff can manage all)
CREATE POLICY "Staff can view all T3P exams" ON public.examens_t3p
  FOR SELECT USING (true);

CREATE POLICY "Staff can insert T3P exams" ON public.examens_t3p
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Staff can update T3P exams" ON public.examens_t3p
  FOR UPDATE USING (true);

CREATE POLICY "Staff can delete T3P exams" ON public.examens_t3p
  FOR DELETE USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_examens_t3p_updated_at
  BEFORE UPDATE ON public.examens_t3p
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create table for evaluation grids (grilles d'évaluation)
CREATE TABLE public.grilles_evaluation (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  examen_pratique_id UUID REFERENCES public.examens_pratique(id) ON DELETE CASCADE,
  categorie TEXT NOT NULL, -- technique, relation_client, securite, connaissance_territoire
  competence TEXT NOT NULL,
  note TEXT, -- A, B, C, D or numeric
  commentaire TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.grilles_evaluation ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Staff can view all grilles" ON public.grilles_evaluation
  FOR SELECT USING (true);

CREATE POLICY "Staff can insert grilles" ON public.grilles_evaluation
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Staff can update grilles" ON public.grilles_evaluation
  FOR UPDATE USING (true);

CREATE POLICY "Staff can delete grilles" ON public.grilles_evaluation
  FOR DELETE USING (true);

-- Add missing columns to examens_pratique
ALTER TABLE public.examens_pratique 
  ADD COLUMN IF NOT EXISTS numero_tentative INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS evaluateur_id UUID REFERENCES public.formateurs(id),
  ADD COLUMN IF NOT EXISTS vehicule_id UUID REFERENCES public.vehicules(id);

-- Create table for professional cards tracking
CREATE TABLE public.cartes_professionnelles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  type_carte TEXT NOT NULL, -- TAXI, VTC, VMDTR
  numero_dossier TEXT,
  numero_carte TEXT,
  date_demande DATE,
  date_obtention DATE,
  date_expiration DATE, -- 5 ans
  statut TEXT NOT NULL DEFAULT 'en_attente', -- en_attente, en_cours, acceptee, refusee, expiree
  prefecture TEXT,
  notes TEXT,
  documents_manquants TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cartes_professionnelles ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Staff can view all cartes" ON public.cartes_professionnelles
  FOR SELECT USING (true);

CREATE POLICY "Staff can insert cartes" ON public.cartes_professionnelles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Staff can update cartes" ON public.cartes_professionnelles
  FOR UPDATE USING (true);

CREATE POLICY "Staff can delete cartes" ON public.cartes_professionnelles
  FOR DELETE USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_cartes_professionnelles_updated_at
  BEFORE UPDATE ON public.cartes_professionnelles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();