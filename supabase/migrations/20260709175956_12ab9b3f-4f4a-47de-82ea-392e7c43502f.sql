
CREATE OR REPLACE FUNCTION public.get_centre_users(_centre_id uuid)
RETURNS TABLE (user_id uuid, label text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only members of the centre (or admins) may list its users
  IF NOT EXISTS (
    SELECT 1 FROM public.user_centres uc
    WHERE uc.centre_id = _centre_id AND uc.user_id = auth.uid()
  ) AND NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    uc.user_id,
    COALESCE(
      NULLIF(TRIM(BOTH FROM COALESCE(u.raw_user_meta_data->>'display_name','')), ''),
      NULLIF(TRIM(BOTH FROM COALESCE(u.raw_user_meta_data->>'full_name','')), ''),
      NULLIF(TRIM(BOTH FROM COALESCE(u.raw_user_meta_data->>'name','')), ''),
      u.email,
      LEFT(uc.user_id::text, 8)
    ) AS label
  FROM public.user_centres uc
  LEFT JOIN auth.users u ON u.id = uc.user_id
  WHERE uc.centre_id = _centre_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_centre_users(uuid) TO authenticated;
