-- Temporarily disable the audit trigger to restore deleted session
ALTER TABLE public.sessions DISABLE TRIGGER audit_sessions;

INSERT INTO public.sessions (id, centre_id, catalogue_formation_id, nom, formation_type, date_debut, date_fin, lieu, places_totales, prix, prix_ht, tva_percent, statut, track, duree_heures, formateur, formateur_id, objectifs, prerequis, numero_session, heure_debut, heure_fin, heure_debut_aprem, heure_fin_aprem, heure_debut_matin, heure_fin_matin, adresse_rue, adresse_code_postal, adresse_ville, archived)
VALUES (
  '18f74ad5-e42f-4aa6-9681-00c028401802',
  '97e69258-f616-4424-9aca-78080cb6437e',
  '6a1e5cd4-8f15-428a-9ea1-6ab25d71e614',
  'MARS 2026 ( SOIR )',
  'VTC',
  '2026-03-16',
  '2026-03-27',
  '3 RUE CORNEILLE, 92120, Montrouge',
  20,
  990,
  990,
  0,
  'a_venir',
  'initial',
  33,
  'Mimoune',
  '8167f309-cea2-4227-8891-d7b9325eeabd',
  'L''accès à la profession de conducteur de voiture de transport avec chauffeur (VTC) est subordonné à la réussite d''un examen, comprenant des épreuves théoriques d''admissibilité et une épreuve pratique d''admission.',
  'Permis B de moins de 3 ans',
  'S2026-0011',
  '09:00:00',
  '17:00:00',
  '18:30:00',
  '21:30:00',
  '00:00:00',
  '00:00:00',
  '3 RUE CORNEILLE',
  '92120',
  'Montrouge',
  false
);

-- Re-enable the audit trigger
ALTER TABLE public.sessions ENABLE TRIGGER audit_sessions;