-- Ajouter les champs horaires matin/après-midi avec pause déjeuner
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS heure_debut_matin TIME DEFAULT '09:00:00',
ADD COLUMN IF NOT EXISTS heure_fin_matin TIME DEFAULT '12:30:00',
ADD COLUMN IF NOT EXISTS heure_debut_aprem TIME DEFAULT '13:30:00',
ADD COLUMN IF NOT EXISTS heure_fin_aprem TIME DEFAULT '17:00:00';

-- Commentaire pour clarifier l'usage
COMMENT ON COLUMN public.sessions.heure_debut_matin IS 'Heure de début de la session du matin';
COMMENT ON COLUMN public.sessions.heure_fin_matin IS 'Heure de fin de la session du matin (pause déjeuner)';
COMMENT ON COLUMN public.sessions.heure_debut_aprem IS 'Heure de reprise après la pause déjeuner';
COMMENT ON COLUMN public.sessions.heure_fin_aprem IS 'Heure de fin de la session de l''après-midi';