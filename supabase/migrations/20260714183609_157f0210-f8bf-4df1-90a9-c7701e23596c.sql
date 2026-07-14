CREATE INDEX IF NOT EXISTS idx_signature_requests_contact_id ON public.signature_requests(contact_id);
CREATE INDEX IF NOT EXISTS idx_signature_requests_statut ON public.signature_requests(statut);
CREATE INDEX IF NOT EXISTS idx_factures_statut_date_echeance ON public.factures(statut, date_echeance);