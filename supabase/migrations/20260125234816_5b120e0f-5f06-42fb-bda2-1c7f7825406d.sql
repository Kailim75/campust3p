
-- Table for legal mentions with versioning
CREATE TABLE public.legal_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INTEGER NOT NULL DEFAULT 1,
  contenu TEXT NOT NULL,
  raison_sociale TEXT,
  forme_juridique TEXT,
  capital_social TEXT,
  siege_social TEXT,
  rcs TEXT,
  siret TEXT,
  nda TEXT,
  directeur_publication TEXT,
  hebergeur_nom TEXT,
  hebergeur_adresse TEXT,
  hebergeur_contact TEXT,
  email_contact TEXT,
  telephone_contact TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ
);

-- History table for audit trail
CREATE TABLE public.legal_mentions_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mention_id UUID NOT NULL REFERENCES public.legal_mentions(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  changed_fields TEXT[],
  old_values JSONB,
  new_values JSONB,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.legal_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_mentions_history ENABLE ROW LEVEL SECURITY;

-- Public read access for active mentions (legal requirement: must be visible to all)
CREATE POLICY "Anyone can view active legal mentions"
ON public.legal_mentions FOR SELECT
USING (status = 'active');

-- Super admin full access
CREATE POLICY "Super admin can manage legal mentions"
ON public.legal_mentions FOR ALL
USING (public.is_super_admin());

-- Admin and super admin can view all mentions
CREATE POLICY "Admins can view all legal mentions"
ON public.legal_mentions FOR SELECT
USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin());

-- History policies
CREATE POLICY "Super admin can view history"
ON public.legal_mentions_history FOR SELECT
USING (public.is_super_admin());

CREATE POLICY "Super admin can insert history"
ON public.legal_mentions_history FOR INSERT
WITH CHECK (public.is_super_admin());

-- Trigger for automatic history logging
CREATE OR REPLACE FUNCTION public.log_legal_mentions_changes()
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
    INSERT INTO public.legal_mentions_history (mention_id, action, new_values, changed_by)
    VALUES (NEW.id, action_type, to_jsonb(NEW), auth.uid());
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := CASE 
      WHEN NEW.status = 'active' AND OLD.status != 'active' THEN 'activated'
      WHEN NEW.status = 'archived' AND OLD.status != 'archived' THEN 'archived'
      ELSE 'updated' 
    END;
    
    SELECT ARRAY_AGG(key) INTO changed
    FROM jsonb_each(to_jsonb(NEW)) AS n(key, value)
    WHERE to_jsonb(OLD)->key IS DISTINCT FROM to_jsonb(NEW)->key;
    
    INSERT INTO public.legal_mentions_history (mention_id, action, changed_fields, old_values, new_values, changed_by)
    VALUES (NEW.id, action_type, changed, to_jsonb(OLD), to_jsonb(NEW), auth.uid());
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER legal_mentions_audit_trigger
AFTER INSERT OR UPDATE ON public.legal_mentions
FOR EACH ROW EXECUTE FUNCTION public.log_legal_mentions_changes();

-- Function to get active legal mentions (public access)
CREATE OR REPLACE FUNCTION public.get_active_legal_mentions()
RETURNS TABLE(
  id UUID,
  version INTEGER,
  contenu TEXT,
  raison_sociale TEXT,
  forme_juridique TEXT,
  capital_social TEXT,
  siege_social TEXT,
  rcs TEXT,
  siret TEXT,
  nda TEXT,
  directeur_publication TEXT,
  hebergeur_nom TEXT,
  hebergeur_adresse TEXT,
  hebergeur_contact TEXT,
  email_contact TEXT,
  telephone_contact TEXT,
  activated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id, version, contenu, raison_sociale, forme_juridique, capital_social,
    siege_social, rcs, siret, nda, directeur_publication, hebergeur_nom,
    hebergeur_adresse, hebergeur_contact, email_contact, telephone_contact, activated_at
  FROM public.legal_mentions
  WHERE status = 'active'
  ORDER BY activated_at DESC
  LIMIT 1;
$$;

-- Insert default legal mentions template
INSERT INTO public.legal_mentions (
  version,
  contenu,
  raison_sociale,
  forme_juridique,
  hebergeur_nom,
  hebergeur_adresse,
  status
) VALUES (
  1,
  '# Mentions Légales

## Éditeur du site

Le présent site est édité par **{RAISON_SOCIALE}**, {FORME_JURIDIQUE}.

**Siège social** : {SIEGE_SOCIAL}

**SIRET** : {SIRET}

**Numéro de Déclaration d''Activité (NDA)** : {NDA}

**Directeur de la publication** : {DIRECTEUR_PUBLICATION}

**Contact** : {EMAIL_CONTACT} | {TELEPHONE_CONTACT}

## Hébergement

Ce site est hébergé par :

**{HEBERGEUR_NOM}**

{HEBERGEUR_ADRESSE}

{HEBERGEUR_CONTACT}

## Propriété intellectuelle

L''ensemble du contenu de ce site (textes, images, vidéos, logos, etc.) est protégé par le droit d''auteur. Toute reproduction, représentation, modification, publication ou adaptation de tout ou partie des éléments du site est interdite sans autorisation écrite préalable.

## Protection des données personnelles

Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés, vous disposez d''un droit d''accès, de rectification, de suppression et de portabilité de vos données personnelles.

Pour plus d''informations, consultez notre [Politique de Confidentialité](/politique-confidentialite).

## Cookies

Ce site utilise des cookies techniques nécessaires à son bon fonctionnement. Pour plus d''informations, consultez notre politique de confidentialité.

## Litiges

En cas de litige, une solution amiable sera recherchée avant toute action judiciaire. À défaut, les tribunaux français seront compétents.

---

*Dernière mise à jour : {DATE_MISE_A_JOUR}*',
  'À compléter',
  'À compléter',
  'Lovable / Supabase',
  'San Francisco, CA, USA',
  'draft'
);
