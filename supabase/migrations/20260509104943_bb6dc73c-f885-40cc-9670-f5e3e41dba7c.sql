
-- Enums
DO $$ BEGIN
  CREATE TYPE public.produit_type AS ENUM ('unitaire','horaire','demi_journee','journalier','forfaitaire','abonnement','consommable','location','pack');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.produit_statut AS ENUM ('actif','inactif','brouillon','archive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.produit_tarif_segment AS ENUM ('public','professionnel','partenaire','preferentiel');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Catégories
CREATE TABLE public.produit_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id UUID NOT NULL,
  nom TEXT NOT NULL,
  slug TEXT,
  parent_id UUID REFERENCES public.produit_categories(id) ON DELETE SET NULL,
  ordre INTEGER NOT NULL DEFAULT 0,
  couleur TEXT,
  icone TEXT,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID
);
CREATE INDEX idx_produit_categories_centre ON public.produit_categories(centre_id) WHERE deleted_at IS NULL;

-- Produits / Services
CREATE TABLE public.produits_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id UUID NOT NULL,
  nom TEXT NOT NULL,
  sku TEXT,
  description_courte TEXT,
  description_longue TEXT,
  categorie_id UUID REFERENCES public.produit_categories(id) ON DELETE SET NULL,
  sous_categorie TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  type produit_type NOT NULL DEFAULT 'unitaire',
  unite TEXT,
  prix_ht NUMERIC(10,2) NOT NULL DEFAULT 0,
  tva_percent NUMERIC(5,2) NOT NULL DEFAULT 20,
  statut produit_statut NOT NULL DEFAULT 'brouillon',
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  gestion_stock BOOLEAN NOT NULL DEFAULT false,
  stock_actuel INTEGER,
  seuil_alerte INTEGER,
  caution_montant NUMERIC(10,2),
  duree_minutes INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  delete_reason TEXT,
  UNIQUE(centre_id, sku)
);
CREATE INDEX idx_produits_services_centre ON public.produits_services(centre_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_produits_services_statut ON public.produits_services(statut) WHERE deleted_at IS NULL;
CREATE INDEX idx_produits_services_categorie ON public.produits_services(categorie_id) WHERE deleted_at IS NULL;

-- Tarifs multiples
CREATE TABLE public.produit_tarifs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produit_id UUID NOT NULL REFERENCES public.produits_services(id) ON DELETE CASCADE,
  segment produit_tarif_segment NOT NULL DEFAULT 'public',
  libelle TEXT,
  prix_ht NUMERIC(10,2) NOT NULL,
  quantite_min INTEGER NOT NULL DEFAULT 1,
  remise_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_produit_tarifs_produit ON public.produit_tarifs(produit_id);

-- Auto centre_id
CREATE TRIGGER trg_produits_services_centre BEFORE INSERT ON public.produits_services
  FOR EACH ROW EXECUTE FUNCTION public.generic_auto_set_centre_id();
CREATE TRIGGER trg_produit_categories_centre BEFORE INSERT ON public.produit_categories
  FOR EACH ROW EXECUTE FUNCTION public.generic_auto_set_centre_id();

-- Centre immutable
CREATE TRIGGER trg_produits_services_immutable_centre BEFORE UPDATE ON public.produits_services
  FOR EACH ROW EXECUTE FUNCTION public.prevent_centre_id_change();
CREATE TRIGGER trg_produit_categories_immutable_centre BEFORE UPDATE ON public.produit_categories
  FOR EACH ROW EXECUTE FUNCTION public.prevent_centre_id_change();

-- Updated_at
CREATE TRIGGER trg_produits_services_updated_at BEFORE UPDATE ON public.produits_services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_produit_categories_updated_at BEFORE UPDATE ON public.produit_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_produit_tarifs_updated_at BEFORE UPDATE ON public.produit_tarifs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit
CREATE TRIGGER trg_produits_services_audit AFTER INSERT OR UPDATE OR DELETE ON public.produits_services
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- RLS
ALTER TABLE public.produit_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produits_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produit_tarifs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "produit_categories_select" ON public.produit_categories FOR SELECT
  USING (public.has_centre_access(centre_id));
CREATE POLICY "produit_categories_insert" ON public.produit_categories FOR INSERT
  WITH CHECK (public.has_centre_access(centre_id) AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff') OR public.is_super_admin()));
CREATE POLICY "produit_categories_update" ON public.produit_categories FOR UPDATE
  USING (public.has_centre_access(centre_id) AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff') OR public.is_super_admin()));
CREATE POLICY "produit_categories_delete" ON public.produit_categories FOR DELETE
  USING (public.has_centre_access(centre_id) AND (public.has_role(auth.uid(),'admin') OR public.is_super_admin()));

CREATE POLICY "produits_services_select" ON public.produits_services FOR SELECT
  USING (public.has_centre_access(centre_id));
CREATE POLICY "produits_services_insert" ON public.produits_services FOR INSERT
  WITH CHECK (public.has_centre_access(centre_id) AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff') OR public.is_super_admin()));
CREATE POLICY "produits_services_update" ON public.produits_services FOR UPDATE
  USING (public.has_centre_access(centre_id) AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff') OR public.is_super_admin()));
CREATE POLICY "produits_services_delete" ON public.produits_services FOR DELETE
  USING (public.has_centre_access(centre_id) AND (public.has_role(auth.uid(),'admin') OR public.is_super_admin()));

CREATE POLICY "produit_tarifs_select" ON public.produit_tarifs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.produits_services p WHERE p.id = produit_id AND public.has_centre_access(p.centre_id)));
CREATE POLICY "produit_tarifs_modify" ON public.produit_tarifs FOR ALL
  USING (EXISTS (SELECT 1 FROM public.produits_services p WHERE p.id = produit_id AND public.has_centre_access(p.centre_id) AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff') OR public.is_super_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.produits_services p WHERE p.id = produit_id AND public.has_centre_access(p.centre_id) AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff') OR public.is_super_admin())));

-- Extension facturation : ajouter produit_service_id aux lignes
ALTER TABLE public.devis_lignes ADD COLUMN IF NOT EXISTS produit_service_id UUID REFERENCES public.produits_services(id) ON DELETE SET NULL;
ALTER TABLE public.facture_lignes ADD COLUMN IF NOT EXISTS produit_service_id UUID REFERENCES public.produits_services(id) ON DELETE SET NULL;

-- Support soft delete dans restore_record et tables de stockage
CREATE OR REPLACE FUNCTION public.restore_record(p_table_name text, p_record_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_table_name NOT IN ('sessions', 'contacts', 'session_inscriptions', 'factures', 'paiements', 'contact_documents', 'prospects', 'devis', 'emargements', 'document_templates', 'catalogue_formations', 'email_templates', 'generated_documents_v2', 'produits_services', 'produit_categories') THEN
    RAISE EXCEPTION 'Table % not supported for restore', p_table_name;
  END IF;

  EXECUTE format(
    'UPDATE public.%I SET deleted_at = NULL, deleted_by = NULL, delete_reason = NULL WHERE id = $1 AND deleted_at IS NOT NULL',
    p_table_name
  ) USING p_record_id;

  INSERT INTO public.audit_logs (table_name, record_id, action, user_id, user_email)
  VALUES (
    p_table_name,
    p_record_id,
    'RESTORE',
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid())
  );

  RETURN FOUND;
END;
$function$;

-- Storage bucket photos produits
INSERT INTO storage.buckets (id, name, public)
VALUES ('produits-photos', 'produits-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "produits_photos_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'produits-photos');

CREATE POLICY "produits_photos_authenticated_write" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'produits-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "produits_photos_authenticated_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'produits-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "produits_photos_authenticated_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'produits-photos' AND auth.uid() IS NOT NULL);
