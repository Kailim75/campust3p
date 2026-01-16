-- Table centre_formation (singleton configuration)
CREATE TABLE public.centre_formation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom_legal text NOT NULL,
  nom_commercial text NOT NULL,
  forme_juridique text NOT NULL,
  adresse_complete text NOT NULL,
  telephone text NOT NULL,
  email text NOT NULL,
  siret text NOT NULL UNIQUE,
  nda text NOT NULL,
  region_declaration text NOT NULL,
  responsable_legal_nom text NOT NULL,
  responsable_legal_fonction text NOT NULL,
  logo_url text,
  signature_cachet_url text,
  iban text NOT NULL,
  bic text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.centre_formation ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read
CREATE POLICY "Authenticated users can read centre_formation"
ON public.centre_formation FOR SELECT
TO authenticated
USING (true);

-- Policy: Only admins can insert/update/delete
CREATE POLICY "Admins can manage centre_formation"
ON public.centre_formation FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_centre_formation_updated_at
BEFORE UPDATE ON public.centre_formation
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();