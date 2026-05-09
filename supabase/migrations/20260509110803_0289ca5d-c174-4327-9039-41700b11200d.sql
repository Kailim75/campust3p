
-- Ajouter les champs de facturation B2B aux partenaires
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS siret TEXT,
  ADD COLUMN IF NOT EXISTS tva_intracom TEXT,
  ADD COLUMN IF NOT EXISTS code_postal TEXT,
  ADD COLUMN IF NOT EXISTS ville TEXT;

-- Permettre une facture sans contact apprenant (client entreprise)
ALTER TABLE public.factures
  ALTER COLUMN contact_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS client_partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_factures_client_partner_id
  ON public.factures(client_partner_id) WHERE client_partner_id IS NOT NULL;

-- Au moins un destinataire de facturation requis
ALTER TABLE public.factures
  DROP CONSTRAINT IF EXISTS factures_client_required;
ALTER TABLE public.factures
  ADD CONSTRAINT factures_client_required
  CHECK (contact_id IS NOT NULL OR client_partner_id IS NOT NULL);
