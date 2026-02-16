
-- Table principale des créneaux de conduite
CREATE TABLE public.creneaux_conduite (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  centre_id UUID REFERENCES public.centres(id) ON DELETE CASCADE,
  formateur_id UUID REFERENCES public.formateurs(id) ON DELETE SET NULL,
  vehicule_id UUID REFERENCES public.vehicules(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  fiche_pratique_id UUID REFERENCES public.fiches_pratique(id) ON DELETE SET NULL,
  date_creneau DATE NOT NULL,
  heure_debut TIME NOT NULL,
  heure_fin TIME NOT NULL,
  statut TEXT NOT NULL DEFAULT 'disponible' CHECK (statut IN ('disponible', 'reserve', 'confirme', 'en_cours', 'termine', 'annule', 'absent')),
  type_seance TEXT NOT NULL DEFAULT 'conduite' CHECK (type_seance IN ('conduite', 'code', 'examen_blanc', 'evaluation')),
  lieu_depart TEXT,
  lieu_arrivee TEXT,
  parcours TEXT,
  commentaires TEXT,
  recurrence_id UUID,
  reserve_par UUID,
  reserve_at TIMESTAMPTZ,
  confirme_par UUID,
  confirme_at TIMESTAMPTZ,
  annule_par UUID,
  annule_at TIMESTAMPTZ,
  motif_annulation TEXT,
  rappel_envoye BOOLEAN DEFAULT false,
  rappel_envoye_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX idx_creneaux_conduite_date ON creneaux_conduite(date_creneau);
CREATE INDEX idx_creneaux_conduite_formateur ON creneaux_conduite(formateur_id);
CREATE INDEX idx_creneaux_conduite_vehicule ON creneaux_conduite(vehicule_id);
CREATE INDEX idx_creneaux_conduite_contact ON creneaux_conduite(contact_id);
CREATE INDEX idx_creneaux_conduite_statut ON creneaux_conduite(statut);
CREATE INDEX idx_creneaux_conduite_centre ON creneaux_conduite(centre_id);
CREATE INDEX idx_creneaux_conduite_formateur_date ON creneaux_conduite(formateur_id, date_creneau, heure_debut, heure_fin) WHERE statut NOT IN ('annule');
CREATE INDEX idx_creneaux_conduite_vehicule_date ON creneaux_conduite(vehicule_id, date_creneau, heure_debut, heure_fin) WHERE statut NOT IN ('annule');
CREATE INDEX idx_creneaux_conduite_contact_date ON creneaux_conduite(contact_id, date_creneau, heure_debut, heure_fin) WHERE statut NOT IN ('annule');

-- Triggers
CREATE TRIGGER update_creneaux_conduite_updated_at
  BEFORE UPDATE ON creneaux_conduite
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER audit_creneaux_conduite
  AFTER INSERT OR UPDATE OR DELETE ON creneaux_conduite
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- RLS
ALTER TABLE creneaux_conduite ENABLE ROW LEVEL SECURITY;

-- Authenticated users with admin/staff role: full access
CREATE POLICY "Admin and staff can manage all creneaux"
  ON creneaux_conduite FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- All authenticated users can view creneaux (formateurs see planning)
CREATE POLICY "Authenticated users can view creneaux"
  ON creneaux_conduite FOR SELECT TO authenticated
  USING (true);

-- Fonction de détection de conflits
CREATE OR REPLACE FUNCTION public.check_creneau_conflicts(
  p_date DATE, p_heure_debut TIME, p_heure_fin TIME,
  p_formateur_id UUID DEFAULT NULL, p_vehicule_id UUID DEFAULT NULL,
  p_contact_id UUID DEFAULT NULL, p_exclude_id UUID DEFAULT NULL
)
RETURNS TABLE(conflict_type TEXT, conflict_id UUID, conflict_label TEXT, conflict_heure_debut TIME, conflict_heure_fin TIME)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF p_formateur_id IS NOT NULL THEN
    RETURN QUERY
    SELECT 'formateur'::TEXT, c.id, f.nom || ' ' || f.prenom, c.heure_debut, c.heure_fin
    FROM creneaux_conduite c JOIN formateurs f ON f.id = c.formateur_id
    WHERE c.formateur_id = p_formateur_id AND c.date_creneau = p_date AND c.statut NOT IN ('annule')
      AND (p_exclude_id IS NULL OR c.id != p_exclude_id)
      AND c.heure_debut < p_heure_fin AND c.heure_fin > p_heure_debut;
  END IF;
  IF p_vehicule_id IS NOT NULL THEN
    RETURN QUERY
    SELECT 'vehicule'::TEXT, c.id, v.marque || ' ' || v.modele || ' (' || v.immatriculation || ')', c.heure_debut, c.heure_fin
    FROM creneaux_conduite c JOIN vehicules v ON v.id = c.vehicule_id
    WHERE c.vehicule_id = p_vehicule_id AND c.date_creneau = p_date AND c.statut NOT IN ('annule')
      AND (p_exclude_id IS NULL OR c.id != p_exclude_id)
      AND c.heure_debut < p_heure_fin AND c.heure_fin > p_heure_debut;
  END IF;
  IF p_contact_id IS NOT NULL THEN
    RETURN QUERY
    SELECT 'apprenant'::TEXT, c.id, co.nom || ' ' || co.prenom, c.heure_debut, c.heure_fin
    FROM creneaux_conduite c JOIN contacts co ON co.id = c.contact_id
    WHERE c.contact_id = p_contact_id AND c.date_creneau = p_date AND c.statut NOT IN ('annule')
      AND (p_exclude_id IS NULL OR c.id != p_exclude_id)
      AND c.heure_debut < p_heure_fin AND c.heure_fin > p_heure_debut;
  END IF;
END;
$$;

-- Fonction de réservation pour apprenants
CREATE OR REPLACE FUNCTION public.reserver_creneau(p_creneau_id UUID, p_contact_id UUID)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_creneau RECORD; v_conflicts RECORD;
BEGIN
  SELECT * INTO v_creneau FROM creneaux_conduite WHERE id = p_creneau_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Créneau introuvable'); END IF;
  IF v_creneau.statut != 'disponible' THEN RETURN jsonb_build_object('success', false, 'error', 'Ce créneau n''est plus disponible'); END IF;
  
  SELECT * INTO v_conflicts FROM check_creneau_conflicts(v_creneau.date_creneau, v_creneau.heure_debut, v_creneau.heure_fin, NULL, NULL, p_contact_id, p_creneau_id) LIMIT 1;
  IF FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Vous avez déjà un créneau sur cette plage horaire'); END IF;
  
  UPDATE creneaux_conduite SET contact_id = p_contact_id, statut = 'reserve', reserve_at = now() WHERE id = p_creneau_id AND statut = 'disponible';
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Réservation impossible'); END IF;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.creneaux_conduite;
