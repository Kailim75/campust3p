-- Create enum for session status
CREATE TYPE public.session_status AS ENUM ('a_venir', 'en_cours', 'terminee', 'annulee', 'complet');

-- Create sessions table
CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  formation_type public.formation_type NOT NULL,
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  places_totales INTEGER NOT NULL DEFAULT 10,
  lieu TEXT,
  formateur TEXT,
  prix DECIMAL(10,2),
  description TEXT,
  statut public.session_status NOT NULL DEFAULT 'a_venir',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sessions (authenticated users can manage sessions)
CREATE POLICY "Authenticated users can view sessions"
ON public.sessions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create sessions"
ON public.sessions
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update sessions"
ON public.sessions
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete sessions"
ON public.sessions
FOR DELETE
TO authenticated
USING (true);

-- Create session_inscriptions table (link between contacts and sessions)
CREATE TABLE public.session_inscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  statut TEXT NOT NULL DEFAULT 'inscrit',
  date_inscription TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  commentaires TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id, contact_id)
);

-- Enable RLS
ALTER TABLE public.session_inscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inscriptions
CREATE POLICY "Authenticated users can view inscriptions"
ON public.session_inscriptions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create inscriptions"
ON public.session_inscriptions
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update inscriptions"
ON public.session_inscriptions
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete inscriptions"
ON public.session_inscriptions
FOR DELETE
TO authenticated
USING (true);

-- Add trigger for updated_at on sessions
CREATE TRIGGER update_sessions_updated_at
BEFORE UPDATE ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for updated_at on session_inscriptions
CREATE TRIGGER update_session_inscriptions_updated_at
BEFORE UPDATE ON public.session_inscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();