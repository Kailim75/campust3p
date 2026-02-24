
-- Table d'historique des scores centre
CREATE TABLE public.ia_score_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  centre_id UUID REFERENCES public.centres(id) ON DELETE CASCADE,
  score_global INTEGER NOT NULL DEFAULT 0 CHECK (score_global >= 0 AND score_global <= 100),
  score_sante INTEGER NOT NULL DEFAULT 0 CHECK (score_sante >= 0 AND score_sante <= 100),
  score_commercial INTEGER NOT NULL DEFAULT 0 CHECK (score_commercial >= 0 AND score_commercial <= 100),
  score_admin INTEGER NOT NULL DEFAULT 0 CHECK (score_admin >= 0 AND score_admin <= 100),
  score_financier INTEGER NOT NULL DEFAULT 0 CHECK (score_financier >= 0 AND score_financier <= 100),
  score_risque_ca INTEGER NOT NULL DEFAULT 0 CHECK (score_risque_ca >= 0 AND score_risque_ca <= 100),
  details JSONB DEFAULT '{}',
  ponderations JSONB NOT NULL DEFAULT '{"sante": 0.25, "commercial": 0.25, "admin": 0.20, "financier": 0.20, "risque_ca": 0.10}',
  date_snapshot DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(centre_id, date_snapshot)
);

-- Index
CREATE INDEX idx_ia_score_history_centre ON public.ia_score_history(centre_id);
CREATE INDEX idx_ia_score_history_date ON public.ia_score_history(date_snapshot DESC);

-- Enable RLS
ALTER TABLE public.ia_score_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view all score history"
  ON public.ia_score_history FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "Users can view score history for their centre"
  ON public.ia_score_history FOR SELECT
  USING (public.has_centre_access(centre_id) OR centre_id IS NULL);

CREATE POLICY "Admins can insert score history"
  ON public.ia_score_history FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'staff')
    OR public.is_super_admin()
    OR auth.uid() IS NULL
  );

CREATE POLICY "Admins can update score history"
  ON public.ia_score_history FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'staff')
    OR public.is_super_admin()
    OR auth.uid() IS NULL
  );
