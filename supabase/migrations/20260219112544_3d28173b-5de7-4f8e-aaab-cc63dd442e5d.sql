
-- Index SQL manquants pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_sessions_date_debut ON public.sessions(date_debut);
CREATE INDEX IF NOT EXISTS idx_sessions_statut ON public.sessions(statut);
CREATE INDEX IF NOT EXISTS idx_examens_pratique_contact_id ON public.examens_pratique(contact_id);
CREATE INDEX IF NOT EXISTS idx_examens_t3p_contact_id ON public.examens_t3p(contact_id);
CREATE INDEX IF NOT EXISTS idx_examens_t3p_date_examen ON public.examens_t3p(date_examen);
CREATE INDEX IF NOT EXISTS idx_satisfaction_reponses_contact_id ON public.satisfaction_reponses(contact_id);
CREATE INDEX IF NOT EXISTS idx_satisfaction_reponses_session_id ON public.satisfaction_reponses(session_id);
CREATE INDEX IF NOT EXISTS idx_reclamations_contact_id ON public.reclamations(contact_id);
CREATE INDEX IF NOT EXISTS idx_reclamations_statut ON public.reclamations(statut);
CREATE INDEX IF NOT EXISTS idx_factures_contact_id ON public.factures(contact_id);
CREATE INDEX IF NOT EXISTS idx_session_inscriptions_session_id ON public.session_inscriptions(session_id);
CREATE INDEX IF NOT EXISTS idx_session_inscriptions_contact_id ON public.session_inscriptions(contact_id);
