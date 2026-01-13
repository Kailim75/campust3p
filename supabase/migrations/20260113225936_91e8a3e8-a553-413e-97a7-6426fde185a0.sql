
-- Create enums for payment system
CREATE TYPE public.financement_type AS ENUM ('personnel', 'entreprise', 'cpf', 'opco');
CREATE TYPE public.facture_statut AS ENUM ('brouillon', 'emise', 'payee', 'partiel', 'impayee', 'annulee');
CREATE TYPE public.mode_paiement AS ENUM ('cb', 'virement', 'cheque', 'especes', 'cpf');

-- Create factures table
CREATE TABLE public.factures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  session_inscription_id UUID REFERENCES public.session_inscriptions(id) ON DELETE SET NULL,
  numero_facture TEXT NOT NULL UNIQUE,
  montant_total NUMERIC NOT NULL CHECK (montant_total >= 0),
  type_financement public.financement_type NOT NULL DEFAULT 'personnel',
  statut public.facture_statut NOT NULL DEFAULT 'brouillon',
  date_emission DATE,
  date_echeance DATE,
  commentaires TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create paiements table
CREATE TABLE public.paiements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  facture_id UUID NOT NULL REFERENCES public.factures(id) ON DELETE CASCADE,
  montant NUMERIC NOT NULL CHECK (montant > 0),
  date_paiement DATE NOT NULL DEFAULT CURRENT_DATE,
  mode_paiement public.mode_paiement NOT NULL,
  reference TEXT,
  commentaires TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.factures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paiements ENABLE ROW LEVEL SECURITY;

-- RLS policies for factures
CREATE POLICY "Allow read access to factures" ON public.factures FOR SELECT USING (true);
CREATE POLICY "Allow insert access to factures" ON public.factures FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update access to factures" ON public.factures FOR UPDATE USING (true);
CREATE POLICY "Allow delete access to factures" ON public.factures FOR DELETE USING (true);

-- RLS policies for paiements
CREATE POLICY "Allow read access to paiements" ON public.paiements FOR SELECT USING (true);
CREATE POLICY "Allow insert access to paiements" ON public.paiements FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update access to paiements" ON public.paiements FOR UPDATE USING (true);
CREATE POLICY "Allow delete access to paiements" ON public.paiements FOR DELETE USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_factures_updated_at
  BEFORE UPDATE ON public.factures
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION public.generate_numero_facture()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  current_year TEXT;
  next_number INTEGER;
  new_numero TEXT;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  SELECT COALESCE(MAX(
    CASE 
      WHEN numero_facture ~ ('^FAC-' || current_year || '-[0-9]+$')
      THEN SUBSTRING(numero_facture FROM 'FAC-' || current_year || '-([0-9]+)')::INTEGER
      ELSE 0
    END
  ), 0) + 1
  INTO next_number
  FROM public.factures;
  
  new_numero := 'FAC-' || current_year || '-' || LPAD(next_number::TEXT, 4, '0');
  
  RETURN new_numero;
END;
$$;

-- Function to update facture status based on payments
CREATE OR REPLACE FUNCTION public.update_facture_statut()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  total_paye NUMERIC;
  montant_facture NUMERIC;
BEGIN
  -- Get total paid for this invoice
  SELECT COALESCE(SUM(montant), 0)
  INTO total_paye
  FROM public.paiements
  WHERE facture_id = COALESCE(NEW.facture_id, OLD.facture_id);
  
  -- Get invoice total
  SELECT montant_total
  INTO montant_facture
  FROM public.factures
  WHERE id = COALESCE(NEW.facture_id, OLD.facture_id);
  
  -- Update invoice status
  UPDATE public.factures
  SET statut = CASE
    WHEN total_paye >= montant_facture THEN 'payee'::facture_statut
    WHEN total_paye > 0 THEN 'partiel'::facture_statut
    ELSE statut
  END
  WHERE id = COALESCE(NEW.facture_id, OLD.facture_id)
    AND statut NOT IN ('brouillon', 'annulee');
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger to update facture status when payment is added/updated/deleted
CREATE TRIGGER update_facture_statut_on_paiement
  AFTER INSERT OR UPDATE OR DELETE ON public.paiements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_facture_statut();
