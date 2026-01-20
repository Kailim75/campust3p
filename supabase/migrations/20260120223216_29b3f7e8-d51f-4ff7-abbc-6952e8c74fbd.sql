-- Fix the validate_enquete_token function with correct type (text, not uuid)
DROP FUNCTION IF EXISTS public.validate_enquete_token(uuid);

CREATE OR REPLACE FUNCTION public.validate_enquete_token(p_token text)
RETURNS TABLE (
  id uuid,
  token text,
  contact_id uuid,
  session_id uuid,
  type text,
  expire_at timestamptz,
  used_at timestamptz,
  created_at timestamptz,
  contact_nom text,
  contact_prenom text,
  contact_email text,
  session_nom text,
  session_formation_type text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    et.id,
    et.token,
    et.contact_id,
    et.session_id,
    et.type,
    et.expire_at,
    et.used_at,
    et.created_at,
    c.nom AS contact_nom,
    c.prenom AS contact_prenom,
    c.email AS contact_email,
    s.nom AS session_nom,
    s.formation_type AS session_formation_type
  FROM public.enquete_tokens et
  LEFT JOIN public.contacts c ON c.id = et.contact_id
  LEFT JOIN public.sessions s ON s.id = et.session_id
  WHERE et.token = p_token;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.validate_enquete_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_enquete_token(text) TO authenticated;