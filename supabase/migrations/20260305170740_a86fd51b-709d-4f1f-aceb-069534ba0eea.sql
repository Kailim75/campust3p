
-- Drop old role-only policies on session_inscriptions
DROP POLICY IF EXISTS "Staff can select session_inscriptions" ON public.session_inscriptions;
DROP POLICY IF EXISTS "Staff can insert session_inscriptions" ON public.session_inscriptions;
DROP POLICY IF EXISTS "Staff can update session_inscriptions" ON public.session_inscriptions;
DROP POLICY IF EXISTS "Staff can delete session_inscriptions" ON public.session_inscriptions;

-- SELECT: centre-aware via sessions.centre_id
CREATE POLICY "centre_select_session_inscriptions" ON public.session_inscriptions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_inscriptions.session_id
        AND public.has_centre_access(s.centre_id)
    )
  );

-- INSERT: centre-aware + role check
CREATE POLICY "centre_insert_session_inscriptions" ON public.session_inscriptions
  FOR INSERT TO authenticated
  WITH CHECK (
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') OR public.is_super_admin())
    AND EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_inscriptions.session_id
        AND public.has_centre_access(s.centre_id)
    )
  );

-- UPDATE: centre-aware + role check
CREATE POLICY "centre_update_session_inscriptions" ON public.session_inscriptions
  FOR UPDATE TO authenticated
  USING (
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') OR public.is_super_admin())
    AND EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_inscriptions.session_id
        AND public.has_centre_access(s.centre_id)
    )
  )
  WITH CHECK (
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') OR public.is_super_admin())
    AND EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_inscriptions.session_id
        AND public.has_centre_access(s.centre_id)
    )
  );

-- DELETE: centre-aware + role check
CREATE POLICY "centre_delete_session_inscriptions" ON public.session_inscriptions
  FOR DELETE TO authenticated
  USING (
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') OR public.is_super_admin())
    AND EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_inscriptions.session_id
        AND public.has_centre_access(s.centre_id)
    )
  );
