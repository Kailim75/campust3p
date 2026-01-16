-- Table 1 : Réponses satisfaction
CREATE TABLE satisfaction_reponses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  session_id uuid REFERENCES sessions(id) ON DELETE SET NULL,
  type_questionnaire text DEFAULT 'fin_formation' CHECK (type_questionnaire IN ('inscription', 'fin_formation', 'post_formation')),
  
  note_globale integer CHECK (note_globale BETWEEN 1 AND 10),
  note_formateur integer CHECK (note_formateur BETWEEN 1 AND 10),
  note_supports integer CHECK (note_supports BETWEEN 1 AND 10),
  note_locaux integer CHECK (note_locaux BETWEEN 1 AND 10),
  nps_score integer CHECK (nps_score BETWEEN 0 AND 10),
  
  objectifs_atteints text CHECK (objectifs_atteints IN ('totalement', 'partiellement', 'non')),
  commentaire text,
  
  date_reponse timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Table 2 : Réclamations
CREATE TABLE reclamations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  session_id uuid REFERENCES sessions(id) ON DELETE SET NULL,
  
  titre text NOT NULL,
  description text NOT NULL,
  categorie text DEFAULT 'autre' CHECK (categorie IN ('pedagogique', 'administratif', 'materiel', 'formateur', 'locaux', 'autre')),
  priorite text DEFAULT 'moyenne' CHECK (priorite IN ('basse', 'moyenne', 'haute', 'critique')),
  statut text DEFAULT 'nouvelle' CHECK (statut IN ('nouvelle', 'en_cours', 'resolue', 'cloturee')),
  
  resolution text,
  date_resolution timestamptz,
  delai_traitement_jours integer,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index
CREATE INDEX idx_satisfaction_contact ON satisfaction_reponses(contact_id);
CREATE INDEX idx_satisfaction_session ON satisfaction_reponses(session_id);
CREATE INDEX idx_satisfaction_date ON satisfaction_reponses(date_reponse);
CREATE INDEX idx_reclamations_contact ON reclamations(contact_id);
CREATE INDEX idx_reclamations_statut ON reclamations(statut);
CREATE INDEX idx_reclamations_priorite ON reclamations(priorite);

-- RLS Satisfaction
ALTER TABLE satisfaction_reponses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can select satisfaction_reponses"
ON satisfaction_reponses FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can insert satisfaction_reponses"
ON satisfaction_reponses FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can update satisfaction_reponses"
ON satisfaction_reponses FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can delete satisfaction_reponses"
ON satisfaction_reponses FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- RLS Réclamations
ALTER TABLE reclamations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can select reclamations"
ON reclamations FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can insert reclamations"
ON reclamations FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can update reclamations"
ON reclamations FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Admin can delete reclamations"
ON reclamations FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));