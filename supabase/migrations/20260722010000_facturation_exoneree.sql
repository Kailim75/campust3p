-- Repassage sans frais (règle métier du 22/07/2026) : un apprenant qui a payé
-- sa formation puis échoué est replacé sur une session ultérieure SANS
-- refacturation. Cette inscription doit être exclue de toutes les surfaces de
-- facturation (bouton « Facturer les non-facturés », potentiel, manque à
-- facturer) au lieu d'y apparaître comme « non facturée ».
ALTER TABLE public.session_inscriptions
  ADD COLUMN IF NOT EXISTS facturation_exoneree boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS facturation_exoneree_motif text;

COMMENT ON COLUMN public.session_inscriptions.facturation_exoneree IS
  'Inscription exclue de la facturation (repassage déjà payé, geste commercial…) — décision manuelle de l''équipe.';
COMMENT ON COLUMN public.session_inscriptions.facturation_exoneree_motif IS
  'Motif court affiché dans l''UI (ex. « Repassage — formation déjà payée sur S2026-0011 »).';
