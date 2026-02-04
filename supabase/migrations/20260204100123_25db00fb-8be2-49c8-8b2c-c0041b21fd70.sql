-- Ajout des colonnes d'archivage à la table sessions
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS archived_by uuid REFERENCES auth.users(id);

-- Index pour optimiser les requêtes sur les sessions actives/archivées
CREATE INDEX IF NOT EXISTS idx_sessions_archived ON public.sessions(archived);
CREATE INDEX IF NOT EXISTS idx_sessions_archived_at ON public.sessions(archived_at) WHERE archived = true;

-- Fonction pour archiver une session (avec vérification de la date de fin)
CREATE OR REPLACE FUNCTION public.archive_session(p_session_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_date_fin date;
BEGIN
  -- Vérifier que la session existe et récupérer la date de fin
  SELECT date_fin INTO v_date_fin
  FROM public.sessions
  WHERE id = p_session_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session non trouvée';
  END IF;
  
  -- Vérifier que la date de fin est dépassée
  IF v_date_fin > CURRENT_DATE THEN
    RAISE EXCEPTION 'Impossible d''archiver une session dont la date de fin n''est pas dépassée';
  END IF;
  
  -- Archiver la session
  UPDATE public.sessions
  SET 
    archived = true,
    archived_at = now(),
    archived_by = auth.uid()
  WHERE id = p_session_id
    AND archived = false;
  
  RETURN FOUND;
END;
$$;

-- Fonction pour désarchiver une session
CREATE OR REPLACE FUNCTION public.unarchive_session(p_session_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.sessions
  SET 
    archived = false,
    archived_at = null,
    archived_by = null
  WHERE id = p_session_id
    AND archived = true;
  
  RETURN FOUND;
END;
$$;