
-- Table des mois financiers
CREATE TABLE public.financial_months (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month DATE NOT NULL UNIQUE, -- YYYY-MM-01
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_months ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins et staff peuvent lire financial_months"
  ON public.financial_months FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Admins peuvent gérer financial_months"
  ON public.financial_months FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Table des charges (fixes/variables)
CREATE TABLE public.financial_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  financial_month_id UUID NOT NULL REFERENCES public.financial_months(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('fixed', 'variable')),
  label TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins et staff peuvent lire financial_costs"
  ON public.financial_costs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Admins peuvent gérer financial_costs"
  ON public.financial_costs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Table des mouvements de trésorerie manuels
CREATE TABLE public.financial_cash_manual (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  financial_month_id UUID NOT NULL REFERENCES public.financial_months(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('encaissement', 'decaissement')),
  label TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_cash_manual ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins et staff peuvent lire financial_cash_manual"
  ON public.financial_cash_manual FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Admins peuvent gérer financial_cash_manual"
  ON public.financial_cash_manual FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Index de performance
CREATE INDEX idx_financial_costs_month ON public.financial_costs(financial_month_id);
CREATE INDEX idx_financial_cash_manual_month ON public.financial_cash_manual(financial_month_id);
