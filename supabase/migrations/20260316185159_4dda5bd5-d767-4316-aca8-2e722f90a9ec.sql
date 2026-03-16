ALTER TABLE public.emargements DROP CONSTRAINT IF EXISTS emargements_periode_check;

ALTER TABLE public.emargements
ADD CONSTRAINT emargements_periode_check
CHECK (periode = ANY (ARRAY['matin'::text, 'apres_midi'::text, 'soir'::text]));