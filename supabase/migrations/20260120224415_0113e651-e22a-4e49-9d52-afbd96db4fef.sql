-- Fix RLS policies that use "true" for INSERT/UPDATE/DELETE operations
-- These need proper validation to prevent abuse

-- 1. Drop overly permissive policies for satisfaction_reponses and reclamations
DROP POLICY IF EXISTS "Anyone can submit satisfaction responses" ON public.satisfaction_reponses;
DROP POLICY IF EXISTS "Anyone can submit reclamations" ON public.reclamations;
DROP POLICY IF EXISTS "Anyone can mark token as used" ON public.enquete_tokens;

-- 2. Create secure RPC function for submitting satisfaction responses
-- This validates the token before allowing submission
CREATE OR REPLACE FUNCTION public.submit_satisfaction_with_token(
  p_token text,
  p_note_globale integer,
  p_note_formateur integer,
  p_note_supports integer,
  p_note_locaux integer,
  p_nps_score integer,
  p_objectifs_atteints text,
  p_commentaire text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_record RECORD;
  v_result_id uuid;
BEGIN
  -- Validate and get token data
  SELECT et.id, et.contact_id, et.session_id, et.type, et.expire_at, et.used_at
  INTO v_token_record
  FROM public.enquete_tokens et
  WHERE et.token = p_token;

  -- Check token exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token invalide');
  END IF;

  -- Check token type
  IF v_token_record.type != 'satisfaction' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token non valide pour ce type de formulaire');
  END IF;

  -- Check expiration
  IF v_token_record.expire_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ce lien a expiré');
  END IF;

  -- Check if already used
  IF v_token_record.used_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ce formulaire a déjà été rempli');
  END IF;

  -- Validate input lengths
  IF p_commentaire IS NOT NULL AND length(p_commentaire) > 2000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Le commentaire est trop long (max 2000 caractères)');
  END IF;

  -- Insert the satisfaction response
  INSERT INTO public.satisfaction_reponses (
    contact_id,
    session_id,
    type_questionnaire,
    note_globale,
    note_formateur,
    note_supports,
    note_locaux,
    nps_score,
    objectifs_atteints,
    commentaire
  ) VALUES (
    v_token_record.contact_id,
    v_token_record.session_id,
    'fin_formation',
    p_note_globale,
    p_note_formateur,
    p_note_supports,
    p_note_locaux,
    p_nps_score,
    p_objectifs_atteints,
    LEFT(p_commentaire, 2000) -- Enforce max length
  )
  RETURNING id INTO v_result_id;

  -- Mark token as used
  UPDATE public.enquete_tokens
  SET used_at = now()
  WHERE id = v_token_record.id;

  RETURN jsonb_build_object('success', true, 'id', v_result_id);
END;
$$;

-- 3. Create secure RPC function for submitting reclamations
CREATE OR REPLACE FUNCTION public.submit_reclamation_with_token(
  p_token text,
  p_titre text,
  p_description text,
  p_categorie text DEFAULT 'formation',
  p_priorite text DEFAULT 'moyenne'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_record RECORD;
  v_result_id uuid;
BEGIN
  -- Validate and get token data
  SELECT et.id, et.contact_id, et.session_id, et.type, et.expire_at, et.used_at
  INTO v_token_record
  FROM public.enquete_tokens et
  WHERE et.token = p_token;

  -- Check token exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token invalide');
  END IF;

  -- Check token type
  IF v_token_record.type != 'reclamation' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token non valide pour ce type de formulaire');
  END IF;

  -- Check expiration
  IF v_token_record.expire_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ce lien a expiré');
  END IF;

  -- Check if already used
  IF v_token_record.used_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ce formulaire a déjà été rempli');
  END IF;

  -- Validate required fields
  IF p_titre IS NULL OR length(trim(p_titre)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Le sujet est requis');
  END IF;
  
  IF p_description IS NULL OR length(trim(p_description)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'La description est requise');
  END IF;

  -- Validate input lengths
  IF length(p_titre) > 200 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Le sujet est trop long (max 200 caractères)');
  END IF;

  IF length(p_description) > 5000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'La description est trop longue (max 5000 caractères)');
  END IF;

  -- Insert the reclamation
  INSERT INTO public.reclamations (
    contact_id,
    session_id,
    titre,
    description,
    categorie,
    priorite
  ) VALUES (
    v_token_record.contact_id,
    v_token_record.session_id,
    LEFT(p_titre, 200),
    LEFT(p_description, 5000),
    p_categorie,
    p_priorite
  )
  RETURNING id INTO v_result_id;

  -- Mark token as used
  UPDATE public.enquete_tokens
  SET used_at = now()
  WHERE id = v_token_record.id;

  RETURN jsonb_build_object('success', true, 'id', v_result_id);
END;
$$;

-- 4. Grant execute permissions to anon and authenticated users
GRANT EXECUTE ON FUNCTION public.submit_satisfaction_with_token(text, integer, integer, integer, integer, integer, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_satisfaction_with_token(text, integer, integer, integer, integer, integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_reclamation_with_token(text, text, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_reclamation_with_token(text, text, text, text, text) TO authenticated;

-- 5. Fix the "Service role peut insérer audit" policy
-- This is for internal use by edge functions, restrict to service role only (which bypasses RLS anyway)
DROP POLICY IF EXISTS "Service role peut insérer audit" ON public.ai_actions_audit;

-- Edge functions use service role which bypasses RLS, so we can remove this policy entirely
-- The table already has proper SELECT policy for staff/admin

-- 6. Fix centre_formation read policy - restrict to authenticated staff/admin only
-- (SELECT with true was allowing unauthenticated reads)
DROP POLICY IF EXISTS "Authenticated users can read centre_formation" ON public.centre_formation;

CREATE POLICY "Staff can read centre_formation"
ON public.centre_formation
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'staff'::app_role)
);