ALTER TABLE public.examens_t3p
ADD COLUMN IF NOT EXISTS date_resultat_recu date,
ADD COLUMN IF NOT EXISTS date_convocation_pratique_recue date;

ALTER TABLE public.examens_pratique
ADD COLUMN IF NOT EXISTS date_resultat_recu date;

ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS email_interne text,
ADD COLUMN IF NOT EXISTS email_interne_consulte_le timestamptz;