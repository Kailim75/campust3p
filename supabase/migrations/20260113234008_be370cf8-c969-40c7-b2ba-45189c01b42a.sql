-- Create contact_historique table for tracking exchanges
CREATE TABLE public.contact_historique (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('appel', 'email', 'note', 'sms', 'whatsapp', 'reunion')),
  titre TEXT NOT NULL,
  contenu TEXT,
  date_echange TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  duree_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable Row Level Security
ALTER TABLE public.contact_historique ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow read access to historique"
ON public.contact_historique
FOR SELECT
USING (true);

CREATE POLICY "Allow insert access to historique"
ON public.contact_historique
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow update access to historique"
ON public.contact_historique
FOR UPDATE
USING (true);

CREATE POLICY "Allow delete access to historique"
ON public.contact_historique
FOR DELETE
USING (true);

-- Create index for faster queries
CREATE INDEX idx_contact_historique_contact_id ON public.contact_historique(contact_id);
CREATE INDEX idx_contact_historique_date ON public.contact_historique(date_echange DESC);