
-- =============================
-- contacts (4)
-- =============================
ALTER POLICY centre_delete_contacts ON public.contacts
  USING (has_centre_access(centre_id) AND ((SELECT has_role(auth.uid(), 'admin'::app_role)) OR (SELECT has_role(auth.uid(), 'staff'::app_role))));

ALTER POLICY centre_insert_contacts ON public.contacts
  WITH CHECK ((centre_id IS NOT NULL) AND has_centre_access(centre_id) AND ((SELECT has_role(auth.uid(), 'admin'::app_role)) OR (SELECT has_role(auth.uid(), 'staff'::app_role))));

ALTER POLICY centre_select_contacts ON public.contacts
  USING (has_centre_access(centre_id) AND ((SELECT has_role(auth.uid(), 'admin'::app_role)) OR (SELECT has_role(auth.uid(), 'staff'::app_role))));

ALTER POLICY centre_update_contacts ON public.contacts
  USING (has_centre_access(centre_id) AND ((SELECT has_role(auth.uid(), 'admin'::app_role)) OR (SELECT has_role(auth.uid(), 'staff'::app_role))))
  WITH CHECK ((centre_id IS NOT NULL) AND has_centre_access(centre_id) AND ((SELECT has_role(auth.uid(), 'admin'::app_role)) OR (SELECT has_role(auth.uid(), 'staff'::app_role))));

-- =============================
-- contact_documents (4)
-- =============================
ALTER POLICY contact_documents_delete ON public.contact_documents
  USING ((SELECT is_admin_or_staff()) AND has_contact_centre_access(contact_id));

ALTER POLICY contact_documents_insert ON public.contact_documents
  WITH CHECK ((SELECT is_admin_or_staff()) AND has_contact_centre_access(contact_id));

ALTER POLICY contact_documents_select ON public.contact_documents
  USING ((SELECT is_admin_or_staff()) AND has_contact_centre_access(contact_id));

ALTER POLICY contact_documents_update ON public.contact_documents
  USING ((SELECT is_admin_or_staff()) AND has_contact_centre_access(contact_id))
  WITH CHECK ((SELECT is_admin_or_staff()) AND has_contact_centre_access(contact_id));

-- =============================
-- contact_historique (4)
-- =============================
ALTER POLICY contact_historique_delete ON public.contact_historique
  USING ((SELECT is_admin_or_staff()) AND has_contact_centre_access(contact_id));

ALTER POLICY contact_historique_insert ON public.contact_historique
  WITH CHECK ((SELECT is_admin_or_staff()) AND has_contact_centre_access(contact_id));

ALTER POLICY contact_historique_select ON public.contact_historique
  USING ((SELECT is_admin_or_staff()) AND has_contact_centre_access(contact_id));

ALTER POLICY contact_historique_update ON public.contact_historique
  USING ((SELECT is_admin_or_staff()) AND has_contact_centre_access(contact_id))
  WITH CHECK ((SELECT is_admin_or_staff()) AND has_contact_centre_access(contact_id));

-- =============================
-- examens_t3p (4)
-- =============================
ALTER POLICY examens_t3p_delete ON public.examens_t3p
  USING ((SELECT is_admin_or_staff()) AND has_contact_centre_access(contact_id));

ALTER POLICY examens_t3p_insert ON public.examens_t3p
  WITH CHECK ((SELECT is_admin_or_staff()) AND has_contact_centre_access(contact_id));

ALTER POLICY examens_t3p_select ON public.examens_t3p
  USING ((SELECT is_admin_or_staff()) AND has_contact_centre_access(contact_id));

ALTER POLICY examens_t3p_update ON public.examens_t3p
  USING ((SELECT is_admin_or_staff()) AND has_contact_centre_access(contact_id))
  WITH CHECK ((SELECT is_admin_or_staff()) AND has_contact_centre_access(contact_id));

-- =============================
-- examens_pratique (4)
-- =============================
ALTER POLICY examens_pratique_delete ON public.examens_pratique
  USING ((SELECT is_admin_or_staff()) AND has_contact_centre_access(contact_id));

ALTER POLICY examens_pratique_insert ON public.examens_pratique
  WITH CHECK ((SELECT is_admin_or_staff()) AND has_contact_centre_access(contact_id));

ALTER POLICY examens_pratique_select ON public.examens_pratique
  USING ((SELECT is_admin_or_staff()) AND has_contact_centre_access(contact_id));

ALTER POLICY examens_pratique_update ON public.examens_pratique
  USING ((SELECT is_admin_or_staff()) AND has_contact_centre_access(contact_id))
  WITH CHECK ((SELECT is_admin_or_staff()) AND has_contact_centre_access(contact_id));

-- =============================
-- factures (4)
-- =============================
ALTER POLICY centre_delete_factures ON public.factures
  USING (has_centre_access(centre_id) AND ((SELECT has_role(auth.uid(), 'admin'::app_role)) OR (SELECT has_role(auth.uid(), 'staff'::app_role))));

ALTER POLICY centre_insert_factures ON public.factures
  WITH CHECK ((centre_id IS NOT NULL) AND has_centre_access(centre_id) AND ((SELECT has_role(auth.uid(), 'admin'::app_role)) OR (SELECT has_role(auth.uid(), 'staff'::app_role))));

ALTER POLICY centre_select_factures ON public.factures
  USING (has_centre_access(centre_id) AND ((SELECT has_role(auth.uid(), 'admin'::app_role)) OR (SELECT has_role(auth.uid(), 'staff'::app_role))));

ALTER POLICY centre_update_factures ON public.factures
  USING (has_centre_access(centre_id) AND ((SELECT has_role(auth.uid(), 'admin'::app_role)) OR (SELECT has_role(auth.uid(), 'staff'::app_role))))
  WITH CHECK ((centre_id IS NOT NULL) AND has_centre_access(centre_id) AND ((SELECT has_role(auth.uid(), 'admin'::app_role)) OR (SELECT has_role(auth.uid(), 'staff'::app_role))));

-- =============================
-- paiements (4)
-- =============================
ALTER POLICY paiements_delete ON public.paiements
  USING ((SELECT is_admin_or_staff()) AND has_facture_centre_access(facture_id));

ALTER POLICY paiements_insert ON public.paiements
  WITH CHECK ((SELECT is_admin_or_staff()) AND has_facture_centre_access(facture_id));

ALTER POLICY paiements_select ON public.paiements
  USING ((SELECT is_admin_or_staff()) AND has_facture_centre_access(facture_id));

ALTER POLICY paiements_update ON public.paiements
  USING ((SELECT is_admin_or_staff()) AND has_facture_centre_access(facture_id))
  WITH CHECK ((SELECT is_admin_or_staff()) AND has_facture_centre_access(facture_id));

-- =============================
-- sessions (4)
-- =============================
ALTER POLICY centre_delete_sessions ON public.sessions
  USING (has_centre_access(centre_id) AND ((SELECT has_role(auth.uid(), 'admin'::app_role)) OR (SELECT has_role(auth.uid(), 'staff'::app_role))));

ALTER POLICY centre_insert_sessions ON public.sessions
  WITH CHECK ((centre_id IS NOT NULL) AND has_centre_access(centre_id) AND ((SELECT has_role(auth.uid(), 'admin'::app_role)) OR (SELECT has_role(auth.uid(), 'staff'::app_role))));

ALTER POLICY centre_select_sessions ON public.sessions
  USING (has_centre_access(centre_id) AND ((SELECT has_role(auth.uid(), 'admin'::app_role)) OR (SELECT has_role(auth.uid(), 'staff'::app_role)) OR (SELECT has_role(auth.uid(), 'formateur'::app_role))));

ALTER POLICY centre_update_sessions ON public.sessions
  USING (has_centre_access(centre_id) AND ((SELECT has_role(auth.uid(), 'admin'::app_role)) OR (SELECT has_role(auth.uid(), 'staff'::app_role))))
  WITH CHECK ((centre_id IS NOT NULL) AND has_centre_access(centre_id) AND ((SELECT has_role(auth.uid(), 'admin'::app_role)) OR (SELECT has_role(auth.uid(), 'staff'::app_role))));

-- =============================
-- session_inscriptions (4)
-- =============================
ALTER POLICY centre_delete_session_inscriptions ON public.session_inscriptions
  USING (
    ((SELECT has_role(auth.uid(), 'admin'::app_role)) OR (SELECT has_role(auth.uid(), 'staff'::app_role)) OR (SELECT is_super_admin()))
    AND EXISTS (SELECT 1 FROM sessions s WHERE s.id = session_inscriptions.session_id AND has_centre_access(s.centre_id))
  );

ALTER POLICY centre_insert_session_inscriptions ON public.session_inscriptions
  WITH CHECK (
    ((SELECT has_role(auth.uid(), 'admin'::app_role)) OR (SELECT has_role(auth.uid(), 'staff'::app_role)) OR (SELECT is_super_admin()))
    AND EXISTS (SELECT 1 FROM sessions s WHERE s.id = session_inscriptions.session_id AND has_centre_access(s.centre_id))
  );

ALTER POLICY centre_select_session_inscriptions ON public.session_inscriptions
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = session_inscriptions.session_id
        AND has_centre_access(s.centre_id)
        AND (
          (SELECT has_role(auth.uid(), 'admin'::app_role))
          OR (SELECT has_role(auth.uid(), 'staff'::app_role))
          OR (SELECT is_super_admin())
          OR ((SELECT has_role(auth.uid(), 'formateur'::app_role)) AND s.formateur_id = (SELECT get_user_formateur_id()))
        )
    )
  );

ALTER POLICY centre_update_session_inscriptions ON public.session_inscriptions
  USING (
    ((SELECT has_role(auth.uid(), 'admin'::app_role)) OR (SELECT has_role(auth.uid(), 'staff'::app_role)) OR (SELECT is_super_admin()))
    AND EXISTS (SELECT 1 FROM sessions s WHERE s.id = session_inscriptions.session_id AND has_centre_access(s.centre_id))
  )
  WITH CHECK (
    ((SELECT has_role(auth.uid(), 'admin'::app_role)) OR (SELECT has_role(auth.uid(), 'staff'::app_role)) OR (SELECT is_super_admin()))
    AND EXISTS (SELECT 1 FROM sessions s WHERE s.id = session_inscriptions.session_id AND has_centre_access(s.centre_id))
  );

-- =============================
-- prospects (3)
-- =============================
ALTER POLICY "Admin access prospects by centre" ON public.prospects
  USING ((SELECT has_role(auth.uid(), 'admin'::app_role)) AND has_centre_access(centre_id))
  WITH CHECK ((SELECT has_role(auth.uid(), 'admin'::app_role)) AND has_centre_access(centre_id));

ALTER POLICY "Staff access prospects by centre" ON public.prospects
  USING ((SELECT has_role(auth.uid(), 'staff'::app_role)) AND has_centre_access(centre_id))
  WITH CHECK ((SELECT has_role(auth.uid(), 'staff'::app_role)) AND has_centre_access(centre_id));

ALTER POLICY "Super admin full access prospects" ON public.prospects
  USING ((SELECT is_super_admin()))
  WITH CHECK ((SELECT is_super_admin()));
