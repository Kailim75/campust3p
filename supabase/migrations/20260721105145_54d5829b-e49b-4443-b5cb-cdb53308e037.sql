
-- Tenant isolation: LMS learner data (via contacts.centre_id)
DO $$
DECLARE
  t text;
  tables text[] := ARRAY['lms_enrollments','lms_exam_attempts','lms_quiz_attempts','lms_lesson_progress'];
  centre_check text := 'EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = %I.contact_id AND public.has_centre_access(c.centre_id))';
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'ALTER POLICY auth_all_%s ON public.%I USING (((SELECT has_role(auth.uid(),''admin''::app_role)) OR (SELECT has_role(auth.uid(),''staff''::app_role))) AND %s) WITH CHECK (((SELECT has_role(auth.uid(),''admin''::app_role)) OR (SELECT has_role(auth.uid(),''staff''::app_role))) AND %s)',
      t, t, format(centre_check, t), format(centre_check, t)
    );
    EXECUTE format(
      'ALTER POLICY auth_read_%s ON public.%I USING (((SELECT has_role(auth.uid(),''admin''::app_role)) OR (SELECT has_role(auth.uid(),''staff''::app_role))) AND %s)',
      t, t, format(centre_check, t)
    );
  END LOOP;
END $$;

-- progression_conduite: apprenant_id -> contacts.centre_id
ALTER POLICY auth_admin_all_progression_c ON public.progression_conduite
  USING ((SELECT has_role(auth.uid(),'admin'::app_role)) AND EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = progression_conduite.apprenant_id AND public.has_centre_access(c.centre_id)))
  WITH CHECK ((SELECT has_role(auth.uid(),'admin'::app_role)) AND EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = progression_conduite.apprenant_id AND public.has_centre_access(c.centre_id)));

ALTER POLICY auth_formateur_all_progression_c ON public.progression_conduite
  USING ((SELECT has_role(auth.uid(),'formateur'::app_role)) AND EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = progression_conduite.apprenant_id AND public.has_centre_access(c.centre_id)))
  WITH CHECK ((SELECT has_role(auth.uid(),'formateur'::app_role)) AND EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = progression_conduite.apprenant_id AND public.has_centre_access(c.centre_id)));

ALTER POLICY auth_staff_read_progression_c ON public.progression_conduite
  USING ((SELECT has_role(auth.uid(),'staff'::app_role)) AND EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = progression_conduite.apprenant_id AND public.has_centre_access(c.centre_id)));

-- reservations_conduite: creneau_id -> creneaux_conduite.centre_id
ALTER POLICY auth_admin_all_reservations ON public.reservations_conduite
  USING ((SELECT has_role(auth.uid(),'admin'::app_role)) AND EXISTS (SELECT 1 FROM public.creneaux_conduite cc WHERE cc.id = reservations_conduite.creneau_id AND public.has_centre_access(cc.centre_id)))
  WITH CHECK ((SELECT has_role(auth.uid(),'admin'::app_role)) AND EXISTS (SELECT 1 FROM public.creneaux_conduite cc WHERE cc.id = reservations_conduite.creneau_id AND public.has_centre_access(cc.centre_id)));

ALTER POLICY auth_staff_all_reservations ON public.reservations_conduite
  USING ((SELECT has_role(auth.uid(),'staff'::app_role)) AND EXISTS (SELECT 1 FROM public.creneaux_conduite cc WHERE cc.id = reservations_conduite.creneau_id AND public.has_centre_access(cc.centre_id)))
  WITH CHECK ((SELECT has_role(auth.uid(),'staff'::app_role)) AND EXISTS (SELECT 1 FROM public.creneaux_conduite cc WHERE cc.id = reservations_conduite.creneau_id AND public.has_centre_access(cc.centre_id)));

ALTER POLICY auth_formateur_read_reservations ON public.reservations_conduite
  USING ((SELECT has_role(auth.uid(),'formateur'::app_role)) AND EXISTS (SELECT 1 FROM public.creneaux_conduite cc WHERE cc.id = reservations_conduite.creneau_id AND public.has_centre_access(cc.centre_id) AND (cc.formateur_id = (SELECT public.get_user_formateur_id()) OR (SELECT has_role(auth.uid(),'admin'::app_role)) OR (SELECT has_role(auth.uid(),'staff'::app_role)))));
