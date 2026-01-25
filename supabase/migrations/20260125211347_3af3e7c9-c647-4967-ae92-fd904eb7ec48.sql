-- =====================================================
-- FONCTIONS HELPER ET POLICIES RLS MULTI-CENTRES
-- =====================================================

-- ÉTAPE 1: Fonction helper pour récupérer le centre_id de l'utilisateur courant
CREATE OR REPLACE FUNCTION public.get_user_centre_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT centre_id 
  FROM public.user_centres 
  WHERE user_id = auth.uid() 
    AND is_primary = true
  LIMIT 1;
$$;

-- ÉTAPE 2: Fonction pour vérifier si l'utilisateur est super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role::TEXT = 'super_admin'
  );
$$;

-- ÉTAPE 3: Fonction pour vérifier l'accès à un centre
CREATE OR REPLACE FUNCTION public.has_centre_access(p_centre_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.is_super_admin() 
    OR EXISTS (
      SELECT 1 FROM public.user_centres
      WHERE user_id = auth.uid()
        AND centre_id = p_centre_id
    );
$$;

-- ÉTAPE 4: Policies pour la table centres
CREATE POLICY "Super admins can manage all centres"
  ON public.centres FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Users can view their own centres"
  ON public.centres FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin() 
    OR id IN (SELECT centre_id FROM public.user_centres WHERE user_id = auth.uid())
  );

-- ÉTAPE 5: Policies pour user_centres
CREATE POLICY "Super admins can manage all user_centres"
  ON public.user_centres FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Users can view their own centre associations"
  ON public.user_centres FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ÉTAPE 6: Vue pour les stats globales (super admin)
CREATE OR REPLACE VIEW public.centres_stats AS
SELECT 
  c.id,
  c.nom,
  c.plan_type,
  c.actif,
  c.created_at,
  (SELECT COUNT(*) FROM public.user_centres uc WHERE uc.centre_id = c.id) as nb_users,
  (SELECT COUNT(*) FROM public.contacts co WHERE co.centre_id = c.id) as nb_contacts,
  (SELECT COUNT(*) FROM public.sessions s WHERE s.centre_id = c.id) as nb_sessions,
  (SELECT COALESCE(SUM(montant_total), 0) FROM public.factures f WHERE f.centre_id = c.id AND f.statut = 'payee') as ca_total
FROM public.centres c;