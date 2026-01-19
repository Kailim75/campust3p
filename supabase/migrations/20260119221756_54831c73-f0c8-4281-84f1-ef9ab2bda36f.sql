-- ================================================================
-- PHASE 3: PERFORMANCE - Add missing indexes only
-- ================================================================

-- Add index on session_inscriptions.contact_id for faster inscription lookups
CREATE INDEX IF NOT EXISTS idx_session_inscriptions_contact_id 
  ON public.session_inscriptions(contact_id);

-- Add index on factures.contact_id for faster invoice lookups by contact
CREATE INDEX IF NOT EXISTS idx_factures_contact_id 
  ON public.factures(contact_id);

-- Add index on emargements.contact_id for faster attendance lookups
CREATE INDEX IF NOT EXISTS idx_emargements_contact_id 
  ON public.emargements(contact_id);

-- Add index on paiements.facture_id for faster payment lookups
CREATE INDEX IF NOT EXISTS idx_paiements_facture_id 
  ON public.paiements(facture_id);

-- Add composite index for sessions filtering
CREATE INDEX IF NOT EXISTS idx_sessions_statut_date 
  ON public.sessions(statut, date_debut);

-- Add index for contact documents
CREATE INDEX IF NOT EXISTS idx_contact_documents_contact_id 
  ON public.contact_documents(contact_id);

-- Add index for seances_conduite
CREATE INDEX IF NOT EXISTS idx_seances_conduite_fiche_id 
  ON public.seances_conduite(fiche_pratique_id);

-- Add index for examens_pratique
CREATE INDEX IF NOT EXISTS idx_examens_pratique_contact_id 
  ON public.examens_pratique(contact_id);

-- Add index for examens_t3p
CREATE INDEX IF NOT EXISTS idx_examens_t3p_contact_id 
  ON public.examens_t3p(contact_id);