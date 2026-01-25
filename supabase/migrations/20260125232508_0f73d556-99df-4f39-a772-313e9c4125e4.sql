-- Create enum for charter status
CREATE TYPE public.charter_status AS ENUM ('draft', 'active', 'archived');

-- Table des versions de la charte
CREATE TABLE public.security_charters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titre TEXT NOT NULL DEFAULT 'Charte de Sécurité Interne',
  contenu TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  status charter_status NOT NULL DEFAULT 'draft',
  roles_requis TEXT[] NOT NULL DEFAULT ARRAY['admin', 'staff', 'formateur']::TEXT[],
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  activated_at TIMESTAMP WITH TIME ZONE,
  archived_at TIMESTAMP WITH TIME ZONE
);

-- Table des acceptations
CREATE TABLE public.charter_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  charter_id UUID NOT NULL REFERENCES public.security_charters(id) ON DELETE CASCADE,
  role_at_acceptance TEXT NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  UNIQUE(user_id, charter_id)
);

-- Index pour performance
CREATE INDEX idx_charter_acceptances_user ON public.charter_acceptances(user_id);
CREATE INDEX idx_charter_acceptances_charter ON public.charter_acceptances(charter_id);
CREATE INDEX idx_security_charters_status ON public.security_charters(status);

-- Enable RLS
ALTER TABLE public.security_charters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charter_acceptances ENABLE ROW LEVEL SECURITY;

-- Policies for security_charters
-- Everyone can read active charters
CREATE POLICY "Active charters are readable by authenticated users"
ON public.security_charters
FOR SELECT
TO authenticated
USING (status = 'active' OR public.is_super_admin());

-- Only super admins can manage charters
CREATE POLICY "Super admins can manage charters"
ON public.security_charters
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- Policies for charter_acceptances
-- Users can read their own acceptances
CREATE POLICY "Users can view their own acceptances"
ON public.charter_acceptances
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_super_admin());

-- Users can insert their own acceptance
CREATE POLICY "Users can accept charters"
ON public.charter_acceptances
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Super admins can view all acceptances
CREATE POLICY "Super admins can view all acceptances"
ON public.charter_acceptances
FOR SELECT
TO authenticated
USING (public.is_super_admin());

-- Function to check if user has accepted current active charter
CREATE OR REPLACE FUNCTION public.has_accepted_current_charter()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.charter_acceptances ca
    JOIN public.security_charters sc ON sc.id = ca.charter_id
    WHERE ca.user_id = auth.uid()
      AND sc.status = 'active'
  );
$$;

-- Function to get current active charter
CREATE OR REPLACE FUNCTION public.get_active_charter()
RETURNS TABLE (
  id UUID,
  titre TEXT,
  contenu TEXT,
  version INTEGER,
  roles_requis TEXT[],
  activated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, titre, contenu, version, roles_requis, activated_at
  FROM public.security_charters
  WHERE status = 'active'
  ORDER BY activated_at DESC
  LIMIT 1;
$$;

-- Function to get user's role for charter acceptance
CREATE OR REPLACE FUNCTION public.get_user_role_for_charter()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role::TEXT FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1),
    'user'
  );
$$;

-- Function to accept charter
CREATE OR REPLACE FUNCTION public.accept_charter(p_charter_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Get user's current role
  v_role := public.get_user_role_for_charter();
  
  -- Insert acceptance
  INSERT INTO public.charter_acceptances (user_id, charter_id, role_at_acceptance)
  VALUES (auth.uid(), p_charter_id, v_role)
  ON CONFLICT (user_id, charter_id) DO NOTHING;
  
  RETURN TRUE;
END;
$$;

-- Insert default charter content
INSERT INTO public.security_charters (titre, contenu, version, status, activated_at)
VALUES (
  'Charte de Sécurité Interne',
  E'# Charte de Sécurité Interne CampusT3P\n\n## Préambule\n\nLa présente charte définit les règles de sécurité applicables à tous les utilisateurs du système d''information CampusT3P.\n\n## Article 1 - Confidentialité des données\n\nL''utilisateur s''engage à :\n- Préserver la confidentialité des informations auxquelles il a accès\n- Ne pas divulguer les données personnelles des apprenants et formateurs\n- Signaler toute fuite de données suspectée\n\n## Article 2 - Authentification et mots de passe\n\nL''utilisateur s''engage à :\n- Utiliser un mot de passe robuste (minimum 8 caractères, majuscules, minuscules, chiffres)\n- Ne jamais partager ses identifiants de connexion\n- Verrouiller sa session lors de toute absence\n\n## Article 3 - Protection des données personnelles (RGPD)\n\nConformément au RGPD, l''utilisateur s''engage à :\n- Collecter uniquement les données strictement nécessaires\n- Respecter les droits des personnes (accès, rectification, effacement)\n- Notifier toute violation de données dans les 72 heures\n\n## Article 4 - Utilisation des équipements\n\nL''utilisateur s''engage à :\n- Utiliser les outils informatiques à des fins professionnelles\n- Ne pas installer de logiciels non autorisés\n- Maintenir son poste de travail à jour\n\n## Article 5 - Sanctions\n\nTout manquement à la présente charte peut entraîner des sanctions disciplinaires et/ou pénales.\n\n## Acceptation\n\nEn acceptant cette charte, je reconnais avoir pris connaissance de l''ensemble de ces règles et m''engage à les respecter.',
  1,
  'active',
  now()
);