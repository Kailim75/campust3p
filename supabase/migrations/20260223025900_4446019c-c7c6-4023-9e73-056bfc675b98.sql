
-- Enums for the new tables
CREATE TYPE public.type_seance_conduite AS ENUM ('conduite_preventive', 'conduite_ville', 'accompagnement_examen');
CREATE TYPE public.statut_reservation_conduite AS ENUM ('confirmee', 'annulee_eleve', 'annulee_formateur', 'no_show', 'realisee');
CREATE TYPE public.niveau_conduite AS ENUM ('debutant', 'intermediaire', 'avance', 'pret_examen');
CREATE TYPE public.categorie_ressource_conduite AS ENUM ('regles_centre', 'regles_formateur', 'deroulement_examen', 'adresses_secteur', 'checklist_jour_j', 'conseils_conduite', 'documents_apporter');
CREATE TYPE public.type_contenu_ressource AS ENUM ('texte', 'liste', 'carte', 'pdf', 'video');
CREATE TYPE public.formation_cible_conduite AS ENUM ('taxi_initial', 'vtc', 'vmdtr', 'tous');

-- Add missing columns to existing creneaux_conduite
ALTER TABLE public.creneaux_conduite
  ADD COLUMN IF NOT EXISTS capacite_max int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS notes_formateur text;

-- Table reservations_conduite
CREATE TABLE public.reservations_conduite (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creneau_id uuid NOT NULL REFERENCES public.creneaux_conduite(id) ON DELETE RESTRICT,
  apprenant_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  statut statut_reservation_conduite NOT NULL DEFAULT 'confirmee',
  motif_annulation text,
  rappel_24h_envoye boolean DEFAULT false,
  rappel_2h_envoye boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(creneau_id, apprenant_id)
);

-- Table compte_rendu_seance
CREATE TABLE public.compte_rendu_seance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES public.reservations_conduite(id) ON DELETE CASCADE,
  formateur_id uuid REFERENCES public.formateurs(id),
  duree_reelle_minutes int,
  points_travailles text[],
  points_positifs text,
  points_ameliorer text,
  niveau_global niveau_conduite NOT NULL DEFAULT 'debutant',
  recommandation_seances_sup int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Table ressources_conduite
CREATE TABLE public.ressources_conduite (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titre text NOT NULL,
  categorie categorie_ressource_conduite NOT NULL,
  type_contenu type_contenu_ressource NOT NULL,
  contenu text NOT NULL,
  formation_cible formation_cible_conduite DEFAULT 'tous',
  ordre_affichage int DEFAULT 0,
  visible_eleve boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Table progression_conduite
CREATE TABLE public.progression_conduite (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apprenant_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE UNIQUE,
  heures_preventive_realisees numeric(5,2) DEFAULT 0,
  heures_ville_realisees numeric(5,2) DEFAULT 0,
  accompagnement_examen_fait boolean DEFAULT false,
  date_dernier_bilan date,
  niveau_actuel niveau_conduite DEFAULT 'debutant',
  commentaire_global text,
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.reservations_conduite ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compte_rendu_seance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ressources_conduite ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progression_conduite ENABLE ROW LEVEL SECURITY;

-- reservations_conduite policies
CREATE POLICY "Admin full reservations_c" ON public.reservations_conduite FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff full reservations_c" ON public.reservations_conduite FOR ALL USING (public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Formateur read reservations_c" ON public.reservations_conduite FOR SELECT USING (
  public.has_role(auth.uid(), 'formateur')
);

-- compte_rendu_seance policies
CREATE POLICY "Admin read compte_rendu" ON public.compte_rendu_seance FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff read compte_rendu" ON public.compte_rendu_seance FOR SELECT USING (public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Formateur crud compte_rendu" ON public.compte_rendu_seance FOR ALL USING (public.has_role(auth.uid(), 'formateur'));

-- ressources_conduite policies
CREATE POLICY "Admin crud ressources_c" ON public.ressources_conduite FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Auth read ressources_c" ON public.ressources_conduite FOR SELECT TO authenticated USING (visible_eleve = true OR public.has_role(auth.uid(), 'admin'));

-- progression_conduite policies
CREATE POLICY "Admin full progression_c" ON public.progression_conduite FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff read progression_c" ON public.progression_conduite FOR SELECT USING (public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Formateur crud progression_c" ON public.progression_conduite FOR ALL USING (public.has_role(auth.uid(), 'formateur'));
