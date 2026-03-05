
CREATE OR REPLACE FUNCTION public.admin_recalc_track_for_catalogue(
  p_catalogue_id uuid,
  p_recalc_inscriptions boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_track public.formation_track;
  v_updated_sessions integer;
  v_updated_inscriptions integer := 0;
BEGIN
  -- Auth: admin or staff only
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')) THEN
    RAISE EXCEPTION 'Accès refusé: rôle admin ou staff requis';
  END IF;

  -- Read catalogue track
  SELECT cf.track INTO v_track
  FROM public.catalogue_formations cf
  WHERE cf.id = p_catalogue_id;

  IF v_track IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Catalogue introuvable ou track null');
  END IF;

  -- Update sessions
  UPDATE public.sessions s
  SET track = v_track
  WHERE s.catalogue_formation_id = p_catalogue_id
    AND s.track IS DISTINCT FROM v_track;
  GET DIAGNOSTICS v_updated_sessions = ROW_COUNT;

  -- Update inscriptions
  IF p_recalc_inscriptions THEN
    UPDATE public.session_inscriptions si
    SET track = v_track
    FROM public.sessions s
    WHERE si.session_id = s.id
      AND s.catalogue_formation_id = p_catalogue_id
      AND si.track IS DISTINCT FROM v_track;
    GET DIAGNOSTICS v_updated_inscriptions = ROW_COUNT;
  END IF;

  -- Audit log
  INSERT INTO public.audit_logs (table_name, record_id, action, new_data, user_id, user_email)
  VALUES (
    'catalogue_formations',
    p_catalogue_id,
    'catalogue_track_recalc',
    jsonb_build_object(
      'track', v_track,
      'updated_sessions', v_updated_sessions,
      'updated_inscriptions', v_updated_inscriptions,
      'recalc_inscriptions', p_recalc_inscriptions
    ),
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid())
  );

  RETURN jsonb_build_object(
    'success', true,
    'track', v_track,
    'updated_sessions', v_updated_sessions,
    'updated_inscriptions', v_updated_inscriptions
  );
END;
$$;
