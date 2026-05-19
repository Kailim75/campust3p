-- Remplace la contrainte d'unicité globale par un index unique partiel
-- pour ne bloquer que les inscriptions actives (non soft-deleted).
ALTER TABLE public.session_inscriptions
  DROP CONSTRAINT IF EXISTS session_inscriptions_session_id_contact_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS session_inscriptions_active_session_contact_uidx
  ON public.session_inscriptions (session_id, contact_id)
  WHERE deleted_at IS NULL;