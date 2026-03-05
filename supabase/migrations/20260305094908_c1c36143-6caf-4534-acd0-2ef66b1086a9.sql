
-- Create formation_track enum
CREATE TYPE public.formation_track AS ENUM ('initial', 'continuing');

-- Add track column to sessions
ALTER TABLE public.sessions
  ADD COLUMN track public.formation_track NOT NULL DEFAULT 'initial';

-- Add track column to session_inscriptions
ALTER TABLE public.session_inscriptions
  ADD COLUMN track public.formation_track NOT NULL DEFAULT 'initial';

-- Backfill sessions based on formation_type
UPDATE public.sessions
SET track = 'continuing'
WHERE formation_type IN ('Formation continue Taxi', 'Formation continue VTC', 'Mobilité Taxi');

-- Backfill session_inscriptions from their sessions
UPDATE public.session_inscriptions si
SET track = s.track
FROM public.sessions s
WHERE si.session_id = s.id;
