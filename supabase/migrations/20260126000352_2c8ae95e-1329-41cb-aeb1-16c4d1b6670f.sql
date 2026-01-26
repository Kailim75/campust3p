-- Table des éléments de checklist (items de conformité)
CREATE TABLE public.compliance_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  categorie TEXT NOT NULL CHECK (categorie IN ('cnil', 'qualiopi')),
  sous_categorie TEXT,
  titre TEXT NOT NULL,
  description TEXT,
  reference_legale TEXT,
  criticite TEXT NOT NULL DEFAULT 'obligatoire' CHECK (criticite IN ('obligatoire', 'recommande', 'optionnel')),
  ordre INTEGER NOT NULL DEFAULT 0,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des validations de checklist
CREATE TABLE public.compliance_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.compliance_checklist_items(id) ON DELETE CASCADE,
  centre_id UUID REFERENCES public.centres(id) ON DELETE CASCADE,
  statut TEXT NOT NULL DEFAULT 'non_valide' CHECK (statut IN ('non_valide', 'en_cours', 'valide', 'non_applicable')),
  commentaire TEXT,
  preuves TEXT[],
  valide_par UUID REFERENCES auth.users(id),
  valide_at TIMESTAMP WITH TIME ZONE,
  date_prochaine_revue TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(item_id, centre_id)
);

-- Historique des validations
CREATE TABLE public.compliance_validation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  validation_id UUID NOT NULL REFERENCES public.compliance_validations(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  ancien_statut TEXT,
  nouveau_statut TEXT,
  commentaire TEXT,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Trigger updated_at
CREATE TRIGGER update_compliance_checklist_items_updated_at
  BEFORE UPDATE ON public.compliance_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_compliance_validations_updated_at
  BEFORE UPDATE ON public.compliance_validations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger historique
CREATE OR REPLACE FUNCTION public.log_compliance_validation_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.compliance_validation_history (validation_id, action, nouveau_statut, commentaire, changed_by)
    VALUES (NEW.id, 'created', NEW.statut, NEW.commentaire, auth.uid());
  ELSIF TG_OP = 'UPDATE' AND OLD.statut IS DISTINCT FROM NEW.statut THEN
    INSERT INTO public.compliance_validation_history (validation_id, action, ancien_statut, nouveau_statut, commentaire, changed_by)
    VALUES (NEW.id, 'status_changed', OLD.statut, NEW.statut, NEW.commentaire, auth.uid());
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER log_compliance_validation_changes_trigger
  AFTER INSERT OR UPDATE ON public.compliance_validations
  FOR EACH ROW EXECUTE FUNCTION public.log_compliance_validation_changes();

-- RLS
ALTER TABLE public.compliance_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_validation_history ENABLE ROW LEVEL SECURITY;

-- Items: lecture pour tous les authentifiés, modification super_admin uniquement
CREATE POLICY "Authenticated can read checklist items"
  ON public.compliance_checklist_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admins can manage checklist items"
  ON public.compliance_checklist_items FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- Validations: super_admin full access, admin de centre pour leur centre
CREATE POLICY "Super admins can manage all validations"
  ON public.compliance_validations FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "Admins can manage their centre validations"
  ON public.compliance_validations FOR ALL TO authenticated
  USING (
    centre_id IS NULL OR 
    public.has_centre_access(centre_id) AND 
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    centre_id IS NULL OR 
    public.has_centre_access(centre_id) AND 
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Historique: lecture seule
CREATE POLICY "Authenticated can read validation history"
  ON public.compliance_validation_history FOR SELECT TO authenticated USING (true);

-- Index
CREATE INDEX idx_compliance_items_categorie ON public.compliance_checklist_items(categorie);
CREATE INDEX idx_compliance_validations_item ON public.compliance_validations(item_id);
CREATE INDEX idx_compliance_validations_centre ON public.compliance_validations(centre_id);

-- Insertion des items CNIL/RGPD
INSERT INTO public.compliance_checklist_items (code, categorie, sous_categorie, titre, description, reference_legale, criticite, ordre) VALUES
-- CNIL - Gouvernance
('CNIL-GOV-01', 'cnil', 'Gouvernance', 'Désignation d''un DPO', 'Un Délégué à la Protection des Données a été désigné ou une justification de non-désignation est documentée.', 'RGPD Art. 37-39', 'obligatoire', 1),
('CNIL-GOV-02', 'cnil', 'Gouvernance', 'Registre des traitements', 'Le registre des activités de traitement est tenu à jour et accessible.', 'RGPD Art. 30', 'obligatoire', 2),
('CNIL-GOV-03', 'cnil', 'Gouvernance', 'Politique de confidentialité', 'Une politique de confidentialité conforme est publiée et accessible aux personnes concernées.', 'RGPD Art. 13-14', 'obligatoire', 3),
('CNIL-GOV-04', 'cnil', 'Gouvernance', 'Mentions légales', 'Les mentions légales sont complètes et à jour sur tous les supports.', 'LCEN Art. 6', 'obligatoire', 4),

-- CNIL - Droits des personnes
('CNIL-DRT-01', 'cnil', 'Droits des personnes', 'Procédure droit d''accès', 'Une procédure est en place pour répondre aux demandes d''accès dans les délais légaux (1 mois).', 'RGPD Art. 15', 'obligatoire', 10),
('CNIL-DRT-02', 'cnil', 'Droits des personnes', 'Procédure droit de rectification', 'Les personnes peuvent demander la rectification de leurs données.', 'RGPD Art. 16', 'obligatoire', 11),
('CNIL-DRT-03', 'cnil', 'Droits des personnes', 'Procédure droit à l''effacement', 'Une procédure d''anonymisation/suppression est opérationnelle.', 'RGPD Art. 17', 'obligatoire', 12),
('CNIL-DRT-04', 'cnil', 'Droits des personnes', 'Procédure droit à la portabilité', 'L''export des données personnelles est possible au format standard.', 'RGPD Art. 20', 'obligatoire', 13),

-- CNIL - Sécurité
('CNIL-SEC-01', 'cnil', 'Sécurité', 'Chiffrement des données', 'Les données sensibles sont chiffrées au repos et en transit (TLS/SSL).', 'RGPD Art. 32', 'obligatoire', 20),
('CNIL-SEC-02', 'cnil', 'Sécurité', 'Contrôle d''accès', 'Un système de contrôle d''accès par rôles (RBAC) est implémenté.', 'RGPD Art. 32', 'obligatoire', 21),
('CNIL-SEC-03', 'cnil', 'Sécurité', 'Journalisation des accès', 'Les accès aux données sensibles sont tracés et auditables.', 'RGPD Art. 32', 'obligatoire', 22),
('CNIL-SEC-04', 'cnil', 'Sécurité', 'Procédure violation de données', 'Une procédure de gestion des violations de données est documentée et testée.', 'RGPD Art. 33-34', 'obligatoire', 23),
('CNIL-SEC-05', 'cnil', 'Sécurité', 'Sauvegardes', 'Des sauvegardes régulières sont effectuées et testées.', 'RGPD Art. 32', 'obligatoire', 24),

-- CNIL - Sous-traitance
('CNIL-STR-01', 'cnil', 'Sous-traitance', 'Contrats sous-traitants', 'Les contrats avec les sous-traitants incluent les clauses RGPD obligatoires.', 'RGPD Art. 28', 'obligatoire', 30),
('CNIL-STR-02', 'cnil', 'Sous-traitance', 'Registre des sous-traitants', 'La liste des sous-traitants et leurs rôles est documentée.', 'RGPD Art. 28', 'recommande', 31),

-- Qualiopi - Indicateur 1 à 7 (Conditions d'information)
('QUAL-01', 'qualiopi', 'Information du public', 'Indicateur 1 - Information accessible', 'Les informations sur les prestations, résultats et tarifs sont diffusées.', 'Qualiopi Ind. 1', 'obligatoire', 100),
('QUAL-02', 'qualiopi', 'Information du public', 'Indicateur 2 - Indicateurs de résultats', 'Les indicateurs de résultats sont publiés et actualisés.', 'Qualiopi Ind. 2', 'obligatoire', 101),
('QUAL-03', 'qualiopi', 'Information du public', 'Indicateur 3 - Objectifs et contenu', 'Les objectifs, contenus et modalités sont communiqués aux prospects.', 'Qualiopi Ind. 3', 'obligatoire', 102),
('QUAL-04', 'qualiopi', 'Accueil', 'Indicateur 4 - Analyse des besoins', 'L''analyse des besoins du bénéficiaire est formalisée.', 'Qualiopi Ind. 4', 'obligatoire', 103),
('QUAL-05', 'qualiopi', 'Accueil', 'Indicateur 5 - Positionnement préalable', 'Le positionnement préalable est réalisé et documenté.', 'Qualiopi Ind. 5', 'obligatoire', 104),
('QUAL-06', 'qualiopi', 'Accueil', 'Indicateur 6 - Conditions de déroulement', 'Les conditions de déroulement sont adaptées et communiquées.', 'Qualiopi Ind. 6', 'obligatoire', 105),
('QUAL-07', 'qualiopi', 'Accueil', 'Indicateur 7 - Adaptation aux PSH', 'Les modalités d''accueil et d''adaptation aux PSH sont définies.', 'Qualiopi Ind. 7', 'obligatoire', 106),

-- Qualiopi - Conception (8-10)
('QUAL-08', 'qualiopi', 'Conception', 'Indicateur 8 - Procédures de conception', 'Les procédures de conception des prestations sont formalisées.', 'Qualiopi Ind. 8', 'obligatoire', 110),
('QUAL-09', 'qualiopi', 'Conception', 'Indicateur 9 - Articulation séquences', 'L''articulation des séquences pédagogiques est documentée.', 'Qualiopi Ind. 9', 'obligatoire', 111),
('QUAL-10', 'qualiopi', 'Conception', 'Indicateur 10 - Adaptation des parcours', 'Les parcours sont adaptables selon les besoins identifiés.', 'Qualiopi Ind. 10', 'obligatoire', 112),

-- Qualiopi - Moyens (11-17)
('QUAL-11', 'qualiopi', 'Moyens pédagogiques', 'Indicateur 11 - Moyens humains et techniques', 'Les moyens humains et techniques adaptés sont mobilisés.', 'Qualiopi Ind. 11', 'obligatoire', 120),
('QUAL-12', 'qualiopi', 'Moyens pédagogiques', 'Indicateur 12 - Ressources pédagogiques', 'Les ressources pédagogiques sont disponibles et actualisées.', 'Qualiopi Ind. 12', 'obligatoire', 121),
('QUAL-13', 'qualiopi', 'Moyens pédagogiques', 'Indicateur 13 - Coordination des équipes', 'La coordination des équipes pédagogiques est assurée.', 'Qualiopi Ind. 13', 'obligatoire', 122),

-- Qualiopi - Évaluations (17-22)
('QUAL-17', 'qualiopi', 'Évaluations', 'Indicateur 17 - Évaluation des acquis', 'Les acquis sont évalués en cours et en fin de formation.', 'Qualiopi Ind. 17', 'obligatoire', 130),
('QUAL-18', 'qualiopi', 'Évaluations', 'Indicateur 18 - Assiduité', 'Le suivi de l''assiduité est réalisé et documenté.', 'Qualiopi Ind. 18', 'obligatoire', 131),

-- Qualiopi - Amélioration continue (30-32)
('QUAL-30', 'qualiopi', 'Amélioration continue', 'Indicateur 30 - Veille légale', 'Une veille légale et réglementaire est organisée.', 'Qualiopi Ind. 30', 'obligatoire', 140),
('QUAL-31', 'qualiopi', 'Amélioration continue', 'Indicateur 31 - Réclamations', 'Les réclamations sont traitées et suivies.', 'Qualiopi Ind. 31', 'obligatoire', 141),
('QUAL-32', 'qualiopi', 'Amélioration continue', 'Indicateur 32 - Satisfaction', 'Les enquêtes de satisfaction sont réalisées et exploitées.', 'Qualiopi Ind. 32', 'obligatoire', 142);