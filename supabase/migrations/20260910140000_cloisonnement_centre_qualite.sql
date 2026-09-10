-- Cloisonnement par centre de cinq tables signalées par le scan Lovable du
-- 10/09/2026 (après application de 20260910123000) : objectifs, qualiopi_audits,
-- qualiopi_indicateurs, reclamations, attestation_certificates. Leurs policies
-- ne contrôlaient que le rôle : un admin/staff d'un centre lisait et modifiait
-- les données de tous les centres. Sans effet visible tant qu'il n'y a qu'un
-- centre ; indispensable avant l'ouverture du 2ᵉ (vague 3a de la roadmap).
-- Rejouable. Motif initplan (CLAUDE.md) : appels indépendants de la ligne
-- enveloppés en (SELECT fn()) ; has_centre_access(centre_id) reste nu.

-- ---------------------------------------------------------------------------
-- 0. centre_id garanti sur les tables Qualiopi
--    objectifs et reclamations ont déjà le trigger generic_auto_set_centre_id
--    (20260305135257) ; qualiopi_audits et qualiopi_indicateurs non, et le front
--    ne renseigne pas centre_id : sans ce trigger, toute nouvelle ligne serait
--    invisible sous les policies ci-dessous.
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_auto_set_centre_id_qualiopi_audits ON public.qualiopi_audits;
CREATE TRIGGER trg_auto_set_centre_id_qualiopi_audits
  BEFORE INSERT ON public.qualiopi_audits
  FOR EACH ROW EXECUTE FUNCTION public.generic_auto_set_centre_id();

DROP TRIGGER IF EXISTS trg_auto_set_centre_id_qualiopi_indicateurs ON public.qualiopi_indicateurs;
CREATE TRIGGER trg_auto_set_centre_id_qualiopi_indicateurs
  BEFORE INSERT ON public.qualiopi_indicateurs
  FOR EACH ROW EXECUTE FUNCTION public.generic_auto_set_centre_id();

-- Lignes historiques sans centre_id : rattachées au centre unique. S'il y a
-- plusieurs centres ET des lignes orphelines, on s'arrête (échec explicite
-- plutôt que des données rendues invisibles en silence).
DO $$
DECLARE
  v_nb_centres integer;
  v_centre uuid;
  v_orphelines integer;
BEGIN
  SELECT count(*) INTO v_nb_centres FROM public.centres;
  SELECT
    (SELECT count(*) FROM public.qualiopi_audits WHERE centre_id IS NULL)
    + (SELECT count(*) FROM public.qualiopi_indicateurs WHERE centre_id IS NULL)
    + (SELECT count(*) FROM public.objectifs WHERE centre_id IS NULL)
    + (SELECT count(*) FROM public.reclamations WHERE centre_id IS NULL)
  INTO v_orphelines;

  IF v_orphelines = 0 THEN
    RAISE NOTICE 'cloisonnement qualité : aucune ligne sans centre_id';
  ELSIF v_nb_centres = 1 THEN
    SELECT id INTO v_centre FROM public.centres;
    UPDATE public.qualiopi_audits       SET centre_id = v_centre WHERE centre_id IS NULL;
    UPDATE public.qualiopi_indicateurs  SET centre_id = v_centre WHERE centre_id IS NULL;
    UPDATE public.objectifs             SET centre_id = v_centre WHERE centre_id IS NULL;
    UPDATE public.reclamations          SET centre_id = v_centre WHERE centre_id IS NULL;
    RAISE NOTICE 'cloisonnement qualité : % ligne(s) rattachée(s) au centre %', v_orphelines, v_centre;
  ELSE
    RAISE EXCEPTION 'cloisonnement qualité : % centres et % ligne(s) sans centre_id — renseigner centre_id à la main avant d''appliquer cette migration', v_nb_centres, v_orphelines;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1. objectifs — lecture/écriture admin+staff, suppression admin, toujours
--    dans le centre.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can view objectives" ON public.objectifs;
DROP POLICY IF EXISTS "Authenticated users can insert objectives" ON public.objectifs;
DROP POLICY IF EXISTS "Authenticated users can update objectives" ON public.objectifs;
DROP POLICY IF EXISTS "Authenticated users can delete objectives" ON public.objectifs;
DROP POLICY IF EXISTS "Staff can select objectifs" ON public.objectifs;
DROP POLICY IF EXISTS "Staff can insert objectifs" ON public.objectifs;
DROP POLICY IF EXISTS "Staff can update objectifs" ON public.objectifs;
DROP POLICY IF EXISTS "Admin can delete objectifs" ON public.objectifs;
DROP POLICY IF EXISTS "auth_select_objectifs" ON public.objectifs;
DROP POLICY IF EXISTS "auth_insert_objectifs" ON public.objectifs;
DROP POLICY IF EXISTS "auth_update_objectifs" ON public.objectifs;
DROP POLICY IF EXISTS "auth_delete_objectifs" ON public.objectifs;
DROP POLICY IF EXISTS "objectifs_centre_select" ON public.objectifs;
DROP POLICY IF EXISTS "objectifs_centre_insert" ON public.objectifs;
DROP POLICY IF EXISTS "objectifs_centre_update" ON public.objectifs;
DROP POLICY IF EXISTS "objectifs_centre_delete" ON public.objectifs;

CREATE POLICY "objectifs_centre_select" ON public.objectifs
  FOR SELECT TO authenticated
  USING ((SELECT public.is_admin_or_staff()) AND public.has_centre_access(centre_id));

CREATE POLICY "objectifs_centre_insert" ON public.objectifs
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin_or_staff()) AND public.has_centre_access(centre_id));

CREATE POLICY "objectifs_centre_update" ON public.objectifs
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin_or_staff()) AND public.has_centre_access(centre_id))
  WITH CHECK ((SELECT public.is_admin_or_staff()) AND public.has_centre_access(centre_id));

CREATE POLICY "objectifs_centre_delete" ON public.objectifs
  FOR DELETE TO authenticated
  USING (
    ((SELECT public.has_role(auth.uid(), 'admin'::app_role)) OR (SELECT public.is_super_admin()))
    AND public.has_centre_access(centre_id)
  );

-- ---------------------------------------------------------------------------
-- 2. qualiopi_audits — lecture admin+staff, gestion admin (comme avant),
--    dans le centre.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Lecture audits authentifiés" ON public.qualiopi_audits;
DROP POLICY IF EXISTS "Gestion audits admin" ON public.qualiopi_audits;
DROP POLICY IF EXISTS "Staff can select qualiopi_audits" ON public.qualiopi_audits;
DROP POLICY IF EXISTS "auth_select_qualiopi_audits" ON public.qualiopi_audits;
DROP POLICY IF EXISTS "qualiopi_audits_centre_select" ON public.qualiopi_audits;
DROP POLICY IF EXISTS "qualiopi_audits_centre_admin" ON public.qualiopi_audits;

CREATE POLICY "qualiopi_audits_centre_select" ON public.qualiopi_audits
  FOR SELECT TO authenticated
  USING ((SELECT public.is_admin_or_staff()) AND public.has_centre_access(centre_id));

CREATE POLICY "qualiopi_audits_centre_admin" ON public.qualiopi_audits
  FOR ALL TO authenticated
  USING (
    ((SELECT public.has_role(auth.uid(), 'admin'::app_role)) OR (SELECT public.is_super_admin()))
    AND public.has_centre_access(centre_id)
  )
  WITH CHECK (
    ((SELECT public.has_role(auth.uid(), 'admin'::app_role)) OR (SELECT public.is_super_admin()))
    AND public.has_centre_access(centre_id)
  );

-- ---------------------------------------------------------------------------
-- 3. qualiopi_indicateurs — lecture admin+staff, modification admin (comme
--    avant), dans le centre. Pas d'insertion ni de suppression côté client.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Lecture indicateurs authentifiés" ON public.qualiopi_indicateurs;
DROP POLICY IF EXISTS "Modification indicateurs admin" ON public.qualiopi_indicateurs;
DROP POLICY IF EXISTS "Staff can select qualiopi_indicateurs" ON public.qualiopi_indicateurs;
DROP POLICY IF EXISTS "Staff can update qualiopi_indicateurs" ON public.qualiopi_indicateurs;
DROP POLICY IF EXISTS "auth_select_qualiopi_ind" ON public.qualiopi_indicateurs;
DROP POLICY IF EXISTS "qualiopi_indicateurs_centre_select" ON public.qualiopi_indicateurs;
DROP POLICY IF EXISTS "qualiopi_indicateurs_centre_update" ON public.qualiopi_indicateurs;

CREATE POLICY "qualiopi_indicateurs_centre_select" ON public.qualiopi_indicateurs
  FOR SELECT TO authenticated
  USING ((SELECT public.is_admin_or_staff()) AND public.has_centre_access(centre_id));

CREATE POLICY "qualiopi_indicateurs_centre_update" ON public.qualiopi_indicateurs
  FOR UPDATE TO authenticated
  USING (
    ((SELECT public.has_role(auth.uid(), 'admin'::app_role)) OR (SELECT public.is_super_admin()))
    AND public.has_centre_access(centre_id)
  )
  WITH CHECK (
    ((SELECT public.has_role(auth.uid(), 'admin'::app_role)) OR (SELECT public.is_super_admin()))
    AND public.has_centre_access(centre_id)
  );

-- ---------------------------------------------------------------------------
-- 4. reclamations — lecture/écriture admin+staff, suppression admin, dans le
--    centre (le dépôt public passe par submit_reclamation_with_token).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can submit reclamations" ON public.reclamations;
DROP POLICY IF EXISTS "Users can create reclamations" ON public.reclamations;
DROP POLICY IF EXISTS "Staff can select reclamations" ON public.reclamations;
DROP POLICY IF EXISTS "Staff can insert reclamations" ON public.reclamations;
DROP POLICY IF EXISTS "Staff can update reclamations" ON public.reclamations;
DROP POLICY IF EXISTS "Admin can delete reclamations" ON public.reclamations;
DROP POLICY IF EXISTS "reclamations_centre_select" ON public.reclamations;
DROP POLICY IF EXISTS "reclamations_centre_insert" ON public.reclamations;
DROP POLICY IF EXISTS "reclamations_centre_update" ON public.reclamations;
DROP POLICY IF EXISTS "reclamations_centre_delete" ON public.reclamations;

CREATE POLICY "reclamations_centre_select" ON public.reclamations
  FOR SELECT TO authenticated
  USING ((SELECT public.is_admin_or_staff()) AND public.has_centre_access(centre_id));

CREATE POLICY "reclamations_centre_insert" ON public.reclamations
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin_or_staff()) AND public.has_centre_access(centre_id));

CREATE POLICY "reclamations_centre_update" ON public.reclamations
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin_or_staff()) AND public.has_centre_access(centre_id))
  WITH CHECK ((SELECT public.is_admin_or_staff()) AND public.has_centre_access(centre_id));

CREATE POLICY "reclamations_centre_delete" ON public.reclamations
  FOR DELETE TO authenticated
  USING (
    ((SELECT public.has_role(auth.uid(), 'admin'::app_role)) OR (SELECT public.is_super_admin()))
    AND public.has_centre_access(centre_id)
  );

-- ---------------------------------------------------------------------------
-- 5. attestation_certificates — pas de centre_id : rattachement par le contact
--    (has_contact_centre_access). Lecture/création/mise à jour admin+staff ;
--    toujours pas de suppression (certificats immuables, révocation par update).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can view certificates" ON public.attestation_certificates;
DROP POLICY IF EXISTS "Authenticated users can create certificates" ON public.attestation_certificates;
DROP POLICY IF EXISTS "Users can create certificates" ON public.attestation_certificates;
DROP POLICY IF EXISTS "Staff can view certificates" ON public.attestation_certificates;
DROP POLICY IF EXISTS "Staff can create certificates" ON public.attestation_certificates;
DROP POLICY IF EXISTS "Staff can update certificates" ON public.attestation_certificates;
DROP POLICY IF EXISTS "certificates_centre_select" ON public.attestation_certificates;
DROP POLICY IF EXISTS "certificates_centre_insert" ON public.attestation_certificates;
DROP POLICY IF EXISTS "certificates_centre_update" ON public.attestation_certificates;

CREATE POLICY "certificates_centre_select" ON public.attestation_certificates
  FOR SELECT TO authenticated
  USING ((SELECT public.is_admin_or_staff()) AND public.has_contact_centre_access(contact_id));

CREATE POLICY "certificates_centre_insert" ON public.attestation_certificates
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin_or_staff()) AND public.has_contact_centre_access(contact_id));

CREATE POLICY "certificates_centre_update" ON public.attestation_certificates
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin_or_staff()) AND public.has_contact_centre_access(contact_id))
  WITH CHECK ((SELECT public.is_admin_or_staff()) AND public.has_contact_centre_access(contact_id));
