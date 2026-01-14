-- ===========================================
-- PHASE 1: MODULE SUIVI PRATIQUE / CONDUITE
-- ===========================================

-- Table des véhicules
CREATE TABLE public.vehicules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  immatriculation TEXT NOT NULL UNIQUE,
  marque TEXT NOT NULL,
  modele TEXT NOT NULL,
  type_vehicule TEXT NOT NULL DEFAULT 'voiture', -- voiture, scooter, moto
  categorie TEXT NOT NULL DEFAULT 'taxi', -- taxi, vtc, vmdtr
  date_mise_circulation DATE,
  date_controle_technique DATE,
  date_assurance DATE,
  statut TEXT NOT NULL DEFAULT 'disponible', -- disponible, en_service, maintenance, hors_service
  notes TEXT,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table fiche pratique par apprenant
CREATE TABLE public.fiches_pratique (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  formation_type TEXT NOT NULL, -- TAXI, VTC, VMDTR
  heures_prevues INTEGER NOT NULL DEFAULT 0,
  heures_realisees INTEGER NOT NULL DEFAULT 0,
  date_debut DATE,
  date_fin_prevue DATE,
  statut TEXT NOT NULL DEFAULT 'non_commencee', -- non_commencee, en_cours, pret_examen, examen_planifie, reussi, echoue
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(contact_id, formation_type)
);

-- Table des séances de conduite
CREATE TABLE public.seances_conduite (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fiche_pratique_id UUID NOT NULL REFERENCES public.fiches_pratique(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  formateur_id UUID REFERENCES public.formateurs(id),
  vehicule_id UUID REFERENCES public.vehicules(id),
  date_seance DATE NOT NULL,
  heure_debut TIME NOT NULL,
  heure_fin TIME NOT NULL,
  duree_minutes INTEGER NOT NULL,
  type_seance TEXT NOT NULL DEFAULT 'conduite', -- conduite, simulation, evaluation, rattrapage
  parcours TEXT, -- urbain, périurbain, autoroute, mixte
  observations TEXT,
  competences_travaillees TEXT[],
  note_globale INTEGER, -- 1-5
  validation_formateur BOOLEAN DEFAULT false,
  date_validation TIMESTAMP WITH TIME ZONE,
  signature_data TEXT,
  signature_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table progression pédagogique
CREATE TABLE public.progression_pedagogique (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fiche_pratique_id UUID NOT NULL REFERENCES public.fiches_pratique(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  date_evaluation DATE NOT NULL DEFAULT CURRENT_DATE,
  competence TEXT NOT NULL,
  niveau INTEGER NOT NULL DEFAULT 1, -- 1-5: Non acquis, En cours, Acquis partiellement, Acquis, Maîtrisé
  commentaire TEXT,
  formateur_id UUID REFERENCES public.formateurs(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table examens pratiques
CREATE TABLE public.examens_pratique (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fiche_pratique_id UUID NOT NULL REFERENCES public.fiches_pratique(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  type_examen TEXT NOT NULL, -- taxi, vtc, vmdtr
  date_examen DATE NOT NULL,
  heure_examen TIME,
  centre_examen TEXT,
  adresse_centre TEXT,
  statut TEXT NOT NULL DEFAULT 'planifie', -- planifie, passe, reussi, echoue, absent, reporte
  resultat TEXT, -- admis, ajourne, absent
  score NUMERIC,
  observations TEXT,
  document_resultat_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ===========================================
-- PHASE 1: MODULE CONTRATS DE LOCATION
-- ===========================================

-- Type enum pour contrat location
DO $$ BEGIN
  CREATE TYPE contrat_location_type AS ENUM ('vehicule', 'materiel', 'autre');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE contrat_location_statut AS ENUM ('brouillon', 'envoye', 'signe', 'refuse', 'expire', 'resilie');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Table contrats de location
CREATE TABLE public.contrats_location (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  numero_contrat TEXT NOT NULL UNIQUE,
  type_contrat contrat_location_type NOT NULL DEFAULT 'vehicule',
  vehicule_id UUID REFERENCES public.vehicules(id),
  objet_location TEXT NOT NULL, -- description de l'objet loué
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  montant_mensuel NUMERIC NOT NULL DEFAULT 0,
  montant_caution NUMERIC DEFAULT 0,
  modalite_paiement TEXT DEFAULT 'mensuel', -- mensuel, trimestriel, annuel
  statut contrat_location_statut NOT NULL DEFAULT 'brouillon',
  template_file_id UUID REFERENCES public.document_template_files(id),
  document_genere_path TEXT,
  document_signe_path TEXT,
  date_envoi TIMESTAMP WITH TIME ZONE,
  date_signature TIMESTAMP WITH TIME ZONE,
  signature_data TEXT,
  signature_ip TEXT,
  signature_user_agent TEXT,
  conditions_particulieres TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table historique des contrats (audit trail)
CREATE TABLE public.contrats_location_historique (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contrat_id UUID NOT NULL REFERENCES public.contrats_location(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- creation, modification, envoi, signature, resiliation
  ancien_statut TEXT,
  nouveau_statut TEXT,
  details TEXT,
  user_id UUID,
  user_email TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ===========================================
-- ENABLE RLS
-- ===========================================

ALTER TABLE public.vehicules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiches_pratique ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seances_conduite ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progression_pedagogique ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.examens_pratique ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contrats_location ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contrats_location_historique ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- RLS POLICIES
-- ===========================================

-- Vehicules policies
CREATE POLICY "Staff can select vehicules" ON public.vehicules FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "Staff can insert vehicules" ON public.vehicules FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "Staff can update vehicules" ON public.vehicules FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "Admin can delete vehicules" ON public.vehicules FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Fiches pratique policies
CREATE POLICY "Staff can select fiches_pratique" ON public.fiches_pratique FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "Staff can insert fiches_pratique" ON public.fiches_pratique FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "Staff can update fiches_pratique" ON public.fiches_pratique FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "Staff can delete fiches_pratique" ON public.fiches_pratique FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- Seances conduite policies
CREATE POLICY "Staff can select seances_conduite" ON public.seances_conduite FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "Staff can insert seances_conduite" ON public.seances_conduite FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "Staff can update seances_conduite" ON public.seances_conduite FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "Staff can delete seances_conduite" ON public.seances_conduite FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- Progression pedagogique policies
CREATE POLICY "Staff can select progression_pedagogique" ON public.progression_pedagogique FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "Staff can insert progression_pedagogique" ON public.progression_pedagogique FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "Staff can update progression_pedagogique" ON public.progression_pedagogique FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "Staff can delete progression_pedagogique" ON public.progression_pedagogique FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- Examens pratique policies
CREATE POLICY "Staff can select examens_pratique" ON public.examens_pratique FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "Staff can insert examens_pratique" ON public.examens_pratique FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "Staff can update examens_pratique" ON public.examens_pratique FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "Staff can delete examens_pratique" ON public.examens_pratique FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- Contrats location policies
CREATE POLICY "Staff can select contrats_location" ON public.contrats_location FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "Staff can insert contrats_location" ON public.contrats_location FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "Staff can update contrats_location" ON public.contrats_location FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "Admin can delete contrats_location" ON public.contrats_location FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Contrats historique policies
CREATE POLICY "Staff can select contrats_location_historique" ON public.contrats_location_historique FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "Staff can insert contrats_location_historique" ON public.contrats_location_historique FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- ===========================================
-- TRIGGERS
-- ===========================================

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_vehicules_updated_at
  BEFORE UPDATE ON public.vehicules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fiches_pratique_updated_at
  BEFORE UPDATE ON public.fiches_pratique
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_seances_conduite_updated_at
  BEFORE UPDATE ON public.seances_conduite
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_progression_pedagogique_updated_at
  BEFORE UPDATE ON public.progression_pedagogique
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_examens_pratique_updated_at
  BEFORE UPDATE ON public.examens_pratique
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contrats_location_updated_at
  BEFORE UPDATE ON public.contrats_location
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Fonction pour calculer les heures réalisées
CREATE OR REPLACE FUNCTION public.update_heures_realisees()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.fiches_pratique
  SET heures_realisees = (
    SELECT COALESCE(SUM(duree_minutes) / 60, 0)
    FROM public.seances_conduite
    WHERE fiche_pratique_id = COALESCE(NEW.fiche_pratique_id, OLD.fiche_pratique_id)
  )
  WHERE id = COALESCE(NEW.fiche_pratique_id, OLD.fiche_pratique_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_heures_after_seance
  AFTER INSERT OR UPDATE OR DELETE ON public.seances_conduite
  FOR EACH ROW EXECUTE FUNCTION public.update_heures_realisees();

-- Fonction pour générer numéro de contrat
CREATE OR REPLACE FUNCTION public.generate_numero_contrat()
RETURNS TEXT AS $$
DECLARE
  year_prefix TEXT;
  next_num INTEGER;
  result TEXT;
BEGIN
  year_prefix := TO_CHAR(CURRENT_DATE, 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero_contrat FROM 6) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.contrats_location
  WHERE numero_contrat LIKE 'LOC-' || year_prefix || '-%';
  result := 'LOC-' || year_prefix || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fonction pour logger l'historique des contrats
CREATE OR REPLACE FUNCTION public.log_contrat_historique()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.contrats_location_historique (contrat_id, action, nouveau_statut, details, user_id)
    VALUES (NEW.id, 'creation', NEW.statut::TEXT, 'Création du contrat', NEW.created_by);
  ELSIF TG_OP = 'UPDATE' AND OLD.statut IS DISTINCT FROM NEW.statut THEN
    INSERT INTO public.contrats_location_historique (contrat_id, action, ancien_statut, nouveau_statut, details)
    VALUES (NEW.id, 'modification_statut', OLD.statut::TEXT, NEW.statut::TEXT, 'Changement de statut');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER log_contrat_changes
  AFTER INSERT OR UPDATE ON public.contrats_location
  FOR EACH ROW EXECUTE FUNCTION public.log_contrat_historique();