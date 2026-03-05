
-- =============================================
-- SPRINT 2 - MIGRATION 2: RLS hygiene (TO public → TO authenticated) + formateur fix
-- =============================================

-- A) Fix all TO public policies → TO authenticated
-- Pattern: DROP old, CREATE new with same qual but TO authenticated

-- ai_actions_audit
DROP POLICY IF EXISTS "Admins et staff peuvent voir l'audit IA" ON public.ai_actions_audit;
CREATE POLICY "Admins et staff peuvent voir l audit IA" ON public.ai_actions_audit FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = ANY(ARRAY['admin'::app_role, 'staff'::app_role])));

-- cartes_professionnelles
DROP POLICY IF EXISTS "Staff can delete cartes_pro" ON public.cartes_professionnelles;
DROP POLICY IF EXISTS "Staff can insert cartes_pro" ON public.cartes_professionnelles;
DROP POLICY IF EXISTS "Staff can select cartes_pro" ON public.cartes_professionnelles;
DROP POLICY IF EXISTS "Staff can update cartes_pro" ON public.cartes_professionnelles;
CREATE POLICY "auth_select_cartes_pro" ON public.cartes_professionnelles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "auth_insert_cartes_pro" ON public.cartes_professionnelles FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "auth_update_cartes_pro" ON public.cartes_professionnelles FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "auth_delete_cartes_pro" ON public.cartes_professionnelles FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- centre_formation
DROP POLICY IF EXISTS "Staff can read centre_formation" ON public.centre_formation;
CREATE POLICY "auth_read_centre_formation" ON public.centre_formation FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- compte_rendu_seance: FIX formateur isolation
DROP POLICY IF EXISTS "Admin read compte_rendu" ON public.compte_rendu_seance;
DROP POLICY IF EXISTS "Staff read compte_rendu" ON public.compte_rendu_seance;
DROP POLICY IF EXISTS "Formateur crud compte_rendu" ON public.compte_rendu_seance;
CREATE POLICY "auth_admin_read_compte_rendu" ON public.compte_rendu_seance FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin());
CREATE POLICY "auth_staff_read_compte_rendu" ON public.compte_rendu_seance FOR SELECT TO authenticated USING (has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "auth_formateur_select_compte_rendu" ON public.compte_rendu_seance FOR SELECT TO authenticated USING (has_role(auth.uid(), 'formateur'::app_role) AND formateur_id = public.get_user_formateur_id());
CREATE POLICY "auth_formateur_insert_compte_rendu" ON public.compte_rendu_seance FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'formateur'::app_role) AND formateur_id = public.get_user_formateur_id());
CREATE POLICY "auth_formateur_update_compte_rendu" ON public.compte_rendu_seance FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'formateur'::app_role) AND formateur_id = public.get_user_formateur_id());
CREATE POLICY "auth_formateur_delete_compte_rendu" ON public.compte_rendu_seance FOR DELETE TO authenticated USING (has_role(auth.uid(), 'formateur'::app_role) AND formateur_id = public.get_user_formateur_id());

-- dismissed_alerts
DROP POLICY IF EXISTS "Users can dismiss alerts" ON public.dismissed_alerts;
DROP POLICY IF EXISTS "Users can restore dismissed alerts" ON public.dismissed_alerts;
DROP POLICY IF EXISTS "Users can view their dismissed alerts" ON public.dismissed_alerts;
CREATE POLICY "auth_select_dismissed" ON public.dismissed_alerts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "auth_insert_dismissed" ON public.dismissed_alerts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "auth_delete_dismissed" ON public.dismissed_alerts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- document_envois
DROP POLICY IF EXISTS "Admin can delete document_envois" ON public.document_envois;
DROP POLICY IF EXISTS "Staff can insert document_envois" ON public.document_envois;
DROP POLICY IF EXISTS "Staff can select document_envois" ON public.document_envois;
DROP POLICY IF EXISTS "Staff can update document_envois" ON public.document_envois;
CREATE POLICY "auth_select_doc_envois" ON public.document_envois FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "auth_insert_doc_envois" ON public.document_envois FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "auth_update_doc_envois" ON public.document_envois FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "auth_delete_doc_envois" ON public.document_envois FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- document_instances
DROP POLICY IF EXISTS "Admin/staff can insert instances" ON public.document_instances;
DROP POLICY IF EXISTS "Admin/staff can update instances" ON public.document_instances;
DROP POLICY IF EXISTS "Users with centre access can view instances" ON public.document_instances;
CREATE POLICY "auth_select_doc_instances" ON public.document_instances FOR SELECT TO authenticated USING (has_centre_access(centre_id) OR is_super_admin());
CREATE POLICY "auth_insert_doc_instances" ON public.document_instances FOR INSERT TO authenticated WITH CHECK (has_centre_access(centre_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role)));
CREATE POLICY "auth_update_doc_instances" ON public.document_instances FOR UPDATE TO authenticated USING (has_centre_access(centre_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role)));

-- enquete_tokens: fix authenticated-only policies, keep public ones
DROP POLICY IF EXISTS "Authenticated users can create tokens" ON public.enquete_tokens;
DROP POLICY IF EXISTS "Authenticated users can delete tokens" ON public.enquete_tokens;
CREATE POLICY "auth_create_tokens" ON public.enquete_tokens FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_delete_tokens" ON public.enquete_tokens FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
-- Keep "Allow public read for token validation" and "Tokens are accessible via their token value" as-is (needed for public forms)

-- examens_pratique
DROP POLICY IF EXISTS "Staff can delete examens_pratique" ON public.examens_pratique;
DROP POLICY IF EXISTS "Staff can insert examens_pratique" ON public.examens_pratique;
DROP POLICY IF EXISTS "Staff can select examens_pratique" ON public.examens_pratique;
DROP POLICY IF EXISTS "Staff can update examens_pratique" ON public.examens_pratique;
CREATE POLICY "auth_select_examens_pratique" ON public.examens_pratique FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "auth_insert_examens_pratique" ON public.examens_pratique FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "auth_update_examens_pratique" ON public.examens_pratique FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "auth_delete_examens_pratique" ON public.examens_pratique FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- examens_t3p
DROP POLICY IF EXISTS "Staff can delete examens_t3p v2" ON public.examens_t3p;
DROP POLICY IF EXISTS "Staff can insert examens_t3p v2" ON public.examens_t3p;
DROP POLICY IF EXISTS "Staff can select examens_t3p" ON public.examens_t3p;
DROP POLICY IF EXISTS "Staff can update examens_t3p v2" ON public.examens_t3p;
CREATE POLICY "auth_select_examens_t3p" ON public.examens_t3p FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "auth_insert_examens_t3p" ON public.examens_t3p FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "auth_update_examens_t3p" ON public.examens_t3p FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "auth_delete_examens_t3p" ON public.examens_t3p FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- fiches_pratique
DROP POLICY IF EXISTS "Staff can delete fiches_pratique" ON public.fiches_pratique;
DROP POLICY IF EXISTS "Staff can insert fiches_pratique" ON public.fiches_pratique;
DROP POLICY IF EXISTS "Staff can select fiches_pratique" ON public.fiches_pratique;
DROP POLICY IF EXISTS "Staff can update fiches_pratique" ON public.fiches_pratique;
CREATE POLICY "auth_select_fiches_pratique" ON public.fiches_pratique FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "auth_insert_fiches_pratique" ON public.fiches_pratique FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "auth_update_fiches_pratique" ON public.fiches_pratique FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "auth_delete_fiches_pratique" ON public.fiches_pratique FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- grilles_evaluation
DROP POLICY IF EXISTS "Staff can delete grilles_evaluation" ON public.grilles_evaluation;
DROP POLICY IF EXISTS "Staff can insert grilles_evaluation" ON public.grilles_evaluation;
DROP POLICY IF EXISTS "Staff can select grilles_evaluation" ON public.grilles_evaluation;
DROP POLICY IF EXISTS "Staff can update grilles_evaluation" ON public.grilles_evaluation;
CREATE POLICY "auth_select_grilles" ON public.grilles_evaluation FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "auth_insert_grilles" ON public.grilles_evaluation FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "auth_update_grilles" ON public.grilles_evaluation FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "auth_delete_grilles" ON public.grilles_evaluation FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- ia_prospect_scoring
DROP POLICY IF EXISTS "Admins and staff can delete scoring" ON public.ia_prospect_scoring;
DROP POLICY IF EXISTS "Admins and staff can insert scoring" ON public.ia_prospect_scoring;
DROP POLICY IF EXISTS "Admins and staff can update scoring" ON public.ia_prospect_scoring;
DROP POLICY IF EXISTS "Super admins can view all scoring" ON public.ia_prospect_scoring;
DROP POLICY IF EXISTS "Users can view scoring for their centre" ON public.ia_prospect_scoring;
CREATE POLICY "auth_select_scoring_centre" ON public.ia_prospect_scoring FOR SELECT TO authenticated USING (has_centre_access(centre_id));
CREATE POLICY "auth_select_scoring_super" ON public.ia_prospect_scoring FOR SELECT TO authenticated USING (is_super_admin());
CREATE POLICY "auth_insert_scoring" ON public.ia_prospect_scoring FOR INSERT TO authenticated WITH CHECK (has_centre_access(centre_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role) OR is_super_admin()));
CREATE POLICY "auth_update_scoring" ON public.ia_prospect_scoring FOR UPDATE TO authenticated USING (has_centre_access(centre_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role) OR is_super_admin()));
CREATE POLICY "auth_delete_scoring" ON public.ia_prospect_scoring FOR DELETE TO authenticated USING (has_centre_access(centre_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role) OR is_super_admin()));

-- ia_score_history
DROP POLICY IF EXISTS "Admins can delete score history" ON public.ia_score_history;
DROP POLICY IF EXISTS "Admins can insert score history" ON public.ia_score_history;
DROP POLICY IF EXISTS "Admins can update score history" ON public.ia_score_history;
DROP POLICY IF EXISTS "Super admins can view all score history" ON public.ia_score_history;
DROP POLICY IF EXISTS "Users can view score history for their centre" ON public.ia_score_history;
CREATE POLICY "auth_select_score_hist_centre" ON public.ia_score_history FOR SELECT TO authenticated USING (has_centre_access(centre_id));
CREATE POLICY "auth_select_score_hist_super" ON public.ia_score_history FOR SELECT TO authenticated USING (is_super_admin());
CREATE POLICY "auth_insert_score_hist" ON public.ia_score_history FOR INSERT TO authenticated WITH CHECK (has_centre_access(centre_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role) OR is_super_admin()));
CREATE POLICY "auth_update_score_hist" ON public.ia_score_history FOR UPDATE TO authenticated USING (has_centre_access(centre_id) AND (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin()));
CREATE POLICY "auth_delete_score_hist" ON public.ia_score_history FOR DELETE TO authenticated USING (has_centre_access(centre_id) AND (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin()));

-- legal_mentions: keep public read for active, fix admin/super
DROP POLICY IF EXISTS "Admins can view all legal mentions" ON public.legal_mentions;
DROP POLICY IF EXISTS "Super admin can manage legal mentions" ON public.legal_mentions;
CREATE POLICY "auth_admin_view_legal" ON public.legal_mentions FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin());
CREATE POLICY "auth_super_manage_legal" ON public.legal_mentions FOR ALL TO authenticated USING (is_super_admin());
-- "Anyone can view active legal mentions" stays as TO public (intentional)

-- legal_mentions_history
DROP POLICY IF EXISTS "Super admin can insert history" ON public.legal_mentions_history;
DROP POLICY IF EXISTS "Super admin can view history" ON public.legal_mentions_history;
CREATE POLICY "auth_super_view_legal_hist" ON public.legal_mentions_history FOR SELECT TO authenticated USING (is_super_admin());
CREATE POLICY "auth_super_insert_legal_hist" ON public.legal_mentions_history FOR INSERT TO authenticated WITH CHECK (is_super_admin());

-- LMS tables (all follow same pattern)
DROP POLICY IF EXISTS "Admin full access lms_answers" ON public.lms_answers;
DROP POLICY IF EXISTS "Staff read lms_answers" ON public.lms_answers;
CREATE POLICY "auth_admin_all_lms_answers" ON public.lms_answers FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "auth_staff_read_lms_answers" ON public.lms_answers FOR SELECT TO authenticated USING (has_role(auth.uid(), 'staff'::app_role));

DROP POLICY IF EXISTS "Admin can manage competencies" ON public.lms_competencies;
DROP POLICY IF EXISTS "Staff can view competencies" ON public.lms_competencies;
CREATE POLICY "auth_admin_all_lms_comp" ON public.lms_competencies FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "auth_staff_read_lms_comp" ON public.lms_competencies FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

DROP POLICY IF EXISTS "Admin can manage enrollments" ON public.lms_enrollments;
DROP POLICY IF EXISTS "Staff can view enrollments" ON public.lms_enrollments;
CREATE POLICY "auth_all_lms_enrollments" ON public.lms_enrollments FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "auth_read_lms_enrollments" ON public.lms_enrollments FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

DROP POLICY IF EXISTS "Staff can manage exam attempts" ON public.lms_exam_attempts;
DROP POLICY IF EXISTS "Staff can view exam attempts" ON public.lms_exam_attempts;
CREATE POLICY "auth_all_lms_exam_attempts" ON public.lms_exam_attempts FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "auth_read_lms_exam_attempts" ON public.lms_exam_attempts FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

DROP POLICY IF EXISTS "Admin can manage formations" ON public.lms_formations;
DROP POLICY IF EXISTS "Staff can view formations" ON public.lms_formations;
CREATE POLICY "auth_admin_all_lms_formations" ON public.lms_formations FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "auth_staff_read_lms_formations" ON public.lms_formations FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

DROP POLICY IF EXISTS "Staff can manage lesson progress" ON public.lms_lesson_progress;
DROP POLICY IF EXISTS "Staff can view lesson progress" ON public.lms_lesson_progress;
CREATE POLICY "auth_all_lms_lesson_progress" ON public.lms_lesson_progress FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "auth_read_lms_lesson_progress" ON public.lms_lesson_progress FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

DROP POLICY IF EXISTS "Admin can manage lessons" ON public.lms_lessons;
DROP POLICY IF EXISTS "Staff can view lessons" ON public.lms_lessons;
CREATE POLICY "auth_admin_all_lms_lessons" ON public.lms_lessons FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "auth_staff_read_lms_lessons" ON public.lms_lessons FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

DROP POLICY IF EXISTS "Admin can manage mock exams" ON public.lms_mock_exams;
DROP POLICY IF EXISTS "Staff can view mock exams" ON public.lms_mock_exams;
CREATE POLICY "auth_admin_all_lms_mock_exams" ON public.lms_mock_exams FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "auth_staff_read_lms_mock_exams" ON public.lms_mock_exams FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

DROP POLICY IF EXISTS "Admin can manage modules" ON public.lms_modules;
DROP POLICY IF EXISTS "Staff can view modules" ON public.lms_modules;
CREATE POLICY "auth_admin_all_lms_modules" ON public.lms_modules FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "auth_staff_read_lms_modules" ON public.lms_modules FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

DROP POLICY IF EXISTS "Admin can manage questions" ON public.lms_questions;
DROP POLICY IF EXISTS "Staff can view questions" ON public.lms_questions;
CREATE POLICY "auth_admin_all_lms_questions" ON public.lms_questions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "auth_staff_read_lms_questions" ON public.lms_questions FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

DROP POLICY IF EXISTS "Staff can manage quiz attempts" ON public.lms_quiz_attempts;
DROP POLICY IF EXISTS "Staff can view quiz attempts" ON public.lms_quiz_attempts;
CREATE POLICY "auth_all_lms_quiz_attempts" ON public.lms_quiz_attempts FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "auth_read_lms_quiz_attempts" ON public.lms_quiz_attempts FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

DROP POLICY IF EXISTS "Admin can manage quizzes" ON public.lms_quizzes;
DROP POLICY IF EXISTS "Staff can view quizzes" ON public.lms_quizzes;
CREATE POLICY "auth_admin_all_lms_quizzes" ON public.lms_quizzes FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "auth_staff_read_lms_quizzes" ON public.lms_quizzes FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

DROP POLICY IF EXISTS "Admin can manage resources" ON public.lms_resources;
DROP POLICY IF EXISTS "Staff can view resources" ON public.lms_resources;
CREATE POLICY "auth_admin_all_lms_resources" ON public.lms_resources FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "auth_staff_read_lms_resources" ON public.lms_resources FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

DROP POLICY IF EXISTS "Admin can manage themes" ON public.lms_themes;
DROP POLICY IF EXISTS "Staff can view themes" ON public.lms_themes;
CREATE POLICY "auth_admin_all_lms_themes" ON public.lms_themes FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "auth_staff_read_lms_themes" ON public.lms_themes FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- objectifs
DROP POLICY IF EXISTS "Admin can delete objectifs" ON public.objectifs;
DROP POLICY IF EXISTS "Staff can insert objectifs" ON public.objectifs;
DROP POLICY IF EXISTS "Staff can select objectifs" ON public.objectifs;
DROP POLICY IF EXISTS "Staff can update objectifs" ON public.objectifs;
CREATE POLICY "auth_select_objectifs" ON public.objectifs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "auth_insert_objectifs" ON public.objectifs FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "auth_update_objectifs" ON public.objectifs FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "auth_delete_objectifs" ON public.objectifs FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- progression_conduite
DROP POLICY IF EXISTS "Admin full progression_c" ON public.progression_conduite;
DROP POLICY IF EXISTS "Formateur crud progression_c" ON public.progression_conduite;
DROP POLICY IF EXISTS "Staff read progression_c" ON public.progression_conduite;
CREATE POLICY "auth_admin_all_progression_c" ON public.progression_conduite FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "auth_formateur_all_progression_c" ON public.progression_conduite FOR ALL TO authenticated USING (has_role(auth.uid(), 'formateur'::app_role));
CREATE POLICY "auth_staff_read_progression_c" ON public.progression_conduite FOR SELECT TO authenticated USING (has_role(auth.uid(), 'staff'::app_role));

-- progression_pedagogique
DROP POLICY IF EXISTS "Staff can delete progression_pedagogique" ON public.progression_pedagogique;
DROP POLICY IF EXISTS "Staff can insert progression_pedagogique" ON public.progression_pedagogique;
DROP POLICY IF EXISTS "Staff can select progression_pedagogique" ON public.progression_pedagogique;
DROP POLICY IF EXISTS "Staff can update progression_pedagogique" ON public.progression_pedagogique;
CREATE POLICY "auth_select_prog_ped" ON public.progression_pedagogique FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "auth_insert_prog_ped" ON public.progression_pedagogique FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "auth_update_prog_ped" ON public.progression_pedagogique FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "auth_delete_prog_ped" ON public.progression_pedagogique FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- prospect_historique
DROP POLICY IF EXISTS "Staff can create prospect history" ON public.prospect_historique;
DROP POLICY IF EXISTS "Staff can delete prospect history" ON public.prospect_historique;
DROP POLICY IF EXISTS "Staff can update prospect history" ON public.prospect_historique;
DROP POLICY IF EXISTS "Staff can view prospect history" ON public.prospect_historique;
CREATE POLICY "auth_select_prospect_hist" ON public.prospect_historique FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "auth_insert_prospect_hist" ON public.prospect_historique FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "auth_update_prospect_hist" ON public.prospect_historique FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "auth_delete_prospect_hist" ON public.prospect_historique FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- qualiopi
DROP POLICY IF EXISTS "Staff can manage qualiopi_actions" ON public.qualiopi_actions;
DROP POLICY IF EXISTS "Staff can select qualiopi_audits" ON public.qualiopi_audits;
DROP POLICY IF EXISTS "Staff can select qualiopi_indicateurs" ON public.qualiopi_indicateurs;
DROP POLICY IF EXISTS "Staff can manage qualiopi_preuves" ON public.qualiopi_preuves;
CREATE POLICY "auth_all_qualiopi_actions" ON public.qualiopi_actions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "auth_select_qualiopi_audits" ON public.qualiopi_audits FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "auth_select_qualiopi_ind" ON public.qualiopi_indicateurs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "auth_all_qualiopi_preuves" ON public.qualiopi_preuves FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- reservations_conduite
DROP POLICY IF EXISTS "Admin full reservations_c" ON public.reservations_conduite;
DROP POLICY IF EXISTS "Staff full reservations_c" ON public.reservations_conduite;
DROP POLICY IF EXISTS "Formateur read reservations_c" ON public.reservations_conduite;
CREATE POLICY "auth_admin_all_reservations" ON public.reservations_conduite FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "auth_staff_all_reservations" ON public.reservations_conduite FOR ALL TO authenticated USING (has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "auth_formateur_read_reservations" ON public.reservations_conduite FOR SELECT TO authenticated USING (has_role(auth.uid(), 'formateur'::app_role));

-- ressources_conduite
DROP POLICY IF EXISTS "Admin crud ressources_c" ON public.ressources_conduite;
CREATE POLICY "auth_admin_all_ressources_c" ON public.ressources_conduite FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- seances_conduite
DROP POLICY IF EXISTS "Staff can delete seances_conduite" ON public.seances_conduite;
DROP POLICY IF EXISTS "Staff can insert seances_conduite" ON public.seances_conduite;
DROP POLICY IF EXISTS "Staff can select seances_conduite" ON public.seances_conduite;
DROP POLICY IF EXISTS "Staff can update seances_conduite" ON public.seances_conduite;
CREATE POLICY "auth_select_seances" ON public.seances_conduite FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "auth_insert_seances" ON public.seances_conduite FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "auth_update_seances" ON public.seances_conduite FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "auth_delete_seances" ON public.seances_conduite FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- signature_requests: keep public policies (needed for public signing)
-- "Public can view sent signature requests by id" and "Public can sign or refuse" stay as-is

-- template tables
DROP POLICY IF EXISTS "Admin/staff can insert approval logs" ON public.template_approval_logs;
DROP POLICY IF EXISTS "Users with centre access can view approval logs" ON public.template_approval_logs;
CREATE POLICY "auth_select_approval_logs" ON public.template_approval_logs FOR SELECT TO authenticated USING (has_centre_access(centre_id) OR is_super_admin());
CREATE POLICY "auth_insert_approval_logs" ON public.template_approval_logs FOR INSERT TO authenticated WITH CHECK (has_centre_access(centre_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role)));

DROP POLICY IF EXISTS "Admin can delete templates" ON public.template_studio_templates;
DROP POLICY IF EXISTS "Admin/staff can insert templates" ON public.template_studio_templates;
DROP POLICY IF EXISTS "Admin/staff can update templates" ON public.template_studio_templates;
DROP POLICY IF EXISTS "Users with centre access can view templates" ON public.template_studio_templates;
CREATE POLICY "auth_select_templates" ON public.template_studio_templates FOR SELECT TO authenticated USING (has_centre_access(centre_id) OR is_super_admin());
CREATE POLICY "auth_insert_templates" ON public.template_studio_templates FOR INSERT TO authenticated WITH CHECK (has_centre_access(centre_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role)));
CREATE POLICY "auth_update_templates" ON public.template_studio_templates FOR UPDATE TO authenticated USING (has_centre_access(centre_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role)));
CREATE POLICY "auth_delete_templates" ON public.template_studio_templates FOR DELETE TO authenticated USING (has_centre_access(centre_id) AND has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admin/staff can insert versions" ON public.template_versions;
DROP POLICY IF EXISTS "Users with centre access can view versions" ON public.template_versions;
CREATE POLICY "auth_select_versions" ON public.template_versions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM template_studio_templates t WHERE t.id = template_versions.template_id AND (has_centre_access(t.centre_id) OR is_super_admin())));
CREATE POLICY "auth_insert_versions" ON public.template_versions FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM template_studio_templates t WHERE t.id = template_versions.template_id AND has_centre_access(t.centre_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))));

-- finance tables
DROP POLICY IF EXISTS "Admin/staff can manage transactions_bancaires" ON public.transactions_bancaires;
DROP POLICY IF EXISTS "Admin/staff can manage tresorerie_alertes" ON public.tresorerie_alertes;
DROP POLICY IF EXISTS "Admin/staff can manage tresorerie_soldes" ON public.tresorerie_soldes;
CREATE POLICY "auth_all_transactions" ON public.transactions_bancaires FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "auth_all_treso_alertes" ON public.tresorerie_alertes FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "auth_all_treso_soldes" ON public.tresorerie_soldes FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- vehicules: only the delete policy was TO public
DROP POLICY IF EXISTS "Admin can delete vehicules" ON public.vehicules;
CREATE POLICY "auth_admin_delete_vehicules" ON public.vehicules FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- workflows
DROP POLICY IF EXISTS "Staff can manage workflow_executions" ON public.workflow_executions;
DROP POLICY IF EXISTS "Staff can manage workflows" ON public.workflows;
CREATE POLICY "auth_all_workflow_exec" ON public.workflow_executions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "auth_all_workflows" ON public.workflows FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
