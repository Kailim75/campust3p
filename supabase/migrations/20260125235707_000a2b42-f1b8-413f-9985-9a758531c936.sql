-- Table des violations de données (RGPD Article 33)
CREATE TABLE public.data_breaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  titre TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Détection et signalement
  date_detection TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  date_notification_cnil TIMESTAMP WITH TIME ZONE,
  date_notification_personnes TIMESTAMP WITH TIME ZONE,
  detecte_par TEXT,
  
  -- Classification
  type_violation TEXT NOT NULL CHECK (type_violation IN ('confidentialite', 'integrite', 'disponibilite')),
  origine TEXT CHECK (origine IN ('externe', 'interne', 'sous_traitant', 'erreur_humaine', 'technique', 'autre')),
  severite TEXT NOT NULL CHECK (severite IN ('faible', 'moyenne', 'elevee', 'critique')),
  
  -- Impact
  categories_donnees TEXT[] NOT NULL DEFAULT '{}',
  categories_personnes TEXT[] NOT NULL DEFAULT '{}',
  nombre_personnes_affectees INTEGER,
  risque_pour_personnes TEXT CHECK (risque_pour_personnes IN ('aucun', 'faible', 'eleve')),
  
  -- Actions
  mesures_immediates TEXT,
  mesures_correctives TEXT,
  mesures_preventives TEXT,
  
  -- Notifications
  notification_cnil_requise BOOLEAN DEFAULT false,
  notification_personnes_requise BOOLEAN DEFAULT false,
  justification_non_notification TEXT,
  
  -- Suivi
  statut TEXT NOT NULL DEFAULT 'detectee' CHECK (statut IN ('detectee', 'en_analyse', 'notifiee_cnil', 'notifiee_personnes', 'corrigee', 'cloturee')),
  responsable_traitement TEXT,
  documents_associes TEXT[],
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  closed_at TIMESTAMP WITH TIME ZONE,
  closed_by UUID REFERENCES auth.users(id)
);

-- Historique des modifications
CREATE TABLE public.data_breach_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  breach_id UUID NOT NULL REFERENCES public.data_breaches(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  changed_fields TEXT[],
  old_values JSONB,
  new_values JSONB,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- Séquence pour les codes
CREATE SEQUENCE IF NOT EXISTS public.data_breach_seq START WITH 1;

-- Fonction de génération du code
CREATE OR REPLACE FUNCTION public.generate_breach_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT;
  v_seq INTEGER;
BEGIN
  v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  v_seq := nextval('public.data_breach_seq');
  RETURN 'VIO-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');
END;
$$;

-- Trigger pour updated_at
CREATE TRIGGER update_data_breaches_updated_at
  BEFORE UPDATE ON public.data_breaches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger pour l'historique
CREATE OR REPLACE FUNCTION public.log_data_breach_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed TEXT[];
  action_type TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    action_type := 'created';
    INSERT INTO public.data_breach_history (breach_id, action, new_values, changed_by)
    VALUES (NEW.id, action_type, to_jsonb(NEW), auth.uid());
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := CASE 
      WHEN NEW.statut = 'cloturee' AND OLD.statut != 'cloturee' THEN 'closed'
      WHEN NEW.statut != OLD.statut THEN 'status_changed'
      ELSE 'updated' 
    END;
    
    SELECT ARRAY_AGG(key) INTO changed
    FROM jsonb_each(to_jsonb(NEW)) AS n(key, value)
    WHERE to_jsonb(OLD)->key IS DISTINCT FROM to_jsonb(NEW)->key;
    
    INSERT INTO public.data_breach_history (breach_id, action, changed_fields, old_values, new_values, changed_by)
    VALUES (NEW.id, action_type, changed, to_jsonb(OLD), to_jsonb(NEW), auth.uid());
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER log_data_breach_changes_trigger
  AFTER INSERT OR UPDATE ON public.data_breaches
  FOR EACH ROW
  EXECUTE FUNCTION public.log_data_breach_changes();

-- RLS
ALTER TABLE public.data_breaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_breach_history ENABLE ROW LEVEL SECURITY;

-- Seuls les super_admin peuvent gérer les violations
CREATE POLICY "Super admins can manage breaches"
  ON public.data_breaches
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can view breach history"
  ON public.data_breach_history
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

-- Index pour les performances
CREATE INDEX idx_data_breaches_statut ON public.data_breaches(statut);
CREATE INDEX idx_data_breaches_severite ON public.data_breaches(severite);
CREATE INDEX idx_data_breaches_date ON public.data_breaches(date_detection DESC);