-- =============================================
-- BIM PÉDAGOGIQUE - Schéma de données
-- Phase 1 : Projets et Scènes
-- Phase 2 : Interactions et Évaluations
-- =============================================

-- Enum pour le type de formation
CREATE TYPE bim_formation_type AS ENUM ('commun', 'taxi', 'vtc');

-- Enum pour le statut des projets
CREATE TYPE bim_projet_statut AS ENUM ('brouillon', 'actif', 'archive');

-- Enum pour la progression apprenant
CREATE TYPE bim_progression_statut AS ENUM ('non_commence', 'en_cours', 'evalue', 'valide', 'a_reprendre');

-- Enum pour le type d'évaluation
CREATE TYPE bim_evaluation_type AS ENUM ('qcm_contextuel', 'identification_poi', 'sequencage', 'annotation');

-- =============================================
-- TABLE: bim_projets
-- Projets BIM pédagogiques liés aux modules LMS
-- =============================================
CREATE TABLE public.bim_projets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  titre TEXT NOT NULL,
  description TEXT,
  
  -- Liens LMS (optionnels, un projet peut être lié à un module ou une leçon)
  module_id UUID REFERENCES public.lms_modules(id) ON DELETE SET NULL,
  lesson_id UUID REFERENCES public.lms_lessons(id) ON DELETE SET NULL,
  
  -- Configuration pédagogique
  type_formation bim_formation_type NOT NULL DEFAULT 'commun',
  competences_cibles TEXT[] NOT NULL DEFAULT '{}',
  objectifs_pedagogiques TEXT,
  
  -- État et configuration
  statut bim_projet_statut NOT NULL DEFAULT 'brouillon',
  duree_estimee_min INTEGER DEFAULT 15,
  seuil_validation_pct INTEGER DEFAULT 70,
  
  -- Configuration visionneuse (paramètres caméra, UI, etc.)
  viewer_config JSONB DEFAULT '{}',
  
  -- Métadonnées
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour recherche par module/lesson
CREATE INDEX idx_bim_projets_module ON public.bim_projets(module_id);
CREATE INDEX idx_bim_projets_lesson ON public.bim_projets(lesson_id);
CREATE INDEX idx_bim_projets_statut ON public.bim_projets(statut);
CREATE INDEX idx_bim_projets_type ON public.bim_projets(type_formation);

-- =============================================
-- TABLE: bim_scenes
-- Scènes 3D au sein d'un projet BIM
-- =============================================
CREATE TABLE public.bim_scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projet_id UUID NOT NULL REFERENCES public.bim_projets(id) ON DELETE CASCADE,
  
  -- Ordre et identification
  ordre INTEGER NOT NULL DEFAULT 1,
  titre TEXT NOT NULL,
  description TEXT,
  consignes TEXT, -- Instructions pour l'apprenant
  
  -- Fichier 3D (URL vers storage ou externe)
  fichier_3d_url TEXT,
  fichier_3d_format TEXT DEFAULT 'gltf', -- gltf, glb, ifc
  thumbnail_url TEXT,
  
  -- Points d'intérêt interactifs
  -- Format: [{ id, label, position: {x,y,z}, type, question_id?, info? }]
  points_interet JSONB DEFAULT '[]',
  
  -- Questions contextuelles liées à cette scène
  -- Format: [{ id, enonce, type, reponses: [{id, texte, is_correct}], points }]
  questions_contextuelles JSONB DEFAULT '[]',
  
  -- Configuration caméra initiale
  camera_config JSONB DEFAULT '{}',
  
  -- Durée estimée pour cette scène
  duree_estimee_min INTEGER DEFAULT 5,
  
  -- Métadonnées
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX idx_bim_scenes_projet ON public.bim_scenes(projet_id);
CREATE INDEX idx_bim_scenes_ordre ON public.bim_scenes(projet_id, ordre);

-- =============================================
-- TABLE: bim_interactions
-- Suivi des interactions apprenants avec les scènes
-- =============================================
CREATE TABLE public.bim_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Liens
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  projet_id UUID NOT NULL REFERENCES public.bim_projets(id) ON DELETE CASCADE,
  scene_id UUID NOT NULL REFERENCES public.bim_scenes(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  
  -- Progression
  statut bim_progression_statut NOT NULL DEFAULT 'non_commence',
  
  -- Temps passé
  temps_passe_sec INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Données d'interaction
  -- Format: [{ timestamp, type, poi_id?, action, data? }]
  actions_log JSONB DEFAULT '[]',
  
  -- POI consultés
  poi_consultes TEXT[] DEFAULT '{}',
  
  -- Métadonnées
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Contrainte unicité: un contact ne peut avoir qu'une interaction par scène
  UNIQUE(contact_id, scene_id)
);

-- Index
CREATE INDEX idx_bim_interactions_contact ON public.bim_interactions(contact_id);
CREATE INDEX idx_bim_interactions_projet ON public.bim_interactions(projet_id);
CREATE INDEX idx_bim_interactions_statut ON public.bim_interactions(statut);

-- =============================================
-- TABLE: bim_evaluations
-- Résultats des évaluations BIM
-- =============================================
CREATE TABLE public.bim_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Liens
  interaction_id UUID NOT NULL REFERENCES public.bim_interactions(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  projet_id UUID NOT NULL REFERENCES public.bim_projets(id) ON DELETE CASCADE,
  scene_id UUID NOT NULL REFERENCES public.bim_scenes(id) ON DELETE CASCADE,
  
  -- Type et résultat
  type_evaluation bim_evaluation_type NOT NULL,
  tentative_numero INTEGER NOT NULL DEFAULT 1,
  
  -- Scores
  score_pct INTEGER NOT NULL DEFAULT 0,
  nb_correct INTEGER DEFAULT 0,
  nb_total INTEGER DEFAULT 0,
  points_obtenus NUMERIC(5,2) DEFAULT 0,
  points_max NUMERIC(5,2) DEFAULT 0,
  
  -- Réussite
  reussi BOOLEAN NOT NULL DEFAULT false,
  seuil_applique INTEGER NOT NULL,
  
  -- Détails des réponses
  -- Format: [{ question_id, reponse_ids, is_correct, points }]
  reponses_detail JSONB DEFAULT '[]',
  
  -- Annotations (pour type annotation)
  annotations JSONB DEFAULT '[]',
  
  -- Temps
  temps_passe_sec INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Métadonnées
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX idx_bim_evaluations_contact ON public.bim_evaluations(contact_id);
CREATE INDEX idx_bim_evaluations_projet ON public.bim_evaluations(projet_id);
CREATE INDEX idx_bim_evaluations_interaction ON public.bim_evaluations(interaction_id);
CREATE INDEX idx_bim_evaluations_reussi ON public.bim_evaluations(reussi);

-- =============================================
-- TABLE: bim_progressions
-- Vue agrégée de la progression par projet/contact
-- =============================================
CREATE TABLE public.bim_progressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  projet_id UUID NOT NULL REFERENCES public.bim_projets(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  
  -- Progression globale
  statut bim_progression_statut NOT NULL DEFAULT 'non_commence',
  scenes_completees INTEGER DEFAULT 0,
  scenes_total INTEGER DEFAULT 0,
  progression_pct INTEGER DEFAULT 0,
  
  -- Scores agrégés
  score_moyen_pct INTEGER,
  meilleur_score_pct INTEGER,
  
  -- Temps total
  temps_total_sec INTEGER DEFAULT 0,
  
  -- Dates
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  validated_at TIMESTAMPTZ,
  
  -- Métadonnées
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(contact_id, projet_id)
);

-- Index
CREATE INDEX idx_bim_progressions_contact ON public.bim_progressions(contact_id);
CREATE INDEX idx_bim_progressions_projet ON public.bim_progressions(projet_id);
CREATE INDEX idx_bim_progressions_statut ON public.bim_progressions(statut);

-- =============================================
-- RLS POLICIES
-- =============================================

-- Enable RLS
ALTER TABLE public.bim_projets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bim_scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bim_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bim_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bim_progressions ENABLE ROW LEVEL SECURITY;

-- Policies pour bim_projets (lecture tous, écriture staff/admin)
CREATE POLICY "Projets BIM visibles par staff/admin"
  ON public.bim_projets FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Projets BIM modifiables par staff/admin"
  ON public.bim_projets FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- Policies pour bim_scenes
CREATE POLICY "Scènes BIM visibles par staff/admin"
  ON public.bim_scenes FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Scènes BIM modifiables par staff/admin"
  ON public.bim_scenes FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- Policies pour bim_interactions (staff voit tout, learner voit les siennes via RPC)
CREATE POLICY "Interactions BIM visibles par staff/admin"
  ON public.bim_interactions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Interactions BIM modifiables par staff/admin"
  ON public.bim_interactions FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- Policies pour bim_evaluations
CREATE POLICY "Évaluations BIM visibles par staff/admin"
  ON public.bim_evaluations FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Évaluations BIM modifiables par staff/admin"
  ON public.bim_evaluations FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- Policies pour bim_progressions
CREATE POLICY "Progressions BIM visibles par staff/admin"
  ON public.bim_progressions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Progressions BIM modifiables par staff/admin"
  ON public.bim_progressions FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- =============================================
-- TRIGGERS pour updated_at
-- =============================================

CREATE TRIGGER update_bim_projets_updated_at
  BEFORE UPDATE ON public.bim_projets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bim_scenes_updated_at
  BEFORE UPDATE ON public.bim_scenes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bim_interactions_updated_at
  BEFORE UPDATE ON public.bim_interactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bim_progressions_updated_at
  BEFORE UPDATE ON public.bim_progressions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- FONCTION: Mise à jour progression projet
-- =============================================
CREATE OR REPLACE FUNCTION public.update_bim_progression()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_projet_id UUID;
  v_contact_id UUID;
  v_scenes_total INTEGER;
  v_scenes_completees INTEGER;
  v_temps_total INTEGER;
  v_score_moyen NUMERIC;
  v_meilleur_score INTEGER;
  v_progression_pct INTEGER;
  v_nouveau_statut bim_progression_statut;
BEGIN
  v_contact_id := NEW.contact_id;
  v_projet_id := NEW.projet_id;
  
  -- Compter scènes
  SELECT COUNT(*) INTO v_scenes_total
  FROM bim_scenes WHERE projet_id = v_projet_id AND actif = true;
  
  SELECT COUNT(*) INTO v_scenes_completees
  FROM bim_interactions
  WHERE contact_id = v_contact_id 
    AND projet_id = v_projet_id
    AND statut IN ('evalue', 'valide');
  
  -- Temps total
  SELECT COALESCE(SUM(temps_passe_sec), 0) INTO v_temps_total
  FROM bim_interactions
  WHERE contact_id = v_contact_id AND projet_id = v_projet_id;
  
  -- Scores
  SELECT AVG(score_pct), MAX(score_pct) INTO v_score_moyen, v_meilleur_score
  FROM bim_evaluations
  WHERE contact_id = v_contact_id AND projet_id = v_projet_id;
  
  -- Progression
  IF v_scenes_total > 0 THEN
    v_progression_pct := ROUND((v_scenes_completees::NUMERIC / v_scenes_total) * 100);
  ELSE
    v_progression_pct := 0;
  END IF;
  
  -- Déterminer statut
  IF v_scenes_completees = 0 THEN
    v_nouveau_statut := 'non_commence';
  ELSIF v_scenes_completees < v_scenes_total THEN
    v_nouveau_statut := 'en_cours';
  ELSIF v_meilleur_score IS NOT NULL AND v_meilleur_score >= (
    SELECT seuil_validation_pct FROM bim_projets WHERE id = v_projet_id
  ) THEN
    v_nouveau_statut := 'valide';
  ELSIF v_meilleur_score IS NOT NULL THEN
    v_nouveau_statut := 'a_reprendre';
  ELSE
    v_nouveau_statut := 'evalue';
  END IF;
  
  -- Upsert progression
  INSERT INTO bim_progressions (
    contact_id, projet_id, session_id, statut,
    scenes_completees, scenes_total, progression_pct,
    score_moyen_pct, meilleur_score_pct, temps_total_sec,
    started_at, completed_at, validated_at
  ) VALUES (
    v_contact_id, v_projet_id, NEW.session_id, v_nouveau_statut,
    v_scenes_completees, v_scenes_total, v_progression_pct,
    ROUND(v_score_moyen), v_meilleur_score, v_temps_total,
    COALESCE((SELECT MIN(started_at) FROM bim_interactions WHERE contact_id = v_contact_id AND projet_id = v_projet_id), now()),
    CASE WHEN v_nouveau_statut IN ('valide', 'a_reprendre') THEN now() ELSE NULL END,
    CASE WHEN v_nouveau_statut = 'valide' THEN now() ELSE NULL END
  )
  ON CONFLICT (contact_id, projet_id) DO UPDATE SET
    statut = EXCLUDED.statut,
    scenes_completees = EXCLUDED.scenes_completees,
    scenes_total = EXCLUDED.scenes_total,
    progression_pct = EXCLUDED.progression_pct,
    score_moyen_pct = EXCLUDED.score_moyen_pct,
    meilleur_score_pct = EXCLUDED.meilleur_score_pct,
    temps_total_sec = EXCLUDED.temps_total_sec,
    completed_at = EXCLUDED.completed_at,
    validated_at = COALESCE(bim_progressions.validated_at, EXCLUDED.validated_at),
    updated_at = now();
  
  RETURN NEW;
END;
$$;

-- Trigger sur interactions
CREATE TRIGGER trigger_update_bim_progression
  AFTER INSERT OR UPDATE ON public.bim_interactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_bim_progression();