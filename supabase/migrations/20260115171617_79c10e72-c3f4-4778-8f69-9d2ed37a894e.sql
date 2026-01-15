-- Create table for document sending history
CREATE TABLE public.document_envois (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  formateur_id UUID REFERENCES public.formateurs(id) ON DELETE SET NULL,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL,
  document_name TEXT NOT NULL,
  document_path TEXT,
  envoi_type TEXT NOT NULL DEFAULT 'email', -- email, sms, autre
  statut TEXT NOT NULL DEFAULT 'envoyé', -- envoyé, reçu, erreur
  date_envoi TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  date_reception TIMESTAMP WITH TIME ZONE,
  envoyé_par UUID,
  metadata JSONB,
  commentaires TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.document_envois ENABLE ROW LEVEL SECURITY;

-- Policies for document_envois
CREATE POLICY "Users can view document envois" 
ON public.document_envois 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create document envois" 
ON public.document_envois 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update document envois" 
ON public.document_envois 
FOR UPDATE 
USING (true);

-- Add index for performance
CREATE INDEX idx_document_envois_contact_id ON public.document_envois(contact_id);
CREATE INDEX idx_document_envois_session_id ON public.document_envois(session_id);
CREATE INDEX idx_document_envois_date ON public.document_envois(date_envoi DESC);