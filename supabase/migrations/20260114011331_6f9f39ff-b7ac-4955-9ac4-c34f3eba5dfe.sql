-- Create formateurs table
CREATE TABLE public.formateurs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  email TEXT,
  telephone TEXT,
  adresse TEXT,
  ville TEXT,
  code_postal TEXT,
  
  -- Professional info
  specialites TEXT[] DEFAULT '{}',
  diplomes TEXT[] DEFAULT '{}',
  numero_agrement TEXT,
  date_agrement DATE,
  
  -- Billing info
  siret TEXT,
  taux_horaire NUMERIC DEFAULT 0,
  rib TEXT,
  
  -- Status
  actif BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.formateurs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow read access to formateurs" 
ON public.formateurs 
FOR SELECT 
USING (true);

CREATE POLICY "Allow insert access to formateurs" 
ON public.formateurs 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow update access to formateurs" 
ON public.formateurs 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow delete access to formateurs" 
ON public.formateurs 
FOR DELETE 
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_formateurs_updated_at
BEFORE UPDATE ON public.formateurs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create formateur_documents table for diplomas and certifications
CREATE TABLE public.formateur_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  formateur_id UUID NOT NULL REFERENCES public.formateurs(id) ON DELETE CASCADE,
  type_document TEXT NOT NULL, -- 'diplome', 'certification', 'agrement', 'autre'
  nom TEXT NOT NULL,
  date_obtention DATE,
  date_expiration DATE,
  file_path TEXT,
  commentaires TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.formateur_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for formateur_documents
CREATE POLICY "Allow read access to formateur_documents" 
ON public.formateur_documents 
FOR SELECT 
USING (true);

CREATE POLICY "Allow insert access to formateur_documents" 
ON public.formateur_documents 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow update access to formateur_documents" 
ON public.formateur_documents 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow delete access to formateur_documents" 
ON public.formateur_documents 
FOR DELETE 
USING (true);

-- Create formateur_factures table for billing
CREATE TABLE public.formateur_factures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  formateur_id UUID NOT NULL REFERENCES public.formateurs(id) ON DELETE CASCADE,
  numero_facture TEXT NOT NULL,
  date_facture DATE NOT NULL DEFAULT CURRENT_DATE,
  periode_debut DATE,
  periode_fin DATE,
  montant_ht NUMERIC NOT NULL DEFAULT 0,
  tva_percent NUMERIC NOT NULL DEFAULT 0,
  montant_ttc NUMERIC NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'en_attente', -- 'en_attente', 'payee', 'annulee'
  date_paiement DATE,
  commentaires TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.formateur_factures ENABLE ROW LEVEL SECURITY;

-- Create policies for formateur_factures
CREATE POLICY "Allow read access to formateur_factures" 
ON public.formateur_factures 
FOR SELECT 
USING (true);

CREATE POLICY "Allow insert access to formateur_factures" 
ON public.formateur_factures 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow update access to formateur_factures" 
ON public.formateur_factures 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow delete access to formateur_factures" 
ON public.formateur_factures 
FOR DELETE 
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_formateur_factures_updated_at
BEFORE UPDATE ON public.formateur_factures
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();