
ALTER TABLE public.factures
  ADD COLUMN IF NOT EXISTS buyer_type TEXT,
  ADD COLUMN IF NOT EXISTS buyer_name_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS buyer_siren TEXT,
  ADD COLUMN IF NOT EXISTS buyer_siret TEXT,
  ADD COLUMN IF NOT EXISTS buyer_tva_intracom TEXT,
  ADD COLUMN IF NOT EXISTS buyer_country TEXT DEFAULT 'FR',
  ADD COLUMN IF NOT EXISTS buyer_address_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS delivery_address_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS buyer_email_facturation TEXT,
  ADD COLUMN IF NOT EXISTS buyer_platform_provider TEXT,
  ADD COLUMN IF NOT EXISTS buyer_routing_code TEXT,
  ADD COLUMN IF NOT EXISTS montant_ht NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS montant_tva NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS devise TEXT DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS regime_tva TEXT DEFAULT 'exonere_261_4_4_a',
  ADD COLUMN IF NOT EXISTS motif_exoneration_tva TEXT,
  ADD COLUMN IF NOT EXISTS type_facture TEXT DEFAULT 'facture',
  ADD COLUMN IF NOT EXISTS facture_origine_id UUID REFERENCES public.factures(id),
  ADD COLUMN IF NOT EXISTS operation_category TEXT DEFAULT 'services',
  ADD COLUMN IF NOT EXISTS service_period_start DATE,
  ADD COLUMN IF NOT EXISTS service_period_end DATE,
  ADD COLUMN IF NOT EXISTS e_invoice_status TEXT DEFAULT 'non_applicable',
  ADD COLUMN IF NOT EXISTS e_reporting_status TEXT DEFAULT 'non_applicable',
  ADD COLUMN IF NOT EXISTS platform_provider TEXT,
  ADD COLUMN IF NOT EXISTS platform_reference_id TEXT,
  ADD COLUMN IF NOT EXISTS platform_last_sync_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS platform_error_message TEXT,
  ADD COLUMN IF NOT EXISTS compliance_score INTEGER,
  ADD COLUMN IF NOT EXISTS compliance_issues JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_factures_e_invoice_status ON public.factures(e_invoice_status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_factures_compliance_score ON public.factures(compliance_score) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_factures_type_facture ON public.factures(type_facture) WHERE deleted_at IS NULL;

ALTER TABLE public.facture_lignes
  ADD COLUMN IF NOT EXISTS unite TEXT DEFAULT 'forfait',
  ADD COLUMN IF NOT EXISTS code_produit TEXT;

ALTER TABLE public.centre_formation
  ADD COLUMN IF NOT EXISTS forme_juridique TEXT,
  ADD COLUMN IF NOT EXISTS capital_social NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS code_naf TEXT,
  ADD COLUMN IF NOT EXISTS tva_intracom TEXT,
  ADD COLUMN IF NOT EXISTS regime_tva TEXT DEFAULT 'exonere_261_4_4_a',
  ADD COLUMN IF NOT EXISTS numero_da_formation TEXT,
  ADD COLUMN IF NOT EXISTS mention_exoneration_default TEXT
    DEFAULT 'TVA non applicable - article 261-4-4°a du CGI (organisme de formation)';

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS type_client TEXT DEFAULT 'particulier',
  ADD COLUMN IF NOT EXISTS email_facturation TEXT,
  ADD COLUMN IF NOT EXISTS accepte_facture_electronique BOOLEAN DEFAULT FALSE;

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS platform_provider TEXT,
  ADD COLUMN IF NOT EXISTS routing_code TEXT,
  ADD COLUMN IF NOT EXISTS email_facturation TEXT,
  ADD COLUMN IF NOT EXISTS regime_tva TEXT;

CREATE TABLE IF NOT EXISTS public.invoice_transmission_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  facture_id UUID NOT NULL REFERENCES public.factures(id) ON DELETE CASCADE,
  centre_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL,
  provider TEXT,
  request_payload JSONB,
  response_payload JSONB,
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_itl_facture ON public.invoice_transmission_logs(facture_id);
CREATE INDEX IF NOT EXISTS idx_itl_centre ON public.invoice_transmission_logs(centre_id);
CREATE INDEX IF NOT EXISTS idx_itl_created ON public.invoice_transmission_logs(created_at DESC);

ALTER TABLE public.invoice_transmission_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "itl_select_centre_members"
  ON public.invoice_transmission_logs FOR SELECT
  TO authenticated
  USING (
    centre_id IN (
      SELECT uc.centre_id FROM public.user_centres uc
      WHERE uc.user_id = auth.uid()
    )
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'staff'::public.app_role)
      OR public.is_super_admin()
    )
  );
