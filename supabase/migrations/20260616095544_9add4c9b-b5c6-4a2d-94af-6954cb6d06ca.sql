
DROP POLICY IF EXISTS "Admins can manage centre_formation" ON public.centre_formation;

CREATE POLICY "centre_formation_admin_insert"
ON public.centre_formation
FOR INSERT
TO authenticated
WITH CHECK (
  is_super_admin()
  OR (has_role(auth.uid(), 'admin'::app_role) AND has_centre_access(id))
);

CREATE POLICY "centre_formation_admin_update"
ON public.centre_formation
FOR UPDATE
TO authenticated
USING (
  is_super_admin()
  OR (has_role(auth.uid(), 'admin'::app_role) AND has_centre_access(id))
)
WITH CHECK (
  is_super_admin()
  OR (has_role(auth.uid(), 'admin'::app_role) AND has_centre_access(id))
);

CREATE POLICY "centre_formation_admin_delete"
ON public.centre_formation
FOR DELETE
TO authenticated
USING (
  is_super_admin()
  OR (has_role(auth.uid(), 'admin'::app_role) AND has_centre_access(id))
);

DROP POLICY IF EXISTS "pdp_tx_insert_by_centre" ON public.facture_pdp_transmissions;
DROP POLICY IF EXISTS "pdp_tx_update_by_centre" ON public.facture_pdp_transmissions;

CREATE POLICY "pdp_tx_insert_by_centre"
ON public.facture_pdp_transmissions
FOR INSERT
TO authenticated
WITH CHECK (
  has_centre_access(centre_id)
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'staff'::app_role)
    OR is_super_admin()
  )
);

CREATE POLICY "pdp_tx_update_by_centre"
ON public.facture_pdp_transmissions
FOR UPDATE
TO authenticated
USING (
  has_centre_access(centre_id)
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'staff'::app_role)
    OR is_super_admin()
  )
)
WITH CHECK (
  has_centre_access(centre_id)
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'staff'::app_role)
    OR is_super_admin()
  )
);

DROP POLICY IF EXISTS "Centre read gen_docs" ON public.generated_documents_v2;

CREATE POLICY "Centre read gen_docs"
ON public.generated_documents_v2
FOR SELECT
TO authenticated
USING (
  has_centre_access(centre_id)
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'staff'::app_role)
    OR is_super_admin()
    OR (
      has_role(auth.uid(), 'formateur'::app_role)
      AND session_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.sessions s
        WHERE s.id = generated_documents_v2.session_id
          AND s.formateur_id = get_user_formateur_id()
      )
    )
  )
);

DROP POLICY IF EXISTS "centre_select_session_inscriptions" ON public.session_inscriptions;

CREATE POLICY "centre_select_session_inscriptions"
ON public.session_inscriptions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = session_inscriptions.session_id
      AND has_centre_access(s.centre_id)
      AND (
        has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'staff'::app_role)
        OR is_super_admin()
        OR (
          has_role(auth.uid(), 'formateur'::app_role)
          AND s.formateur_id = get_user_formateur_id()
        )
      )
  )
);

DROP POLICY IF EXISTS "produits_photos_public_read" ON storage.objects;

CREATE POLICY "produits_photos_authenticated_read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'produits-photos'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'staff'::app_role)
    OR has_role(auth.uid(), 'formateur'::app_role)
    OR is_super_admin()
  )
);
