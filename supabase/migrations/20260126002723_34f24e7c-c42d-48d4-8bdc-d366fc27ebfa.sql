-- Index SQL manquants pour améliorer les performances (identifiés dans l'audit)

-- Sessions: recherche par date et statut
CREATE INDEX IF NOT EXISTS idx_sessions_date_debut ON public.sessions(date_debut);
CREATE INDEX IF NOT EXISTS idx_sessions_statut ON public.sessions(statut);

-- Examens pratique: recherche par contact et date
CREATE INDEX IF NOT EXISTS idx_examens_pratique_contact_id ON public.examens_pratique(contact_id);
CREATE INDEX IF NOT EXISTS idx_examens_pratique_date_examen ON public.examens_pratique(date_examen);

-- Examens T3P: recherche par contact et date
CREATE INDEX IF NOT EXISTS idx_examens_t3p_contact_id ON public.examens_t3p(contact_id);
CREATE INDEX IF NOT EXISTS idx_examens_t3p_date_examen ON public.examens_t3p(date_examen);

-- Satisfaction: recherche par contact et session
CREATE INDEX IF NOT EXISTS idx_satisfaction_reponses_contact_id ON public.satisfaction_reponses(contact_id);
CREATE INDEX IF NOT EXISTS idx_satisfaction_reponses_session_id ON public.satisfaction_reponses(session_id);

-- Réclamations: recherche par contact et statut
CREATE INDEX IF NOT EXISTS idx_reclamations_contact_id ON public.reclamations(contact_id);
CREATE INDEX IF NOT EXISTS idx_reclamations_statut ON public.reclamations(statut);

-- Contact historique: améliorer les recherches de rappels
CREATE INDEX IF NOT EXISTS idx_contact_historique_date_rappel ON public.contact_historique(date_rappel) WHERE date_rappel IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contact_historique_alerte ON public.contact_historique(alerte_active) WHERE alerte_active = true;