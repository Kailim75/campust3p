
-- 1. Add formation_category column to document_packs (if not already added by partial migration)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='document_packs' AND column_name='formation_category') THEN
    ALTER TABLE public.document_packs ADD COLUMN formation_category TEXT DEFAULT NULL;
  END IF;
END $$;

-- 2. Create Template Studio templates for VTC
INSERT INTO public.template_studio_templates (
  id, centre_id, type, format, name, description, template_body,
  status, is_active, track_scope, category, applies_to, version
) VALUES
(
  'a2000001-aaaa-4aaa-aaaa-000000000001',
  (SELECT centre_id FROM public.user_centres LIMIT 1),
  'contrat', 'html',
  'Contrat de formation VTC',
  'Contrat de formation professionnelle pour le parcours VTC initial',
  '<h1>CONTRAT DE FORMATION PROFESSIONNELLE</h1><h2>Formation VTC — Parcours Initial</h2><p><strong>Entre :</strong></p><p>Le centre de formation : {{centre_nom}}, {{centre_adresse}}, NDA : {{centre_nda}}, SIRET : {{centre_siret}}</p><p><strong>Et :</strong></p><p>{{civilite}} {{prenom}} {{nom}}, né(e) le {{date_naissance}} à {{ville_naissance}}</p><p>Adresse : {{rue}}, {{code_postal}} {{ville}}</p><p>Email : {{email}} — Tél : {{telephone}}</p><hr/><h3>Article 1 — Objet</h3><p>Le présent contrat a pour objet la formation professionnelle de conducteur VTC conformément au décret n°2015-1252.</p><h3>Article 2 — Nature et caractéristiques</h3><p>Intitulé : {{session_nom}}</p><p>Durée : {{session_duree_heures}} heures</p><p>Dates : du {{session_date_debut}} au {{session_date_fin}}</p><h3>Article 3 — Prix</h3><p>Montant total : {{montant_formation}} € TTC</p><h3>Article 4 — Modalités de paiement</h3><p>Le paiement est dû selon l''échéancier convenu entre les parties.</p><h3>Article 5 — Délai de rétractation</h3><p>Conformément à l''article L.6353-5 du Code du travail, le stagiaire dispose d''un délai de 10 jours à compter de la signature pour se rétracter.</p><h3>Article 6 — Conditions de résiliation</h3><p>En cas d''abandon en cours de formation, seules les heures effectuées seront facturées.</p>',
  'published', true, 'initial', 'formation', 'inscription', 1
),
(
  'a2000001-aaaa-4aaa-aaaa-000000000002',
  (SELECT centre_id FROM public.user_centres LIMIT 1),
  'contrat', 'html',
  'Contrat de formation Passerelle VTC',
  'Contrat de formation Passerelle Taxi vers VTC',
  '<h1>CONTRAT DE FORMATION PROFESSIONNELLE</h1><h2>Formation Passerelle Taxi → VTC</h2><p><strong>Entre :</strong></p><p>Le centre de formation : {{centre_nom}}, {{centre_adresse}}, NDA : {{centre_nda}}, SIRET : {{centre_siret}}</p><p><strong>Et :</strong></p><p>{{civilite}} {{prenom}} {{nom}}, né(e) le {{date_naissance}} à {{ville_naissance}}</p><p>Adresse : {{rue}}, {{code_postal}} {{ville}}</p><p>Email : {{email}} — Tél : {{telephone}}</p><hr/><h3>Article 1 — Objet</h3><p>Le présent contrat a pour objet la formation passerelle permettant aux titulaires d''une carte professionnelle Taxi d''obtenir la carte VTC.</p><h3>Article 2 — Nature et caractéristiques</h3><p>Intitulé : {{session_nom}}</p><p>Durée : {{session_duree_heures}} heures</p><p>Dates : du {{session_date_debut}} au {{session_date_fin}}</p><h3>Article 3 — Prérequis</h3><p>Le stagiaire certifie être titulaire d''une carte professionnelle de conducteur de Taxi en cours de validité.</p><h3>Article 4 — Prix</h3><p>Montant total : {{montant_formation}} € TTC</p><h3>Article 5 — Délai de rétractation</h3><p>Conformément à l''article L.6353-5, le stagiaire dispose d''un délai de 10 jours pour se rétracter.</p>',
  'published', true, 'continuing', 'formation', 'inscription', 1
),
(
  'a2000001-aaaa-4aaa-aaaa-000000000003',
  (SELECT centre_id FROM public.user_centres LIMIT 1),
  'programme', 'html',
  'Programme de formation VTC',
  'Programme détaillé de la formation VTC initiale',
  '<h1>PROGRAMME DE FORMATION</h1><h2>Conducteur de VTC — Formation Initiale</h2><p><strong>Durée :</strong> {{session_duree_heures}} heures</p><p><strong>Dates :</strong> du {{session_date_debut}} au {{session_date_fin}}</p><hr/><h3>Objectifs pédagogiques</h3><ul><li>Maîtriser la réglementation T3P applicable aux VTC</li><li>Acquérir les compétences de gestion d''une activité VTC</li><li>Développer les compétences en relation client et sécurité routière</li><li>Préparer l''examen de la carte professionnelle VTC</li></ul><h3>Public visé</h3><p>Toute personne souhaitant exercer l''activité de conducteur VTC.</p><h3>Prérequis</h3><ul><li>Permis B depuis au moins 3 ans</li><li>Aptitude médicale</li><li>Casier judiciaire compatible</li></ul><h3>Contenu</h3><p><strong>Module 1 — Réglementation T3P</strong></p><p><strong>Module 2 — Gestion</strong></p><p><strong>Module 3 — Sécurité routière</strong></p><p><strong>Module 4 — Développement commercial</strong></p><p><strong>Module 5 — Langues</strong></p><h3>Modalités d''évaluation</h3><p>Évaluations continues + examen blanc.</p><h3>Accessibilité</h3><p>Formation accessible aux personnes en situation de handicap.</p>',
  'published', true, 'initial', 'formation', 'inscription', 1
),
(
  'a2000001-aaaa-4aaa-aaaa-000000000004',
  (SELECT centre_id FROM public.user_centres LIMIT 1),
  'programme', 'html',
  'Programme de formation Passerelle VTC',
  'Programme détaillé Passerelle Taxi vers VTC',
  '<h1>PROGRAMME DE FORMATION</h1><h2>Passerelle Taxi → VTC</h2><p><strong>Durée :</strong> {{session_duree_heures}} heures</p><p><strong>Dates :</strong> du {{session_date_debut}} au {{session_date_fin}}</p><hr/><h3>Objectifs pédagogiques</h3><ul><li>Acquérir les spécificités réglementaires VTC</li><li>Maîtriser les outils de réservation VTC</li><li>Adapter ses compétences Taxi au métier VTC</li></ul><h3>Public visé</h3><p>Conducteurs Taxi titulaires d''une carte professionnelle valide.</p><h3>Prérequis</h3><ul><li>Carte professionnelle Taxi valide</li><li>Permis B en cours de validité</li></ul><h3>Contenu</h3><p><strong>Module 1 — Spécificités réglementaires VTC</strong></p><p><strong>Module 2 — Gestion commerciale VTC</strong></p><p><strong>Module 3 — Mise en situation</strong></p><h3>Modalités d''évaluation</h3><p>Évaluation continue et mise en situation professionnelle.</p><h3>Accessibilité</h3><p>Formation accessible aux personnes en situation de handicap.</p>',
  'published', true, 'continuing', 'formation', 'inscription', 1
);

-- 3. Create DOCX template file entries
INSERT INTO public.document_template_files (
  nom, description, type_fichier, file_path, categorie, actif,
  formation_type, type_document, is_default, centre_id
) VALUES
(
  'Contrat de formation VTC',
  'Contrat de formation professionnelle VTC initial (DOCX)',
  'docx', 'templates/contrat-formation-vtc.docx',
  'administratif', true,
  'VTC', 'contrat', true,
  (SELECT centre_id FROM public.user_centres LIMIT 1)
),
(
  'Contrat de formation Passerelle VTC',
  'Contrat Passerelle Taxi vers VTC (DOCX)',
  'docx', 'templates/contrat-formation-passerelle-vtc.docx',
  'administratif', true,
  'Passerelle Taxi vers VTC', 'contrat', true,
  (SELECT centre_id FROM public.user_centres LIMIT 1)
),
(
  'Programme de formation VTC',
  'Programme détaillé formation VTC initiale (DOCX)',
  'docx', 'templates/programme-formation-vtc.docx',
  'formation', true,
  'VTC', 'programme', true,
  (SELECT centre_id FROM public.user_centres LIMIT 1)
),
(
  'Programme de formation Passerelle VTC',
  'Programme Passerelle Taxi vers VTC (DOCX)',
  'docx', 'templates/programme-formation-passerelle-vtc.docx',
  'formation', true,
  'Passerelle Taxi vers VTC', 'programme', true,
  (SELECT centre_id FROM public.user_centres LIMIT 1)
);

-- 4. Create VTC-specific document packs
INSERT INTO public.document_packs (
  id, centre_id, name, track_scope, applies_to, is_default, formation_category
) VALUES
(
  'c3000001-aaaa-4aaa-aaaa-000000000001',
  (SELECT centre_id FROM public.user_centres LIMIT 1),
  'Pack VTC Initial',
  'initial', 'inscription', true,
  'VTC'
),
(
  'c3000001-aaaa-4aaa-aaaa-000000000002',
  (SELECT centre_id FROM public.user_centres LIMIT 1),
  'Pack Passerelle VTC',
  'continuing', 'inscription', true,
  'VTC'
);

-- 5. Link pack items
INSERT INTO public.document_pack_items (pack_id, template_id, sort_order, is_required, auto_generate) VALUES
('c3000001-aaaa-4aaa-aaaa-000000000001', 'a2000001-aaaa-4aaa-aaaa-000000000001', 1, true, true),
('c3000001-aaaa-4aaa-aaaa-000000000001', 'a2000001-aaaa-4aaa-aaaa-000000000003', 2, true, true),
('c3000001-aaaa-4aaa-aaaa-000000000002', 'a2000001-aaaa-4aaa-aaaa-000000000002', 1, true, true),
('c3000001-aaaa-4aaa-aaaa-000000000002', 'a2000001-aaaa-4aaa-aaaa-000000000004', 2, true, true);
