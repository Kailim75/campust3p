
-- ============================================================
-- Security hardening: enforce centre scoping across many tables
-- ============================================================

-- ---------- Helper security-definer functions ----------
CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(),'admin'::app_role)
      OR public.has_role(auth.uid(),'staff'::app_role)
      OR public.is_super_admin();
$$;

CREATE OR REPLACE FUNCTION public.has_contact_centre_access(_contact_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contacts c
    WHERE c.id = _contact_id AND public.has_centre_access(c.centre_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.has_session_centre_access(_session_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = _session_id AND public.has_centre_access(s.centre_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.has_facture_centre_access(_facture_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.factures f
    WHERE f.id = _facture_id AND public.has_centre_access(f.centre_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.has_devis_centre_access(_devis_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.devis d
    WHERE d.id = _devis_id AND public.has_centre_access(d.centre_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.has_formateur_centre_access(_formateur_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.formateurs f
    WHERE f.id = _formateur_id AND public.has_centre_access(f.centre_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.has_prospect_centre_access(_prospect_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.prospects p
    WHERE p.id = _prospect_id AND public.has_centre_access(p.centre_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.has_indicateur_centre_access(_indicateur_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.qualiopi_indicateurs i
    WHERE i.id = _indicateur_id AND public.has_centre_access(i.centre_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.has_examen_pratique_centre_access(_examen_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.examens_pratique e
    JOIN public.contacts c ON c.id = e.contact_id
    WHERE e.id = _examen_id AND public.has_centre_access(c.centre_id)
  );
$$;

-- ---------- chevalets ----------
DROP POLICY IF EXISTS "Admin full access chevalets" ON public.chevalets;
DROP POLICY IF EXISTS "Staff full access chevalets" ON public.chevalets;
CREATE POLICY chevalets_select ON public.chevalets FOR SELECT TO authenticated
  USING (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id));
CREATE POLICY chevalets_insert ON public.chevalets FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id));
CREATE POLICY chevalets_update ON public.chevalets FOR UPDATE TO authenticated
  USING (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id))
  WITH CHECK (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id));
CREATE POLICY chevalets_delete ON public.chevalets FOR DELETE TO authenticated
  USING (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id));

-- ---------- contact_partners ----------
DROP POLICY IF EXISTS "Admin full access contact_partners" ON public.contact_partners;
DROP POLICY IF EXISTS "Staff full access contact_partners" ON public.contact_partners;
CREATE POLICY contact_partners_select ON public.contact_partners FOR SELECT TO authenticated
  USING (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id));
CREATE POLICY contact_partners_insert ON public.contact_partners FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id));
CREATE POLICY contact_partners_update ON public.contact_partners FOR UPDATE TO authenticated
  USING (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id))
  WITH CHECK (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id));
CREATE POLICY contact_partners_delete ON public.contact_partners FOR DELETE TO authenticated
  USING (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id));

-- ---------- leads (fix public role) ----------
DROP POLICY IF EXISTS "Admin/staff can insert leads" ON public.leads;
CREATE POLICY "Admin/staff can insert leads" ON public.leads FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_staff());

-- ---------- pedagogical_documents ----------
DROP POLICY IF EXISTS "Admin full access pedagogical_documents" ON public.pedagogical_documents;
DROP POLICY IF EXISTS "Staff full access pedagogical_documents" ON public.pedagogical_documents;
CREATE POLICY pedagogical_documents_select ON public.pedagogical_documents FOR SELECT TO authenticated
  USING (public.is_admin_or_staff() AND (
    (contact_id IS NOT NULL AND public.has_contact_centre_access(contact_id))
    OR (session_id IS NOT NULL AND public.has_session_centre_access(session_id))
  ));
CREATE POLICY pedagogical_documents_insert ON public.pedagogical_documents FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_staff() AND (
    (contact_id IS NOT NULL AND public.has_contact_centre_access(contact_id))
    OR (session_id IS NOT NULL AND public.has_session_centre_access(session_id))
  ));
CREATE POLICY pedagogical_documents_update ON public.pedagogical_documents FOR UPDATE TO authenticated
  USING (public.is_admin_or_staff() AND (
    (contact_id IS NOT NULL AND public.has_contact_centre_access(contact_id))
    OR (session_id IS NOT NULL AND public.has_session_centre_access(session_id))
  ))
  WITH CHECK (public.is_admin_or_staff() AND (
    (contact_id IS NOT NULL AND public.has_contact_centre_access(contact_id))
    OR (session_id IS NOT NULL AND public.has_session_centre_access(session_id))
  ));
CREATE POLICY pedagogical_documents_delete ON public.pedagogical_documents FOR DELETE TO authenticated
  USING (public.is_admin_or_staff() AND (
    (contact_id IS NOT NULL AND public.has_contact_centre_access(contact_id))
    OR (session_id IS NOT NULL AND public.has_session_centre_access(session_id))
  ));

-- ---------- produit_tarifs: add role check on SELECT ----------
DROP POLICY IF EXISTS produit_tarifs_select ON public.produit_tarifs;
CREATE POLICY produit_tarifs_select ON public.produit_tarifs FOR SELECT TO authenticated
  USING (public.is_admin_or_staff() AND EXISTS (
    SELECT 1 FROM public.produits_services p
    WHERE p.id = produit_tarifs.produit_id AND public.has_centre_access(p.centre_id)
  ));

-- ---------- produits_services: add role check on SELECT ----------
DROP POLICY IF EXISTS produits_services_select ON public.produits_services;
CREATE POLICY produits_services_select ON public.produits_services FOR SELECT TO authenticated
  USING (public.is_admin_or_staff() AND public.has_centre_access(centre_id));

-- =====================================================================
-- Many-global-role tables: add centre scoping to existing role policies
-- =====================================================================

-- ---------- emargements (via session_id) ----------
DROP POLICY IF EXISTS "Staff can select emargements" ON public.emargements;
DROP POLICY IF EXISTS "Staff can insert emargements" ON public.emargements;
DROP POLICY IF EXISTS "Staff can update emargements" ON public.emargements;
DROP POLICY IF EXISTS "Staff can delete emargements" ON public.emargements;
CREATE POLICY emargements_select ON public.emargements FOR SELECT TO authenticated
  USING (public.is_admin_or_staff() AND public.has_session_centre_access(session_id));
CREATE POLICY emargements_insert ON public.emargements FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_staff() AND public.has_session_centre_access(session_id));
CREATE POLICY emargements_update ON public.emargements FOR UPDATE TO authenticated
  USING (public.is_admin_or_staff() AND public.has_session_centre_access(session_id))
  WITH CHECK (public.is_admin_or_staff() AND public.has_session_centre_access(session_id));
CREATE POLICY emargements_delete ON public.emargements FOR DELETE TO authenticated
  USING (public.is_admin_or_staff() AND public.has_session_centre_access(session_id));

-- ---------- cartes_professionnelles ----------
DROP POLICY IF EXISTS auth_select_cartes_pro ON public.cartes_professionnelles;
DROP POLICY IF EXISTS auth_insert_cartes_pro ON public.cartes_professionnelles;
DROP POLICY IF EXISTS auth_update_cartes_pro ON public.cartes_professionnelles;
DROP POLICY IF EXISTS auth_delete_cartes_pro ON public.cartes_professionnelles;
CREATE POLICY cartes_pro_select ON public.cartes_professionnelles FOR SELECT TO authenticated
  USING (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id));
CREATE POLICY cartes_pro_insert ON public.cartes_professionnelles FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id));
CREATE POLICY cartes_pro_update ON public.cartes_professionnelles FOR UPDATE TO authenticated
  USING (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id))
  WITH CHECK (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id));
CREATE POLICY cartes_pro_delete ON public.cartes_professionnelles FOR DELETE TO authenticated
  USING (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id));

-- ---------- examens_pratique ----------
DROP POLICY IF EXISTS auth_select_examens_pratique ON public.examens_pratique;
DROP POLICY IF EXISTS auth_insert_examens_pratique ON public.examens_pratique;
DROP POLICY IF EXISTS auth_update_examens_pratique ON public.examens_pratique;
DROP POLICY IF EXISTS auth_delete_examens_pratique ON public.examens_pratique;
CREATE POLICY examens_pratique_select ON public.examens_pratique FOR SELECT TO authenticated
  USING (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id));
CREATE POLICY examens_pratique_insert ON public.examens_pratique FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id));
CREATE POLICY examens_pratique_update ON public.examens_pratique FOR UPDATE TO authenticated
  USING (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id))
  WITH CHECK (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id));
CREATE POLICY examens_pratique_delete ON public.examens_pratique FOR DELETE TO authenticated
  USING (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id));

-- ---------- examens_t3p ----------
DROP POLICY IF EXISTS auth_select_examens_t3p ON public.examens_t3p;
DROP POLICY IF EXISTS auth_insert_examens_t3p ON public.examens_t3p;
DROP POLICY IF EXISTS auth_update_examens_t3p ON public.examens_t3p;
DROP POLICY IF EXISTS auth_delete_examens_t3p ON public.examens_t3p;
CREATE POLICY examens_t3p_select ON public.examens_t3p FOR SELECT TO authenticated
  USING (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id));
CREATE POLICY examens_t3p_insert ON public.examens_t3p FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id));
CREATE POLICY examens_t3p_update ON public.examens_t3p FOR UPDATE TO authenticated
  USING (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id))
  WITH CHECK (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id));
CREATE POLICY examens_t3p_delete ON public.examens_t3p FOR DELETE TO authenticated
  USING (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id));

-- ---------- fiches_pratique ----------
DROP POLICY IF EXISTS auth_select_fiches_pratique ON public.fiches_pratique;
DROP POLICY IF EXISTS auth_insert_fiches_pratique ON public.fiches_pratique;
DROP POLICY IF EXISTS auth_update_fiches_pratique ON public.fiches_pratique;
DROP POLICY IF EXISTS auth_delete_fiches_pratique ON public.fiches_pratique;
CREATE POLICY fiches_pratique_select ON public.fiches_pratique FOR SELECT TO authenticated
  USING (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id));
CREATE POLICY fiches_pratique_insert ON public.fiches_pratique FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id));
CREATE POLICY fiches_pratique_update ON public.fiches_pratique FOR UPDATE TO authenticated
  USING (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id))
  WITH CHECK (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id));
CREATE POLICY fiches_pratique_delete ON public.fiches_pratique FOR DELETE TO authenticated
  USING (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id));

-- ---------- progression_pedagogique ----------
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='progression_pedagogique' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.progression_pedagogique', r.policyname);
  END LOOP;
END $$;
CREATE POLICY progression_pedagogique_select ON public.progression_pedagogique FOR SELECT TO authenticated
  USING (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id));
CREATE POLICY progression_pedagogique_insert ON public.progression_pedagogique FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id));
CREATE POLICY progression_pedagogique_update ON public.progression_pedagogique FOR UPDATE TO authenticated
  USING (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id))
  WITH CHECK (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id));
CREATE POLICY progression_pedagogique_delete ON public.progression_pedagogique FOR DELETE TO authenticated
  USING (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id));

-- ---------- seances_conduite ----------
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='seances_conduite' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.seances_conduite', r.policyname);
  END LOOP;
END $$;
CREATE POLICY seances_conduite_select ON public.seances_conduite FOR SELECT TO authenticated
  USING (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id));
CREATE POLICY seances_conduite_insert ON public.seances_conduite FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id));
CREATE POLICY seances_conduite_update ON public.seances_conduite FOR UPDATE TO authenticated
  USING (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id))
  WITH CHECK (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id));
CREATE POLICY seances_conduite_delete ON public.seances_conduite FOR DELETE TO authenticated
  USING (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id));

-- ---------- contact_historique ----------
DROP POLICY IF EXISTS "Staff can select contact_historique" ON public.contact_historique;
DROP POLICY IF EXISTS "Staff can insert contact_historique" ON public.contact_historique;
DROP POLICY IF EXISTS "Staff can update contact_historique" ON public.contact_historique;
DROP POLICY IF EXISTS "Staff can delete contact_historique" ON public.contact_historique;
CREATE POLICY contact_historique_select ON public.contact_historique FOR SELECT TO authenticated
  USING (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id));
CREATE POLICY contact_historique_insert ON public.contact_historique FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id));
CREATE POLICY contact_historique_update ON public.contact_historique FOR UPDATE TO authenticated
  USING (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id))
  WITH CHECK (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id));
CREATE POLICY contact_historique_delete ON public.contact_historique FOR DELETE TO authenticated
  USING (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id));

-- ---------- contact_documents ----------
DROP POLICY IF EXISTS "Staff can select contact_documents" ON public.contact_documents;
DROP POLICY IF EXISTS "Staff can insert contact_documents" ON public.contact_documents;
DROP POLICY IF EXISTS "Staff can update contact_documents" ON public.contact_documents;
DROP POLICY IF EXISTS "Staff can delete contact_documents" ON public.contact_documents;
CREATE POLICY contact_documents_select ON public.contact_documents FOR SELECT TO authenticated
  USING (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id));
CREATE POLICY contact_documents_insert ON public.contact_documents FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id));
CREATE POLICY contact_documents_update ON public.contact_documents FOR UPDATE TO authenticated
  USING (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id))
  WITH CHECK (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id));
CREATE POLICY contact_documents_delete ON public.contact_documents FOR DELETE TO authenticated
  USING (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id));

-- ---------- formateur_documents ----------
DROP POLICY IF EXISTS "Staff can select formateur_documents" ON public.formateur_documents;
DROP POLICY IF EXISTS "Staff can insert formateur_documents" ON public.formateur_documents;
DROP POLICY IF EXISTS "Staff can update formateur_documents" ON public.formateur_documents;
DROP POLICY IF EXISTS "Staff can delete formateur_documents" ON public.formateur_documents;
CREATE POLICY formateur_documents_select ON public.formateur_documents FOR SELECT TO authenticated
  USING (public.is_admin_or_staff() AND public.has_formateur_centre_access(formateur_id));
CREATE POLICY formateur_documents_insert ON public.formateur_documents FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_staff() AND public.has_formateur_centre_access(formateur_id));
CREATE POLICY formateur_documents_update ON public.formateur_documents FOR UPDATE TO authenticated
  USING (public.is_admin_or_staff() AND public.has_formateur_centre_access(formateur_id))
  WITH CHECK (public.is_admin_or_staff() AND public.has_formateur_centre_access(formateur_id));
CREATE POLICY formateur_documents_delete ON public.formateur_documents FOR DELETE TO authenticated
  USING (public.is_admin_or_staff() AND public.has_formateur_centre_access(formateur_id));

-- ---------- formateur_factures ----------
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='formateur_factures' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.formateur_factures', r.policyname);
  END LOOP;
END $$;
CREATE POLICY formateur_factures_select ON public.formateur_factures FOR SELECT TO authenticated
  USING (public.is_admin_or_staff() AND public.has_formateur_centre_access(formateur_id));
CREATE POLICY formateur_factures_insert ON public.formateur_factures FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_staff() AND public.has_formateur_centre_access(formateur_id));
CREATE POLICY formateur_factures_update ON public.formateur_factures FOR UPDATE TO authenticated
  USING (public.is_admin_or_staff() AND public.has_formateur_centre_access(formateur_id))
  WITH CHECK (public.is_admin_or_staff() AND public.has_formateur_centre_access(formateur_id));
CREATE POLICY formateur_factures_delete ON public.formateur_factures FOR DELETE TO authenticated
  USING (public.is_admin_or_staff() AND public.has_formateur_centre_access(formateur_id));

-- ---------- satisfaction_reponses (has centre_id) ----------
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='satisfaction_reponses' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.satisfaction_reponses', r.policyname);
  END LOOP;
END $$;
CREATE POLICY satisfaction_reponses_select ON public.satisfaction_reponses FOR SELECT TO authenticated
  USING (public.is_admin_or_staff() AND public.has_centre_access(centre_id));
CREATE POLICY satisfaction_reponses_insert ON public.satisfaction_reponses FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_staff() AND public.has_centre_access(centre_id));
CREATE POLICY satisfaction_reponses_update ON public.satisfaction_reponses FOR UPDATE TO authenticated
  USING (public.is_admin_or_staff() AND public.has_centre_access(centre_id))
  WITH CHECK (public.is_admin_or_staff() AND public.has_centre_access(centre_id));
CREATE POLICY satisfaction_reponses_delete ON public.satisfaction_reponses FOR DELETE TO authenticated
  USING (public.is_admin_or_staff() AND public.has_centre_access(centre_id));

-- ---------- devis_lignes ----------
DROP POLICY IF EXISTS "Staff can select devis_lignes" ON public.devis_lignes;
DROP POLICY IF EXISTS "Staff can insert devis_lignes" ON public.devis_lignes;
DROP POLICY IF EXISTS "Staff can update devis_lignes" ON public.devis_lignes;
DROP POLICY IF EXISTS "Staff can delete devis_lignes" ON public.devis_lignes;
CREATE POLICY devis_lignes_select ON public.devis_lignes FOR SELECT TO authenticated
  USING (public.is_admin_or_staff() AND public.has_devis_centre_access(devis_id));
CREATE POLICY devis_lignes_insert ON public.devis_lignes FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_staff() AND public.has_devis_centre_access(devis_id));
CREATE POLICY devis_lignes_update ON public.devis_lignes FOR UPDATE TO authenticated
  USING (public.is_admin_or_staff() AND public.has_devis_centre_access(devis_id))
  WITH CHECK (public.is_admin_or_staff() AND public.has_devis_centre_access(devis_id));
CREATE POLICY devis_lignes_delete ON public.devis_lignes FOR DELETE TO authenticated
  USING (public.is_admin_or_staff() AND public.has_devis_centre_access(devis_id));

-- ---------- facture_lignes ----------
DROP POLICY IF EXISTS "Staff can select facture_lignes" ON public.facture_lignes;
DROP POLICY IF EXISTS "Staff can insert facture_lignes" ON public.facture_lignes;
DROP POLICY IF EXISTS "Staff can update facture_lignes" ON public.facture_lignes;
DROP POLICY IF EXISTS "Staff can delete facture_lignes" ON public.facture_lignes;
CREATE POLICY facture_lignes_select ON public.facture_lignes FOR SELECT TO authenticated
  USING (public.is_admin_or_staff() AND public.has_facture_centre_access(facture_id));
CREATE POLICY facture_lignes_insert ON public.facture_lignes FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_staff() AND public.has_facture_centre_access(facture_id));
CREATE POLICY facture_lignes_update ON public.facture_lignes FOR UPDATE TO authenticated
  USING (public.is_admin_or_staff() AND public.has_facture_centre_access(facture_id))
  WITH CHECK (public.is_admin_or_staff() AND public.has_facture_centre_access(facture_id));
CREATE POLICY facture_lignes_delete ON public.facture_lignes FOR DELETE TO authenticated
  USING (public.is_admin_or_staff() AND public.has_facture_centre_access(facture_id));

-- ---------- paiements ----------
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='paiements' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.paiements', r.policyname);
  END LOOP;
END $$;
CREATE POLICY paiements_select ON public.paiements FOR SELECT TO authenticated
  USING (public.is_admin_or_staff() AND public.has_facture_centre_access(facture_id));
CREATE POLICY paiements_insert ON public.paiements FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_staff() AND public.has_facture_centre_access(facture_id));
CREATE POLICY paiements_update ON public.paiements FOR UPDATE TO authenticated
  USING (public.is_admin_or_staff() AND public.has_facture_centre_access(facture_id))
  WITH CHECK (public.is_admin_or_staff() AND public.has_facture_centre_access(facture_id));
CREATE POLICY paiements_delete ON public.paiements FOR DELETE TO authenticated
  USING (public.is_admin_or_staff() AND public.has_facture_centre_access(facture_id));

-- ---------- grilles_evaluation (via examen_pratique_id) ----------
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='grilles_evaluation' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.grilles_evaluation', r.policyname);
  END LOOP;
END $$;
CREATE POLICY grilles_evaluation_select ON public.grilles_evaluation FOR SELECT TO authenticated
  USING (public.is_admin_or_staff() AND public.has_examen_pratique_centre_access(examen_pratique_id));
CREATE POLICY grilles_evaluation_insert ON public.grilles_evaluation FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_staff() AND public.has_examen_pratique_centre_access(examen_pratique_id));
CREATE POLICY grilles_evaluation_update ON public.grilles_evaluation FOR UPDATE TO authenticated
  USING (public.is_admin_or_staff() AND public.has_examen_pratique_centre_access(examen_pratique_id))
  WITH CHECK (public.is_admin_or_staff() AND public.has_examen_pratique_centre_access(examen_pratique_id));
CREATE POLICY grilles_evaluation_delete ON public.grilles_evaluation FOR DELETE TO authenticated
  USING (public.is_admin_or_staff() AND public.has_examen_pratique_centre_access(examen_pratique_id));

-- ---------- document_envois (contact_id or session_id or formateur_id) ----------
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='document_envois' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.document_envois', r.policyname);
  END LOOP;
END $$;
CREATE POLICY document_envois_select ON public.document_envois FOR SELECT TO authenticated
  USING (public.is_admin_or_staff() AND (
    (contact_id IS NOT NULL AND public.has_contact_centre_access(contact_id))
    OR (session_id IS NOT NULL AND public.has_session_centre_access(session_id))
    OR (formateur_id IS NOT NULL AND public.has_formateur_centre_access(formateur_id))
  ));
CREATE POLICY document_envois_insert ON public.document_envois FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_staff() AND (
    (contact_id IS NOT NULL AND public.has_contact_centre_access(contact_id))
    OR (session_id IS NOT NULL AND public.has_session_centre_access(session_id))
    OR (formateur_id IS NOT NULL AND public.has_formateur_centre_access(formateur_id))
  ));
CREATE POLICY document_envois_update ON public.document_envois FOR UPDATE TO authenticated
  USING (public.is_admin_or_staff() AND (
    (contact_id IS NOT NULL AND public.has_contact_centre_access(contact_id))
    OR (session_id IS NOT NULL AND public.has_session_centre_access(session_id))
    OR (formateur_id IS NOT NULL AND public.has_formateur_centre_access(formateur_id))
  ))
  WITH CHECK (public.is_admin_or_staff() AND (
    (contact_id IS NOT NULL AND public.has_contact_centre_access(contact_id))
    OR (session_id IS NOT NULL AND public.has_session_centre_access(session_id))
    OR (formateur_id IS NOT NULL AND public.has_formateur_centre_access(formateur_id))
  ));
CREATE POLICY document_envois_delete ON public.document_envois FOR DELETE TO authenticated
  USING (public.is_admin_or_staff() AND (
    (contact_id IS NOT NULL AND public.has_contact_centre_access(contact_id))
    OR (session_id IS NOT NULL AND public.has_session_centre_access(session_id))
    OR (formateur_id IS NOT NULL AND public.has_formateur_centre_access(formateur_id))
  ));

-- ---------- signature_requests (preserve public-token access policies) ----------
DO $$
DECLARE r record;
BEGIN
  FOR r IN 
    SELECT policyname FROM pg_policies 
    WHERE schemaname='public' AND tablename='signature_requests'
      AND qual::text LIKE '%has_role%' AND qual::text NOT LIKE '%access_token%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.signature_requests', r.policyname);
  END LOOP;
  FOR r IN 
    SELECT policyname FROM pg_policies 
    WHERE schemaname='public' AND tablename='signature_requests'
      AND with_check::text LIKE '%has_role%' AND (qual IS NULL OR qual::text NOT LIKE '%access_token%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.signature_requests', r.policyname);
  END LOOP;
END $$;
CREATE POLICY signature_requests_staff_select ON public.signature_requests FOR SELECT TO authenticated
  USING (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id));
CREATE POLICY signature_requests_staff_insert ON public.signature_requests FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id));
CREATE POLICY signature_requests_staff_update ON public.signature_requests FOR UPDATE TO authenticated
  USING (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id))
  WITH CHECK (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id));
CREATE POLICY signature_requests_staff_delete ON public.signature_requests FOR DELETE TO authenticated
  USING (public.is_admin_or_staff() AND public.has_contact_centre_access(contact_id));

-- ---------- prospect_historique ----------
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='prospect_historique' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.prospect_historique', r.policyname);
  END LOOP;
END $$;
CREATE POLICY prospect_historique_select ON public.prospect_historique FOR SELECT TO authenticated
  USING (public.is_admin_or_staff() AND public.has_prospect_centre_access(prospect_id));
CREATE POLICY prospect_historique_insert ON public.prospect_historique FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_staff() AND public.has_prospect_centre_access(prospect_id));
CREATE POLICY prospect_historique_update ON public.prospect_historique FOR UPDATE TO authenticated
  USING (public.is_admin_or_staff() AND public.has_prospect_centre_access(prospect_id))
  WITH CHECK (public.is_admin_or_staff() AND public.has_prospect_centre_access(prospect_id));
CREATE POLICY prospect_historique_delete ON public.prospect_historique FOR DELETE TO authenticated
  USING (public.is_admin_or_staff() AND public.has_prospect_centre_access(prospect_id));

-- ---------- qualiopi_preuves (via indicateur_id) ----------
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='qualiopi_preuves' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.qualiopi_preuves', r.policyname);
  END LOOP;
END $$;
CREATE POLICY qualiopi_preuves_select ON public.qualiopi_preuves FOR SELECT TO authenticated
  USING (public.is_admin_or_staff() AND public.has_indicateur_centre_access(indicateur_id));
CREATE POLICY qualiopi_preuves_insert ON public.qualiopi_preuves FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_staff() AND public.has_indicateur_centre_access(indicateur_id));
CREATE POLICY qualiopi_preuves_update ON public.qualiopi_preuves FOR UPDATE TO authenticated
  USING (public.is_admin_or_staff() AND public.has_indicateur_centre_access(indicateur_id))
  WITH CHECK (public.is_admin_or_staff() AND public.has_indicateur_centre_access(indicateur_id));
CREATE POLICY qualiopi_preuves_delete ON public.qualiopi_preuves FOR DELETE TO authenticated
  USING (public.is_admin_or_staff() AND public.has_indicateur_centre_access(indicateur_id));

-- ---------- envois_groupes (via session_id) ----------
DROP POLICY IF EXISTS "Création envois staff" ON public.envois_groupes;
DROP POLICY IF EXISTS "Lecture envois staff" ON public.envois_groupes;
CREATE POLICY envois_groupes_select ON public.envois_groupes FOR SELECT TO authenticated
  USING (public.is_admin_or_staff() AND public.has_session_centre_access(session_id));
CREATE POLICY envois_groupes_insert ON public.envois_groupes FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_staff() AND public.has_session_centre_access(session_id));
CREATE POLICY envois_groupes_update ON public.envois_groupes FOR UPDATE TO authenticated
  USING (public.is_admin_or_staff() AND public.has_session_centre_access(session_id))
  WITH CHECK (public.is_admin_or_staff() AND public.has_session_centre_access(session_id));
CREATE POLICY envois_groupes_delete ON public.envois_groupes FOR DELETE TO authenticated
  USING (public.is_admin_or_staff() AND public.has_session_centre_access(session_id));
