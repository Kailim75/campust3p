
-- Table des transactions bancaires importées (relevés CSV/OFX)
CREATE TABLE public.transactions_bancaires (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date_operation DATE NOT NULL,
  date_valeur DATE,
  libelle TEXT NOT NULL,
  montant NUMERIC NOT NULL,
  type_operation TEXT NOT NULL DEFAULT 'autre', -- debit, credit
  categorie TEXT,
  reference_bancaire TEXT,
  banque TEXT DEFAULT 'BNP',
  compte TEXT,
  rapproche BOOLEAN NOT NULL DEFAULT false,
  facture_id UUID REFERENCES public.factures(id),
  paiement_id UUID REFERENCES public.paiements(id),
  charge_id UUID REFERENCES public.charges(id),
  notes TEXT,
  import_batch_id TEXT, -- to group imports
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- Index pour recherche rapide
CREATE INDEX idx_transactions_bancaires_date ON public.transactions_bancaires(date_operation);
CREATE INDEX idx_transactions_bancaires_rapproche ON public.transactions_bancaires(rapproche);
CREATE INDEX idx_transactions_bancaires_batch ON public.transactions_bancaires(import_batch_id);

-- Table solde de trésorerie (snapshot quotidien ou manuel)
CREATE TABLE public.tresorerie_soldes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date_solde DATE NOT NULL,
  solde_reel NUMERIC NOT NULL DEFAULT 0,
  solde_previsionnel NUMERIC,
  banque TEXT DEFAULT 'BNP',
  compte TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tresorerie_soldes_date ON public.tresorerie_soldes(date_solde);

-- Table alertes trésorerie
CREATE TABLE public.tresorerie_alertes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type_alerte TEXT NOT NULL, -- seuil_bas, echeance, anomalie
  titre TEXT NOT NULL,
  description TEXT,
  montant_seuil NUMERIC,
  statut TEXT NOT NULL DEFAULT 'active', -- active, vue, traitee
  date_alerte TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transactions_bancaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tresorerie_soldes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tresorerie_alertes ENABLE ROW LEVEL SECURITY;

-- RLS policies (admin/staff only)
CREATE POLICY "Admin/staff can manage transactions_bancaires"
  ON public.transactions_bancaires FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Admin/staff can manage tresorerie_soldes"
  ON public.tresorerie_soldes FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Admin/staff can manage tresorerie_alertes"
  ON public.tresorerie_alertes FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
