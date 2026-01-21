
-- Enum pour les catégories de partenaires
CREATE TYPE public.partner_category AS ENUM ('assurance', 'comptable', 'medecin', 'banque', 'vehicule', 'autre');

-- Enum pour les types de documents pédagogiques
CREATE TYPE public.pedagogical_document_type AS ENUM ('inscription', 'entree_sortie', 'test_positionnement', 'attestation', 'autre');

-- Enum pour le statut des documents
CREATE TYPE public.document_status AS ENUM ('actif', 'archive');

-- Enum pour le statut des prospects
CREATE TYPE public.prospect_status AS ENUM ('nouveau', 'contacte', 'relance', 'converti', 'perdu');

-- Table partners (partenaires)
CREATE TABLE public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  category partner_category NOT NULL DEFAULT 'autre',
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Index sur category pour recherche rapide
CREATE INDEX idx_partners_category ON public.partners(category);
CREATE INDEX idx_partners_is_active ON public.partners(is_active);

-- Table de liaison contact_partners (many-to-many)
CREATE TABLE public.contact_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(contact_id, partner_id)
);

CREATE INDEX idx_contact_partners_contact ON public.contact_partners(contact_id);
CREATE INDEX idx_contact_partners_partner ON public.contact_partners(partner_id);

-- Table pedagogical_documents
CREATE TABLE public.pedagogical_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  document_type pedagogical_document_type NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  status document_status NOT NULL DEFAULT 'actif',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_pedagogical_documents_contact ON public.pedagogical_documents(contact_id);
CREATE INDEX idx_pedagogical_documents_session ON public.pedagogical_documents(session_id);
CREATE INDEX idx_pedagogical_documents_type ON public.pedagogical_documents(document_type);
CREATE INDEX idx_pedagogical_documents_status ON public.pedagogical_documents(status);

-- Table chevalets (génération PDF chevalet formation)
CREATE TABLE public.chevalets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  formation_type TEXT NOT NULL,
  pdf_path TEXT,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_chevalets_contact ON public.chevalets(contact_id);
CREATE INDEX idx_chevalets_formation ON public.chevalets(formation_type);

-- Table prospects
CREATE TABLE public.prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  telephone TEXT,
  email TEXT,
  formation_souhaitee TEXT,
  source TEXT,
  statut prospect_status NOT NULL DEFAULT 'nouveau',
  notes TEXT,
  converted_contact_id UUID REFERENCES public.contacts(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Contrainte d'unicité pour éviter les doublons (email OU téléphone)
CREATE UNIQUE INDEX idx_prospects_email_unique ON public.prospects(email) WHERE email IS NOT NULL AND email != '' AND is_active = true;
CREATE INDEX idx_prospects_statut ON public.prospects(statut);
CREATE INDEX idx_prospects_formation ON public.prospects(formation_souhaitee);
CREATE INDEX idx_prospects_is_active ON public.prospects(is_active);

-- Trigger pour updated_at
CREATE TRIGGER update_partners_updated_at
  BEFORE UPDATE ON public.partners
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pedagogical_documents_updated_at
  BEFORE UPDATE ON public.pedagogical_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prospects_updated_at
  BEFORE UPDATE ON public.prospects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Fonction pour archiver automatiquement les anciennes versions de documents
CREATE OR REPLACE FUNCTION public.archive_old_document_versions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Archiver les documents existants du même type pour le même contact
  UPDATE public.pedagogical_documents
  SET status = 'archive'
  WHERE contact_id = NEW.contact_id
    AND document_type = NEW.document_type
    AND id != NEW.id
    AND status = 'actif';
  
  -- Calculer la version
  SELECT COALESCE(MAX(version), 0) + 1
  INTO NEW.version
  FROM public.pedagogical_documents
  WHERE contact_id = NEW.contact_id
    AND document_type = NEW.document_type;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_archive_old_documents
  BEFORE INSERT ON public.pedagogical_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.archive_old_document_versions();

-- RLS Policies

-- Partners
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access partners"
  ON public.partners FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff full access partners"
  ON public.partners FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'staff'));

-- Contact Partners
ALTER TABLE public.contact_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access contact_partners"
  ON public.contact_partners FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff full access contact_partners"
  ON public.contact_partners FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'staff'));

-- Pedagogical Documents
ALTER TABLE public.pedagogical_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access pedagogical_documents"
  ON public.pedagogical_documents FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff full access pedagogical_documents"
  ON public.pedagogical_documents FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'staff'));

-- Chevalets
ALTER TABLE public.chevalets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access chevalets"
  ON public.chevalets FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff full access chevalets"
  ON public.chevalets FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'staff'));

-- Prospects
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access prospects"
  ON public.prospects FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff full access prospects"
  ON public.prospects FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'staff'));

-- Storage bucket pour documents pédagogiques
INSERT INTO storage.buckets (id, name, public) 
VALUES ('pedagogie', 'pedagogie', false)
ON CONFLICT (id) DO NOTHING;

-- Policies storage pedagogie
CREATE POLICY "Authenticated users can upload pedagogie"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'pedagogie');

CREATE POLICY "Authenticated users can view pedagogie"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'pedagogie');

CREATE POLICY "Authenticated users can update pedagogie"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'pedagogie');

CREATE POLICY "Authenticated users can delete pedagogie"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'pedagogie');
