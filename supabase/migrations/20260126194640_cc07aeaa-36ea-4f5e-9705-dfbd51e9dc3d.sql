-- ============================================
-- MODULE PARTENAIRES - ÉTAPE 1 : ENUMS ET COLONNES
-- ============================================

-- 1. Créer les enums (ignorer si existent déjà)
DO $$ BEGIN
  CREATE TYPE public.partner_status AS ENUM ('actif', 'inactif', 'suspendu');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.partner_type AS ENUM (
    'apporteur_affaires', 'auto_ecole', 'entreprise', 
    'organisme_formation', 'prescripteur', 'autre'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.partner_remuneration_mode AS ENUM ('commission', 'forfait', 'aucun');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.contact_origin AS ENUM (
    'site_web', 'bouche_a_oreille', 'partenaire', 
    'reseaux_sociaux', 'publicite', 'salon', 'autre'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. Ajouter les colonnes à partners
ALTER TABLE public.partners 
  ADD COLUMN IF NOT EXISTS statut_partenaire partner_status DEFAULT 'actif',
  ADD COLUMN IF NOT EXISTS type_partenaire partner_type DEFAULT 'autre',
  ADD COLUMN IF NOT EXISTS zone_geographique TEXT,
  ADD COLUMN IF NOT EXISTS mode_remuneration partner_remuneration_mode DEFAULT 'aucun',
  ADD COLUMN IF NOT EXISTS taux_commission NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS montant_forfait NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS date_debut_contrat DATE,
  ADD COLUMN IF NOT EXISTS date_fin_contrat DATE,
  ADD COLUMN IF NOT EXISTS commission_payee NUMERIC(12,2) DEFAULT 0;

-- 3. Ajouter les colonnes à contacts
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS origine contact_origin,
  ADD COLUMN IF NOT EXISTS partenaire_referent_id UUID REFERENCES public.partners(id),
  ADD COLUMN IF NOT EXISTS date_apport DATE;

-- 4. Index pour les performances
CREATE INDEX IF NOT EXISTS idx_contacts_partenaire_referent ON public.contacts(partenaire_referent_id);
CREATE INDEX IF NOT EXISTS idx_contacts_origine ON public.contacts(origine);
CREATE INDEX IF NOT EXISTS idx_partners_statut ON public.partners(statut_partenaire);

-- 5. Vue pour les statistiques partenaires
DROP VIEW IF EXISTS public.partner_stats;
CREATE VIEW public.partner_stats 
WITH (security_invoker = on) AS
SELECT 
  p.id AS partner_id,
  p.company_name,
  p.statut_partenaire,
  p.type_partenaire,
  p.mode_remuneration,
  p.taux_commission,
  p.montant_forfait,
  p.commission_payee,
  p.centre_id,
  COUNT(DISTINCT c.id) AS nb_apprenants,
  COALESCE(SUM(
    CASE WHEN f.statut IN ('payee', 'partiel') 
    THEN f.montant_total ELSE 0 END
  ), 0) AS ca_genere,
  CASE 
    WHEN p.mode_remuneration = 'commission' THEN
      COALESCE(SUM(
        CASE WHEN f.statut IN ('payee', 'partiel') 
        THEN f.montant_total ELSE 0 END
      ), 0) * COALESCE(p.taux_commission, 0) / 100
    WHEN p.mode_remuneration = 'forfait' THEN
      COUNT(DISTINCT c.id) * COALESCE(p.montant_forfait, 0)
    ELSE 0
  END AS commission_calculee,
  CASE 
    WHEN p.mode_remuneration = 'commission' THEN
      (COALESCE(SUM(
        CASE WHEN f.statut IN ('payee', 'partiel') 
        THEN f.montant_total ELSE 0 END
      ), 0) * COALESCE(p.taux_commission, 0) / 100) - COALESCE(p.commission_payee, 0)
    WHEN p.mode_remuneration = 'forfait' THEN
      (COUNT(DISTINCT c.id) * COALESCE(p.montant_forfait, 0)) - COALESCE(p.commission_payee, 0)
    ELSE 0
  END AS commission_restante
FROM public.partners p
LEFT JOIN public.contacts c ON c.partenaire_referent_id = p.id AND c.archived = false
LEFT JOIN public.factures f ON f.contact_id = c.id
WHERE p.is_active = true
GROUP BY p.id, p.company_name, p.statut_partenaire, p.type_partenaire, 
         p.mode_remuneration, p.taux_commission, p.montant_forfait, 
         p.commission_payee, p.centre_id;

-- 6. Fonction pour obtenir les stats d'un partenaire
CREATE OR REPLACE FUNCTION public.get_partner_stats(p_partner_id UUID)
RETURNS TABLE (
  nb_apprenants BIGINT,
  ca_genere NUMERIC,
  commission_calculee NUMERIC,
  commission_restante NUMERIC,
  nb_apprenants_ce_mois BIGINT,
  ca_ce_mois NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COUNT(DISTINCT c.id) AS nb_apprenants,
    COALESCE(SUM(
      CASE WHEN f.statut IN ('payee', 'partiel') 
      THEN f.montant_total ELSE 0 END
    ), 0) AS ca_genere,
    CASE 
      WHEN p.mode_remuneration = 'commission' THEN
        COALESCE(SUM(
          CASE WHEN f.statut IN ('payee', 'partiel') 
          THEN f.montant_total ELSE 0 END
        ), 0) * COALESCE(p.taux_commission, 0) / 100
      WHEN p.mode_remuneration = 'forfait' THEN
        COUNT(DISTINCT c.id) * COALESCE(p.montant_forfait, 0)
      ELSE 0
    END AS commission_calculee,
    CASE 
      WHEN p.mode_remuneration = 'commission' THEN
        (COALESCE(SUM(
          CASE WHEN f.statut IN ('payee', 'partiel') 
          THEN f.montant_total ELSE 0 END
        ), 0) * COALESCE(p.taux_commission, 0) / 100) - COALESCE(p.commission_payee, 0)
      WHEN p.mode_remuneration = 'forfait' THEN
        (COUNT(DISTINCT c.id) * COALESCE(p.montant_forfait, 0)) - COALESCE(p.commission_payee, 0)
      ELSE 0
    END AS commission_restante,
    COUNT(DISTINCT CASE 
      WHEN c.date_apport >= date_trunc('month', CURRENT_DATE) THEN c.id 
    END) AS nb_apprenants_ce_mois,
    COALESCE(SUM(
      CASE WHEN f.statut IN ('payee', 'partiel') 
           AND f.date_emission >= date_trunc('month', CURRENT_DATE)
      THEN f.montant_total ELSE 0 END
    ), 0) AS ca_ce_mois
  FROM public.partners p
  LEFT JOIN public.contacts c ON c.partenaire_referent_id = p.id AND c.archived = false
  LEFT JOIN public.factures f ON f.contact_id = c.id
  WHERE p.id = p_partner_id
  GROUP BY p.id, p.mode_remuneration, p.taux_commission, p.montant_forfait, p.commission_payee;
$$;

-- 7. Fonction pour enregistrer un paiement de commission
CREATE OR REPLACE FUNCTION public.pay_partner_commission(
  p_partner_id UUID,
  p_amount NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.partners
  SET commission_payee = COALESCE(commission_payee, 0) + p_amount,
      updated_at = now()
  WHERE id = p_partner_id;
  
  RETURN FOUND;
END;
$$;