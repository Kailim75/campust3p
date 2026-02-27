
-- 1. Function to check for duplicate contacts
CREATE OR REPLACE FUNCTION public.check_duplicate_contacts(
  p_nom text,
  p_prenom text,
  p_email text DEFAULT NULL,
  p_date_naissance text DEFAULT NULL,
  p_exclude_id uuid DEFAULT NULL
)
RETURNS TABLE(id uuid, nom text, prenom text, email text, date_naissance text, telephone text, formation text, match_type text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.nom,
    c.prenom,
    c.email,
    c.date_naissance,
    c.telephone,
    c.formation::text,
    CASE
      WHEN p_email IS NOT NULL AND c.email IS NOT NULL AND lower(trim(c.email)) = lower(trim(p_email)) THEN 'email'
      WHEN lower(trim(c.nom)) = lower(trim(p_nom)) 
           AND lower(trim(c.prenom)) = lower(trim(p_prenom))
           AND p_date_naissance IS NOT NULL 
           AND c.date_naissance IS NOT NULL
           AND c.date_naissance = p_date_naissance THEN 'nom_prenom_naissance'
      WHEN lower(trim(c.nom)) = lower(trim(p_nom)) 
           AND lower(trim(c.prenom)) = lower(trim(p_prenom)) THEN 'nom_prenom'
    END AS match_type
  FROM public.contacts c
  WHERE c.archived = false
    AND (p_exclude_id IS NULL OR c.id != p_exclude_id)
    AND (
      -- Match by email
      (p_email IS NOT NULL AND c.email IS NOT NULL AND lower(trim(c.email)) = lower(trim(p_email)))
      OR
      -- Match by nom + prenom
      (lower(trim(c.nom)) = lower(trim(p_nom)) AND lower(trim(c.prenom)) = lower(trim(p_prenom)))
    )
  ORDER BY 
    CASE 
      WHEN p_email IS NOT NULL AND c.email IS NOT NULL AND lower(trim(c.email)) = lower(trim(p_email)) THEN 1
      WHEN p_date_naissance IS NOT NULL AND c.date_naissance = p_date_naissance THEN 2
      ELSE 3
    END
  LIMIT 5;
END;
$$;

-- Grant execute to anon for RPC calls
GRANT EXECUTE ON FUNCTION public.check_duplicate_contacts TO anon;
GRANT EXECUTE ON FUNCTION public.check_duplicate_contacts TO authenticated;

-- 2. Function to reconcile orphan invoices with session inscriptions
CREATE OR REPLACE FUNCTION public.reconcile_factures_inscriptions()
RETURNS TABLE(facture_id uuid, numero_facture text, contact_id uuid, session_inscription_id uuid, session_nom text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Find factures without session_inscription_id that can be matched via contact_id
  RETURN QUERY
  WITH orphan_factures AS (
    SELECT f.id AS fid, f.numero_facture AS fnum, f.contact_id AS fcid
    FROM public.factures f
    WHERE f.session_inscription_id IS NULL
      AND f.statut != 'annulee'
  ),
  matched AS (
    SELECT DISTINCT ON (of.fid)
      of.fid,
      of.fnum,
      of.fcid,
      si.id AS si_id,
      s.nom AS s_nom
    FROM orphan_factures of
    JOIN public.session_inscriptions si ON si.contact_id = of.fcid
    JOIN public.sessions s ON s.id = si.session_id
    -- Only match if that inscription doesn't already have a facture
    LEFT JOIN public.factures f2 ON f2.session_inscription_id = si.id
    WHERE f2.id IS NULL
    ORDER BY of.fid, si.date_inscription DESC
  )
  UPDATE public.factures f
  SET session_inscription_id = m.si_id
  FROM matched m
  WHERE f.id = m.fid
  RETURNING f.id, f.numero_facture, f.contact_id, f.session_inscription_id, m.s_nom;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reconcile_factures_inscriptions TO authenticated;

-- 3. View for optimized session inscription counts
CREATE OR REPLACE VIEW public.session_inscription_counts AS
SELECT 
  session_id,
  count(*)::integer AS inscription_count
FROM public.session_inscriptions
GROUP BY session_id;
