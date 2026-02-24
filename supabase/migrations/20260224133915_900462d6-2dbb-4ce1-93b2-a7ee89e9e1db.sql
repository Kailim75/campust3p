
-- Ajouter une contrainte check sur type_carte pour cohérence avec les types de formation
-- Les types de carte pro correspondent aux métiers T3P
ALTER TABLE public.cartes_professionnelles 
  ADD COLUMN IF NOT EXISTS formation_type text;

-- Ajouter un commentaire pour documenter les valeurs attendues
COMMENT ON COLUMN public.cartes_professionnelles.type_carte IS 'Type de carte professionnelle: taxi, vtc, vmdtr';
COMMENT ON COLUMN public.cartes_professionnelles.formation_type IS 'Type de formation associé (taxi, vtc, vmdtr) pour lier aux sessions';

-- Créer un index pour rechercher rapidement les cartes par contact et type
CREATE INDEX IF NOT EXISTS idx_cartes_pro_contact_type 
  ON public.cartes_professionnelles(contact_id, type_carte);

-- Fonction pour récupérer la carte pro d'un contact selon le type de formation
CREATE OR REPLACE FUNCTION public.get_carte_pro_for_formation(p_contact_id uuid, p_formation_type text)
RETURNS TABLE(
  numero_carte text,
  prefecture text,
  date_obtention date,
  date_expiration date,
  type_carte text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_type text;
BEGIN
  -- Normaliser le type de formation vers le type de carte
  v_type := CASE 
    WHEN p_formation_type ILIKE '%taxi%' THEN 'taxi'
    WHEN p_formation_type ILIKE '%vtc%' THEN 'vtc'
    WHEN p_formation_type ILIKE '%vmdtr%' THEN 'vmdtr'
    ELSE lower(p_formation_type)
  END;
  
  RETURN QUERY
  SELECT cp.numero_carte, cp.prefecture, cp.date_obtention, cp.date_expiration, cp.type_carte
  FROM public.cartes_professionnelles cp
  WHERE cp.contact_id = p_contact_id
    AND (cp.type_carte = v_type OR cp.formation_type = p_formation_type)
    AND cp.statut != 'annulee'
  ORDER BY cp.date_obtention DESC NULLS LAST
  LIMIT 1;
END;
$$;
