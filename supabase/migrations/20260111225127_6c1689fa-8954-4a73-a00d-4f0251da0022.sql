-- Create enum types for the CRM
CREATE TYPE public.civilite AS ENUM ('Monsieur', 'Madame');
CREATE TYPE public.contact_statut AS ENUM ('En attente de validation', 'Client', 'Bravo');
CREATE TYPE public.formation_type AS ENUM ('TAXI', 'VTC', 'VMDTR', 'ACC VTC', 'ACC VTC 75', 'Formation continue Taxi', 'Formation continue VTC', 'Mobilité Taxi');

-- Create main contacts/apprenants table based on Excel structure
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  archived BOOLEAN NOT NULL DEFAULT false,
  custom_id TEXT,
  uid TEXT UNIQUE,
  
  -- Personal information
  nom TEXT NOT NULL,
  nom_naissance TEXT,
  prenom TEXT NOT NULL,
  civilite public.civilite,
  date_naissance DATE,
  fonction TEXT,
  
  -- Contact details
  email TEXT,
  telephone TEXT,
  rue TEXT,
  code_postal TEXT,
  ville TEXT,
  ville_naissance TEXT,
  pays_naissance TEXT,
  
  -- License information
  numero_permis TEXT,
  date_delivrance_permis DATE,
  prefecture_permis TEXT,
  
  -- Professional card
  numero_carte_professionnelle TEXT,
  date_expiration_carte DATE,
  prefecture_carte TEXT,
  
  -- Referral
  parrain TEXT,
  filleul TEXT,
  
  -- Status and source
  statut public.contact_statut DEFAULT 'En attente de validation',
  commentaires TEXT,
  formation public.formation_type,
  source TEXT,
  precisions TEXT
);

-- Enable RLS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Create policy for public read (since no auth required for now)
CREATE POLICY "Allow public read access" 
ON public.contacts 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access" 
ON public.contacts 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update access" 
ON public.contacts 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete access" 
ON public.contacts 
FOR DELETE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_contacts_updated_at
BEFORE UPDATE ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for common searches
CREATE INDEX idx_contacts_nom ON public.contacts(nom);
CREATE INDEX idx_contacts_email ON public.contacts(email);
CREATE INDEX idx_contacts_statut ON public.contacts(statut);
CREATE INDEX idx_contacts_formation ON public.contacts(formation);
CREATE INDEX idx_contacts_custom_id ON public.contacts(custom_id);