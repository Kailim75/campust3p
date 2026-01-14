-- Table pour les demandes de signature
CREATE TABLE public.signature_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  session_inscription_id UUID REFERENCES public.session_inscriptions(id) ON DELETE SET NULL,
  type_document TEXT NOT NULL DEFAULT 'convention', -- 'convention', 'contrat', 'reglement', 'autre'
  titre TEXT NOT NULL,
  description TEXT,
  document_url TEXT, -- URL du document PDF à signer (optionnel)
  statut TEXT NOT NULL DEFAULT 'en_attente', -- 'en_attente', 'envoye', 'signe', 'refuse', 'expire'
  date_envoi TIMESTAMP WITH TIME ZONE,
  date_signature TIMESTAMP WITH TIME ZONE,
  date_expiration DATE,
  signature_data TEXT, -- Données de signature (image base64 stockée temporairement pour conversion)
  signature_url TEXT, -- URL de l'image de signature stockée
  ip_signature TEXT,
  user_agent_signature TEXT,
  commentaires TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.signature_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow read access to signature_requests" 
ON public.signature_requests 
FOR SELECT 
USING (true);

CREATE POLICY "Allow insert access to signature_requests" 
ON public.signature_requests 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow update access to signature_requests" 
ON public.signature_requests 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow delete access to signature_requests" 
ON public.signature_requests 
FOR DELETE 
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_signature_requests_updated_at
BEFORE UPDATE ON public.signature_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for signatures
INSERT INTO storage.buckets (id, name, public) VALUES ('signatures', 'signatures', false);

-- Storage policies for signatures bucket
CREATE POLICY "Allow read access to signatures" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'signatures');

CREATE POLICY "Allow insert access to signatures" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'signatures');

CREATE POLICY "Allow delete access to signatures" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'signatures');