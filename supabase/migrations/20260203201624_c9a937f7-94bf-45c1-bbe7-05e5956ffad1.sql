-- =====================================================
-- PROGRAMMES T3P - CONFORMITÉ RÉGLEMENTAIRE
-- Migration progressive sans suppression (préservation des sessions)
-- Nomenclature : [TYPE]-[METIER]-[ZONE]-[VERSION]
-- =====================================================

-- 1. Enrichir catalogue_formations avec champs réglementaires
ALTER TABLE public.catalogue_formations 
ADD COLUMN IF NOT EXISTS public_concerne TEXT,
ADD COLUMN IF NOT EXISTS competences_visees TEXT[],
ADD COLUMN IF NOT EXISTS modalites_pedagogiques TEXT,
ADD COLUMN IF NOT EXISTS modalites_evaluation TEXT,
ADD COLUMN IF NOT EXISTS references_reglementaires TEXT,
ADD COLUMN IF NOT EXISTS zone_geographique TEXT,
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- 2. Enrichir lms_formations avec champs réglementaires
ALTER TABLE public.lms_formations
ADD COLUMN IF NOT EXISTS public_concerne TEXT,
ADD COLUMN IF NOT EXISTS competences_visees TEXT[],
ADD COLUMN IF NOT EXISTS modalites_pedagogiques TEXT,
ADD COLUMN IF NOT EXISTS modalites_evaluation TEXT,
ADD COLUMN IF NOT EXISTS references_reglementaires TEXT,
ADD COLUMN IF NOT EXISTS zone_geographique TEXT,
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- 3. Mettre à jour les programmes existants avec nouvelle nomenclature
-- TAXI-INIT → INIT-TAXI-NAT-v1
UPDATE public.catalogue_formations SET
  code = 'INIT-TAXI-NAT-v1',
  intitule = 'Formation initiale - Conducteur de Taxi',
  description = 'Formation préparatoire à l''examen d''accès à la profession de conducteur de taxi. Cette formation permet d''acquérir l''ensemble des compétences nécessaires à l''exercice du métier de chauffeur de taxi.',
  duree_heures = 250,
  prix_ht = 2990,
  objectifs = 'Préparer et réussir l''examen d''accès à la profession de conducteur de taxi (T3P). Maîtriser la réglementation du transport public particulier de personnes. Acquérir les compétences de gestion d''entreprise et de relation client.',
  prerequis = 'Permis B en cours de validité depuis 3 ans minimum (2 ans si conduite accompagnée). Être âgé de 21 ans minimum. Casier judiciaire vierge (bulletin n°2). Aptitude médicale conforme.',
  public_concerne = 'Toute personne souhaitant exercer la profession de conducteur de taxi',
  competences_visees = ARRAY['Réglementation T3P', 'Gestion d''entreprise', 'Sécurité routière', 'Relation client', 'Langue française', 'Langue anglaise', 'Développement commercial'],
  modalites_pedagogiques = 'Formation en présentiel. Cours théoriques et mises en situation pratiques. Supports pédagogiques numériques. Examens blancs réguliers.',
  modalites_evaluation = 'Évaluations continues. Examens blancs théoriques et pratiques. Contrôle des acquis par QCM. Attestation de fin de formation.',
  references_reglementaires = 'Décret n°2017-483 du 6 avril 2017. Arrêté du 6 avril 2017 relatif aux programmes et épreuves des examens T3P. Code des transports - Articles L3121-1 et suivants.',
  zone_geographique = 'NAT',
  version = 1
WHERE code = 'TAXI-INIT';

-- VTC-INIT → INIT-VTC-NAT-v1
UPDATE public.catalogue_formations SET
  code = 'INIT-VTC-NAT-v1',
  intitule = 'Formation initiale - Conducteur de VTC',
  description = 'Formation préparatoire à l''examen d''accès à la profession de conducteur de voiture de transport avec chauffeur (VTC). Cette formation permet d''acquérir l''ensemble des compétences nécessaires à l''exercice du métier.',
  duree_heures = 250,
  prix_ht = 2990,
  objectifs = 'Préparer et réussir l''examen d''accès à la profession de conducteur VTC (T3P). Maîtriser la réglementation du transport public particulier de personnes. Développer les compétences en gestion d''entreprise et relation client haut de gamme.',
  prerequis = 'Permis B en cours de validité depuis 3 ans minimum (2 ans si conduite accompagnée). Être âgé de 21 ans minimum. Casier judiciaire vierge (bulletin n°2). Aptitude médicale conforme.',
  public_concerne = 'Toute personne souhaitant exercer la profession de conducteur de voiture de transport avec chauffeur',
  competences_visees = ARRAY['Réglementation T3P', 'Gestion d''entreprise', 'Sécurité routière', 'Relation client premium', 'Langue française', 'Langue anglaise', 'Développement commercial', 'Service haut de gamme'],
  modalites_pedagogiques = 'Formation en présentiel. Cours théoriques et mises en situation pratiques. Supports pédagogiques numériques. Examens blancs réguliers.',
  modalites_evaluation = 'Évaluations continues. Examens blancs théoriques et pratiques. Contrôle des acquis par QCM. Attestation de fin de formation.',
  references_reglementaires = 'Décret n°2017-483 du 6 avril 2017. Arrêté du 6 avril 2017 relatif aux programmes et épreuves des examens T3P. Code des transports - Articles L3122-1 et suivants.',
  zone_geographique = 'NAT',
  version = 1
WHERE code = 'VTC-INIT';

-- VMDTR → INIT-VMDTR-NAT-v1
UPDATE public.catalogue_formations SET
  code = 'INIT-VMDTR-NAT-v1',
  intitule = 'Formation initiale - Conducteur de VMDTR (Moto-taxi)',
  description = 'Formation préparatoire à l''examen d''accès à la profession de conducteur de véhicule motorisé à deux ou trois roues (VMDTR/Moto-taxi).',
  duree_heures = 33,
  prix_ht = 990,
  objectifs = 'Préparer et réussir l''examen d''accès à la profession de conducteur VMDTR. Maîtriser les spécificités du transport de personnes en deux-roues.',
  prerequis = 'Permis A en cours de validité depuis 3 ans minimum. Être âgé de 21 ans minimum. Casier judiciaire vierge (bulletin n°2). Aptitude médicale conforme.',
  public_concerne = 'Toute personne titulaire du permis A souhaitant exercer la profession de moto-taxi',
  competences_visees = ARRAY['Réglementation T3P VMDTR', 'Sécurité spécifique deux-roues', 'Gestion d''entreprise', 'Relation client', 'Premiers secours'],
  modalites_pedagogiques = 'Formation en présentiel. Cours théoriques et exercices pratiques sur simulateur et en conditions réelles.',
  modalites_evaluation = 'Évaluations continues. Examens blancs. Évaluation pratique sur véhicule. Attestation de fin de formation.',
  references_reglementaires = 'Décret n°2017-483 du 6 avril 2017. Code des transports - Articles L3123-1 et suivants.',
  zone_geographique = 'NAT',
  version = 1
WHERE code = 'VMDTR';

-- TAXI-CONT → FC-TAXI-NAT-v1
UPDATE public.catalogue_formations SET
  code = 'FC-TAXI-NAT-v1',
  intitule = 'Formation continue - Conducteur de Taxi',
  description = 'Formation continue obligatoire pour le renouvellement de la carte professionnelle de conducteur de taxi. Cette formation de 14 heures permet de mettre à jour les connaissances réglementaires et professionnelles.',
  duree_heures = 14,
  prix_ht = 250,
  objectifs = 'Actualiser les connaissances réglementaires. Renforcer les compétences en matière de sécurité routière. Améliorer la qualité du service client. Valider la formation continue obligatoire pour le renouvellement de la carte professionnelle.',
  prerequis = 'Être titulaire d''une carte professionnelle de conducteur de taxi en cours de validité ou expirée depuis moins de 5 ans.',
  public_concerne = 'Conducteurs de taxi en activité devant renouveler leur carte professionnelle',
  competences_visees = ARRAY['Actualisation réglementaire', 'Sécurité routière avancée', 'Relation client', 'Gestes de premiers secours', 'Prévention des risques'],
  modalites_pedagogiques = 'Formation en présentiel sur 2 jours. Alternance théorie et ateliers pratiques. Échanges d''expériences entre professionnels.',
  modalites_evaluation = 'Évaluation des acquis par QCM. Mise en situation pratique. Attestation de formation continue obligatoire.',
  references_reglementaires = 'Décret n°2017-483 du 6 avril 2017. Article R3121-10 du Code des transports. Formation continue de 14 heures sur 5 ans.',
  zone_geographique = 'NAT',
  version = 1
WHERE code = 'TAXI-CONT';

-- VTC-CONT → FC-VTC-NAT-v1
UPDATE public.catalogue_formations SET
  code = 'FC-VTC-NAT-v1',
  intitule = 'Formation continue - Conducteur de VTC',
  description = 'Formation continue obligatoire pour le renouvellement de la carte professionnelle de conducteur VTC. Cette formation de 14 heures permet de mettre à jour les connaissances réglementaires et professionnelles.',
  duree_heures = 14,
  prix_ht = 250,
  objectifs = 'Actualiser les connaissances réglementaires. Renforcer les compétences en matière de sécurité routière. Améliorer la qualité du service client haut de gamme. Valider la formation continue obligatoire.',
  prerequis = 'Être titulaire d''une carte professionnelle de conducteur VTC en cours de validité ou expirée depuis moins de 5 ans.',
  public_concerne = 'Conducteurs VTC en activité devant renouveler leur carte professionnelle',
  competences_visees = ARRAY['Actualisation réglementaire VTC', 'Sécurité routière avancée', 'Service client premium', 'Gestes de premiers secours', 'Évolutions du marché VTC'],
  modalites_pedagogiques = 'Formation en présentiel sur 2 jours. Alternance théorie et ateliers pratiques. Focus sur le service haut de gamme.',
  modalites_evaluation = 'Évaluation des acquis par QCM. Mise en situation pratique. Attestation de formation continue obligatoire.',
  references_reglementaires = 'Décret n°2017-483 du 6 avril 2017. Article R3122-10 du Code des transports. Formation continue de 14 heures sur 5 ans.',
  zone_geographique = 'NAT',
  version = 1
WHERE code = 'VTC-CONT';

-- VMDTR-CONTINUE → FC-VMDTR-NAT-v1
UPDATE public.catalogue_formations SET
  code = 'FC-VMDTR-NAT-v1',
  intitule = 'Formation continue - Conducteur de VMDTR (Moto-taxi)',
  type_formation = 'continue',
  description = 'Formation continue obligatoire pour le renouvellement de la carte professionnelle de conducteur VMDTR.',
  duree_heures = 14,
  prix_ht = 250,
  objectifs = 'Actualiser les connaissances réglementaires VMDTR. Renforcer les compétences en sécurité spécifique deux-roues. Valider la formation continue obligatoire.',
  prerequis = 'Être titulaire d''une carte professionnelle VMDTR en cours de validité ou expirée depuis moins de 5 ans.',
  public_concerne = 'Conducteurs de moto-taxi en activité devant renouveler leur carte professionnelle',
  competences_visees = ARRAY['Actualisation réglementaire VMDTR', 'Sécurité deux-roues avancée', 'Premiers secours', 'Relation client', 'Prévention des risques spécifiques'],
  modalites_pedagogiques = 'Formation en présentiel sur 2 jours. Alternance théorie et pratique. Exercices spécifiques deux-roues.',
  modalites_evaluation = 'Évaluation des acquis par QCM. Évaluation pratique. Attestation de formation continue obligatoire.',
  references_reglementaires = 'Décret n°2017-483 du 6 avril 2017. Article R3123-10 du Code des transports. Formation continue de 14 heures sur 5 ans.',
  zone_geographique = 'NAT',
  version = 1
WHERE code = 'VMDTR-CONTINUE';

-- TAXI-MOB → MOB-TAXI-NAT-v1 (mobilité générique, sera complétée par 75/92)
UPDATE public.catalogue_formations SET
  code = 'MOB-TAXI-NAT-v1',
  intitule = 'Mobilité Taxi - Préparation générale',
  description = 'Formation de préparation à l''examen de mobilité taxi pour extension d''activité sur un nouveau département.',
  duree_heures = 14,
  prix_ht = 450,
  objectifs = 'Acquérir les connaissances pour passer l''examen de mobilité taxi. Maîtriser la réglementation locale applicable.',
  prerequis = 'Être titulaire d''une carte professionnelle de conducteur de taxi en cours de validité pour un autre département.',
  public_concerne = 'Conducteurs de taxi souhaitant étendre leur activité à un nouveau département',
  competences_visees = ARRAY['Réglementation locale', 'Topographie départementale', 'Tarification spécifique', 'Zones aéroportuaires'],
  modalites_pedagogiques = 'Formation en présentiel. Cours théoriques sur la réglementation. Exercices de topographie. Examens blancs.',
  modalites_evaluation = 'Évaluations continues. Examen blanc type mobilité. QCM de validation.',
  references_reglementaires = 'Décret n°2017-483 du 6 avril 2017. Code des transports.',
  zone_geographique = 'NAT',
  version = 1
WHERE code = 'TAXI-MOB';

-- Supprimer programmes non conformes sans sessions
DELETE FROM public.catalogue_formations WHERE code = 'PASS-VTC';
DELETE FROM public.catalogue_formations WHERE code = 'VMDTR-PASS';

-- Commentaire sur la table
COMMENT ON TABLE public.catalogue_formations IS 'Programmes de formation T3P conformes à la réglementation. Nomenclature : [TYPE]-[METIER]-[ZONE]-v[VERSION]. Types: INIT (initiale), FC (continue), MOB (mobilité). Métiers: TAXI, VTC, VMDTR. Zones: NAT (national), 75, 92, 93, 94. ATTENTION: MOB-VTC n''existe pas réglementairement.';