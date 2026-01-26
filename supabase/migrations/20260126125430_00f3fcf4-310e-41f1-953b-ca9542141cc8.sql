-- Add date_prochaine_relance column to prospects table
ALTER TABLE public.prospects 
ADD COLUMN IF NOT EXISTS date_prochaine_relance DATE,
ADD COLUMN IF NOT EXISTS priorite TEXT DEFAULT 'normale' CHECK (priorite IN ('basse', 'normale', 'haute', 'urgente'));

-- Create index for relance date queries
CREATE INDEX IF NOT EXISTS idx_prospects_relance ON public.prospects(date_prochaine_relance) WHERE is_active = true;

-- Create prospect_historique table for tracking interactions
CREATE TABLE IF NOT EXISTS public.prospect_historique (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('appel', 'email', 'sms', 'rdv', 'note', 'relance')),
  titre TEXT NOT NULL,
  contenu TEXT,
  date_echange TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  duree_minutes INTEGER,
  resultat TEXT,
  date_rappel DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on prospect_historique
ALTER TABLE public.prospect_historique ENABLE ROW LEVEL SECURITY;

-- RLS policies for prospect_historique
CREATE POLICY "Staff can view prospect history"
  ON public.prospect_historique FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff can create prospect history"
  ON public.prospect_historique FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff can update prospect history"
  ON public.prospect_historique FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff can delete prospect history"
  ON public.prospect_historique FOR DELETE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_prospect_historique_prospect ON public.prospect_historique(prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospect_historique_date ON public.prospect_historique(date_echange DESC);