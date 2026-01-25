-- =====================================================
-- ARCHITECTURE MULTI-CENTRES SAAS T3P - MIGRATION COMPLÈTE
-- =====================================================

-- ÉTAPE 1: Créer la table des centres de formation
CREATE TABLE public.centres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  nom_commercial TEXT,
  siret TEXT,
  nda TEXT,
  email TEXT NOT NULL,
  telephone TEXT,
  adresse_complete TEXT,
  logo_url TEXT,
  actif BOOLEAN DEFAULT true,
  plan_type TEXT DEFAULT 'essentiel' CHECK (plan_type IN ('essentiel', 'pro', 'premium')),
  plan_start_date DATE,
  plan_end_date DATE,
  max_users INTEGER DEFAULT 5,
  max_contacts INTEGER DEFAULT 500,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ÉTAPE 2: Créer la table de liaison utilisateurs-centres
CREATE TABLE public.user_centres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  centre_id UUID REFERENCES public.centres(id) ON DELETE CASCADE NOT NULL,
  is_primary BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, centre_id)
);

-- ÉTAPE 3: Ajouter centre_id sur toutes les tables principales
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS centre_id UUID REFERENCES public.centres(id);
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS centre_id UUID REFERENCES public.centres(id);
ALTER TABLE public.factures ADD COLUMN IF NOT EXISTS centre_id UUID REFERENCES public.centres(id);
ALTER TABLE public.devis ADD COLUMN IF NOT EXISTS centre_id UUID REFERENCES public.centres(id);
ALTER TABLE public.formateurs ADD COLUMN IF NOT EXISTS centre_id UUID REFERENCES public.centres(id);
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS centre_id UUID REFERENCES public.centres(id);
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS centre_id UUID REFERENCES public.centres(id);
ALTER TABLE public.catalogue_formations ADD COLUMN IF NOT EXISTS centre_id UUID REFERENCES public.centres(id);
ALTER TABLE public.document_template_files ADD COLUMN IF NOT EXISTS centre_id UUID REFERENCES public.centres(id);
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS centre_id UUID REFERENCES public.centres(id);
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS centre_id UUID REFERENCES public.centres(id);
ALTER TABLE public.objectifs ADD COLUMN IF NOT EXISTS centre_id UUID REFERENCES public.centres(id);
ALTER TABLE public.vehicules ADD COLUMN IF NOT EXISTS centre_id UUID REFERENCES public.centres(id);
ALTER TABLE public.lms_formations ADD COLUMN IF NOT EXISTS centre_id UUID REFERENCES public.centres(id);
ALTER TABLE public.qualiopi_indicateurs ADD COLUMN IF NOT EXISTS centre_id UUID REFERENCES public.centres(id);
ALTER TABLE public.qualiopi_audits ADD COLUMN IF NOT EXISTS centre_id UUID REFERENCES public.centres(id);
ALTER TABLE public.reclamations ADD COLUMN IF NOT EXISTS centre_id UUID REFERENCES public.centres(id);
ALTER TABLE public.satisfaction_reponses ADD COLUMN IF NOT EXISTS centre_id UUID REFERENCES public.centres(id);
ALTER TABLE public.bim_projets ADD COLUMN IF NOT EXISTS centre_id UUID REFERENCES public.centres(id);

-- ÉTAPE 4: Créer index pour les performances
CREATE INDEX idx_contacts_centre_id ON public.contacts(centre_id);
CREATE INDEX idx_sessions_centre_id ON public.sessions(centre_id);
CREATE INDEX idx_factures_centre_id ON public.factures(centre_id);
CREATE INDEX idx_devis_centre_id ON public.devis(centre_id);
CREATE INDEX idx_formateurs_centre_id ON public.formateurs(centre_id);
CREATE INDEX idx_prospects_centre_id ON public.prospects(centre_id);
CREATE INDEX idx_partners_centre_id ON public.partners(centre_id);
CREATE INDEX idx_user_centres_user_id ON public.user_centres(user_id);
CREATE INDEX idx_user_centres_centre_id ON public.user_centres(centre_id);

-- ÉTAPE 5: Activer RLS sur les nouvelles tables
ALTER TABLE public.centres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_centres ENABLE ROW LEVEL SECURITY;

-- ÉTAPE 6: Trigger pour updated_at sur centres
CREATE TRIGGER update_centres_updated_at
  BEFORE UPDATE ON public.centres
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();