-- Create a secure RPC function to validate learner portal tokens
-- This allows anonymous users to validate tokens without direct table access
CREATE OR REPLACE FUNCTION public.validate_learner_portal_token(p_token uuid)
RETURNS TABLE (
  contact_id uuid,
  contact_prenom text,
  contact_nom text,
  contact_formation text,
  expire_at timestamptz,
  used_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    et.contact_id,
    c.prenom AS contact_prenom,
    c.nom AS contact_nom,
    c.formation::text AS contact_formation,
    et.expire_at,
    et.used_at
  FROM enquete_tokens et
  JOIN contacts c ON c.id = et.contact_id
  WHERE et.token = p_token
    AND et.type = 'learner_portal';
END;
$$;