-- Table indicateurs QUALIOPI
CREATE TABLE public.qualiopi_indicateurs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL UNIQUE,
  critere integer NOT NULL CHECK (critere BETWEEN 1 AND 7),
  titre text NOT NULL,
  description text NOT NULL,
  statut text DEFAULT 'non_conforme' CHECK (statut IN ('conforme', 'partiellement_conforme', 'non_conforme')),
  preuves_attendues text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table preuves
CREATE TABLE public.qualiopi_preuves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicateur_id uuid REFERENCES public.qualiopi_indicateurs(id) ON DELETE CASCADE,
  type_preuve text NOT NULL,
  titre text NOT NULL,
  description text,
  fichier_url text,
  date_creation date NOT NULL DEFAULT CURRENT_DATE,
  date_validite date,
  valide boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Table actions amélioration
CREATE TABLE public.qualiopi_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicateur_id uuid REFERENCES public.qualiopi_indicateurs(id) ON DELETE CASCADE,
  titre text NOT NULL,
  description text NOT NULL,
  priorite text DEFAULT 'moyenne' CHECK (priorite IN ('haute', 'moyenne', 'basse')),
  statut text DEFAULT 'a_faire' CHECK (statut IN ('a_faire', 'en_cours', 'terminee', 'annulee')),
  date_echeance date,
  date_realisation date,
  responsable text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table audits
CREATE TABLE public.qualiopi_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type_audit text NOT NULL CHECK (type_audit IN ('initial', 'surveillance', 'renouvellement', 'interne')),
  organisme_certificateur text,
  date_audit date NOT NULL,
  date_prochaine_echeance date,
  statut text DEFAULT 'planifie' CHECK (statut IN ('planifie', 'en_cours', 'termine', 'certifie')),
  score_global integer CHECK (score_global BETWEEN 0 AND 100),
  observations text,
  non_conformites_majeures integer DEFAULT 0,
  non_conformites_mineures integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour performances
CREATE INDEX idx_qualiopi_preuves_indicateur ON public.qualiopi_preuves(indicateur_id);
CREATE INDEX idx_qualiopi_actions_indicateur ON public.qualiopi_actions(indicateur_id);
CREATE INDEX idx_qualiopi_indicateurs_critere ON public.qualiopi_indicateurs(critere);
CREATE INDEX idx_qualiopi_indicateurs_statut ON public.qualiopi_indicateurs(statut);

-- RLS Policies
ALTER TABLE public.qualiopi_indicateurs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture indicateurs authentifiés" ON public.qualiopi_indicateurs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Modification indicateurs admin" ON public.qualiopi_indicateurs FOR UPDATE TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.qualiopi_preuves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture preuves authentifiés" ON public.qualiopi_preuves FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestion preuves authentifiés" ON public.qualiopi_preuves FOR ALL TO authenticated USING (true);

ALTER TABLE public.qualiopi_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture actions authentifiés" ON public.qualiopi_actions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestion actions authentifiés" ON public.qualiopi_actions FOR ALL TO authenticated USING (true);

ALTER TABLE public.qualiopi_audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture audits authentifiés" ON public.qualiopi_audits FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestion audits admin" ON public.qualiopi_audits FOR ALL TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger updated_at
CREATE TRIGGER update_qualiopi_indicateurs_updated_at BEFORE UPDATE ON public.qualiopi_indicateurs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_qualiopi_actions_updated_at BEFORE UPDATE ON public.qualiopi_actions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_qualiopi_audits_updated_at BEFORE UPDATE ON public.qualiopi_audits
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Pré-remplissage des 32 indicateurs QUALIOPI
-- CRITÈRE 1 : Information du public
INSERT INTO public.qualiopi_indicateurs (numero, critere, titre, description, preuves_attendues) VALUES
('1', 1, 'Information accessible au public', 'L''organisme diffuse une information accessible au public, détaillée et vérifiable sur les prestations proposées : prérequis, objectifs, durée, modalités et délais d''accès, tarifs, contacts, méthodes mobilisées et modalités d''évaluation, accessibilité aux personnes handicapées.', ARRAY['Site web à jour', 'Catalogue formations', 'Fiches programme détaillées', 'CGV']),
('2', 1, 'Indicateurs de résultats', 'L''organisme diffuse des indicateurs de résultats adaptés à la nature des prestations mises en œuvre et des publics accueillis.', ARRAY['Taux de réussite aux examens', 'Taux de satisfaction', 'Taux d''insertion professionnelle', 'Taux d''abandon']),
('3', 1, 'Obtention de la certification', 'Lorsque le prestataire met en œuvre des prestations conduisant à une certification professionnelle, il informe sur les taux d''obtention des certifications préparées, les possibilités de valider un/ou des blocs de compétences, ainsi que sur les équivalences, passerelles, suites de parcours et les débouchés.', ARRAY['Statistiques certifications', 'Information blocs compétences', 'Passerelles et équivalences']);

-- CRITÈRE 2 : Identification précise des objectifs
INSERT INTO public.qualiopi_indicateurs (numero, critere, titre, description, preuves_attendues) VALUES
('4', 2, 'Analyse du besoin du bénéficiaire', 'Le prestataire analyse le besoin du bénéficiaire en lien avec l''entreprise et/ou le financeur concerné(s).', ARRAY['Questionnaire de positionnement', 'Compte-rendu entretien préalable', 'Analyse des besoins formalisée']),
('5', 2, 'Objectifs opérationnels et évaluables', 'Le prestataire définit les objectifs opérationnels et évaluables de la prestation.', ARRAY['Objectifs pédagogiques SMART', 'Programme de formation', 'Critères d''évaluation']),
('6', 2, 'Contenus et modalités adaptés', 'Le prestataire établit les contenus et les modalités de mise en œuvre de la prestation, adaptés aux objectifs définis et aux publics bénéficiaires.', ARRAY['Supports pédagogiques', 'Déroulé pédagogique', 'Méthodes adaptées au public']),
('7', 2, 'Adéquation contenus/certification', 'Lorsque le prestataire met en œuvre des prestations conduisant à une certification professionnelle, le prestataire s''assure de l''adéquation du ou des contenus de la prestation aux exigences de la certification visée.', ARRAY['Référentiel certification', 'Correspondance programme/référentiel', 'Actualisation contenus']),
('8', 2, 'Procédures de positionnement', 'Le prestataire détermine les procédures de positionnement et d''évaluation des acquis à l''entrée de la prestation.', ARRAY['Tests de positionnement', 'Grilles d''évaluation entrée', 'Procédure admission']);

-- CRITÈRE 3 : Adaptation aux bénéficiaires
INSERT INTO public.qualiopi_indicateurs (numero, critere, titre, description, preuves_attendues) VALUES
('9', 3, 'Information conditions de déroulement', 'Le prestataire informe les publics bénéficiaires sur les conditions de déroulement de la prestation.', ARRAY['Livret d''accueil', 'Règlement intérieur', 'Convocation formation']),
('10', 3, 'Adaptation de la prestation', 'Le prestataire met en œuvre et adapte la prestation, l''accompagnement et le suivi aux publics bénéficiaires.', ARRAY['Suivi individualisé', 'Adaptations pédagogiques', 'Bilans intermédiaires']),
('11', 3, 'Évaluation de l''atteinte des objectifs', 'Le prestataire évalue l''atteinte par les publics bénéficiaires des objectifs de la prestation.', ARRAY['Évaluations formatives', 'Évaluations sommatives', 'Attestation de fin de formation']),
('12', 3, 'Engagement des bénéficiaires', 'Le prestataire décrit et met en œuvre les mesures pour favoriser l''engagement des bénéficiaires et prévenir les ruptures de parcours.', ARRAY['Suivi assiduité', 'Relances absences', 'Entretiens remotivation']),
('13', 3, 'Coordination des apprentis', 'Pour les formations en alternance, le prestataire, en lien avec l''entreprise, anticipe avec l''apprenant les missions confiées, à court, moyen et long terme, et assure la coordination et la progressivité des apprentissages réalisés en centre de formation et en entreprise.', ARRAY['Livret d''apprentissage', 'Visites en entreprise', 'Coordination tuteur/formateur']),
('14', 3, 'Accompagnement socio-professionnel', 'Le prestataire met en œuvre un accompagnement socio-professionnel, éducatif et relatif à l''exercice de la citoyenneté.', ARRAY['Accompagnement social', 'Orientation professionnelle', 'Actions citoyenneté']),
('15', 3, 'Information droits et devoirs apprenti', 'Le prestataire informe les apprentis de leurs droits et devoirs en tant qu''apprentis et salariés ainsi que des règles applicables en matière de santé et de sécurité en milieu professionnel.', ARRAY['Information droits apprentis', 'Formation sécurité', 'Règlement intérieur']),
('16', 3, 'Conformité au référentiel', 'Lorsque le prestataire met en œuvre des formations conduisant à une certification professionnelle, il s''assure que les conditions de présentation des bénéficiaires à la certification respectent les exigences formelles de l''autorité de certification.', ARRAY['Vérification éligibilité', 'Dossiers inscription examen', 'Suivi conditions certification']);

-- CRITÈRE 4 : Adéquation des moyens
INSERT INTO public.qualiopi_indicateurs (numero, critere, titre, description, preuves_attendues) VALUES
('17', 4, 'Moyens humains et techniques', 'Le prestataire met à disposition ou s''assure de la mise à disposition des moyens humains et techniques adaptés et d''un environnement approprié (conditions, locaux, équipements, plateaux techniques…).', ARRAY['Inventaire équipements', 'CV formateurs', 'Plan de locaux', 'Accessibilité']),
('18', 4, 'Coordination des intervenants', 'Le prestataire mobilise et coordonne les différents intervenants internes et/ou externes (pédagogiques, administratifs, logistiques, commerciaux…).', ARRAY['Organigramme', 'Fiches de poste', 'Réunions coordination']),
('19', 4, 'Ressources pédagogiques', 'Le prestataire met à disposition du bénéficiaire des ressources pédagogiques et permet à celui-ci de se les approprier.', ARRAY['Supports de cours', 'Ressources en ligne', 'Bibliothèque/médiathèque']),
('20', 4, 'Personnel dédié handicap', 'Le prestataire dispose d''un personnel dédié à l''appui à la mobilité nationale et internationale, d''un référent handicap et d''un conseil de perfectionnement.', ARRAY['Référent handicap désigné', 'Référent mobilité', 'Conseil de perfectionnement']);

-- CRITÈRE 5 : Qualification des personnels
INSERT INTO public.qualiopi_indicateurs (numero, critere, titre, description, preuves_attendues) VALUES
('21', 5, 'Compétences des formateurs', 'Le prestataire détermine, mobilise et évalue les compétences des différents intervenants internes et/ou externes, adaptées aux prestations.', ARRAY['CV détaillés formateurs', 'Diplômes/certifications', 'Évaluations formateurs']),
('22', 5, 'Développement des compétences', 'Le prestataire entretient et développe les compétences de ses salariés, adaptées aux prestations qu''il délivre.', ARRAY['Plan de formation interne', 'Entretiens professionnels', 'Formations suivies']);

-- CRITÈRE 6 : Inscription dans l'environnement professionnel
INSERT INTO public.qualiopi_indicateurs (numero, critere, titre, description, preuves_attendues) VALUES
('23', 6, 'Veille légale et réglementaire', 'Le prestataire réalise une veille légale et réglementaire sur le champ de la formation professionnelle et en exploite les enseignements.', ARRAY['Procédure de veille', 'Sources documentaires', 'Compte-rendu veille']),
('24', 6, 'Veille sur les évolutions', 'Le prestataire réalise une veille sur les évolutions des compétences, des métiers et des emplois dans ses secteurs d''intervention et en exploite les enseignements.', ARRAY['Veille métiers/compétences', 'Études sectorielles', 'Partenariats professionnels']),
('25', 6, 'Veille technologique et pédagogique', 'Le prestataire réalise une veille sur les innovations pédagogiques et technologiques permettant une évolution de ses prestations et en exploite les enseignements.', ARRAY['Veille innovation', 'Nouvelles méthodes testées', 'Outils numériques']),
('26', 6, 'Réseau de partenaires', 'Le prestataire mobilise les expertises, outils et réseaux nécessaires pour accueillir, accompagner/former ou orienter les publics en situation de handicap.', ARRAY['Partenariats handicap', 'Réseau Cap Emploi/Agefiph', 'Adaptations mises en œuvre']),
('27', 6, 'Insertion professionnelle', 'Lorsque le prestataire fait appel à la sous-traitance ou au portage salarial, il s''assure du respect de la conformité au présent référentiel.', ARRAY['Contrats sous-traitance', 'Vérification conformité', 'Suivi qualité sous-traitants']);

-- CRITÈRE 7 : Recueil et prise en compte des appréciations
INSERT INTO public.qualiopi_indicateurs (numero, critere, titre, description, preuves_attendues) VALUES
('28', 7, 'Recueil des appréciations', 'Le prestataire recueille les appréciations des parties prenantes : bénéficiaires, financeurs, équipes pédagogiques et entreprises concernées.', ARRAY['Questionnaires satisfaction', 'Enquêtes financeurs', 'Bilans formateurs']),
('29', 7, 'Traitement des réclamations', 'Le prestataire met en œuvre des modalités de traitement des difficultés rencontrées par les parties prenantes, des réclamations exprimées par ces dernières, des aléas survenus en cours de prestation.', ARRAY['Procédure réclamations', 'Registre réclamations', 'Actions correctives']),
('30', 7, 'Mesures d''amélioration', 'Le prestataire met en œuvre des mesures d''amélioration à partir de l''analyse des appréciations et des réclamations.', ARRAY['Plan d''amélioration', 'Indicateurs qualité', 'Revue de direction']),
('31', 7, 'Actions d''amélioration continue', 'Le prestataire met en œuvre des actions d''amélioration continue.', ARRAY['Actions préventives', 'Actions correctives', 'Suivi efficacité']),
('32', 7, 'Suivi des résultats certifications', 'Lorsque le prestataire met en œuvre des formations conduisant à une certification professionnelle, il prend en compte les résultats d''examens et retours des certifications.', ARRAY['Analyse résultats examens', 'Retours organismes certificateurs', 'Actions amélioration']);