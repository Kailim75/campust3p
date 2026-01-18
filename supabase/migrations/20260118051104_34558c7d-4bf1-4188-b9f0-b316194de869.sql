-- Table pour stocker les tokens d'accès aux formulaires d'enquête
CREATE TABLE public.enquete_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  type TEXT NOT NULL DEFAULT 'satisfaction', -- 'satisfaction' ou 'reclamation'
  expire_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days'),
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour les recherches par token
CREATE INDEX idx_enquete_tokens_token ON public.enquete_tokens(token);
CREATE INDEX idx_enquete_tokens_contact ON public.enquete_tokens(contact_id);
CREATE INDEX idx_enquete_tokens_session ON public.enquete_tokens(session_id);

-- Enable RLS
ALTER TABLE public.enquete_tokens ENABLE ROW LEVEL SECURITY;

-- Policy pour lecture publique via token (pour la page d'enquête)
CREATE POLICY "Tokens are accessible via their token value"
  ON public.enquete_tokens
  FOR SELECT
  USING (true);

-- Policy pour création par utilisateurs authentifiés
CREATE POLICY "Authenticated users can create tokens"
  ON public.enquete_tokens
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policy pour mise à jour (marquer comme utilisé)
CREATE POLICY "Anyone can mark token as used"
  ON public.enquete_tokens
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policy pour suppression par utilisateurs authentifiés
CREATE POLICY "Authenticated users can delete tokens"
  ON public.enquete_tokens
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Ajouter realtime pour suivi des réponses
ALTER PUBLICATION supabase_realtime ADD TABLE public.enquete_tokens;

-- Trigger de validation pour expiration (remplace CHECK constraint)
CREATE OR REPLACE FUNCTION public.validate_enquete_token_expiration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expire_at <= now() THEN
    RAISE EXCEPTION 'expire_at must be in the future';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_enquete_token_before_insert
  BEFORE INSERT ON public.enquete_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_enquete_token_expiration();

-- Politique pour que satisfaction_reponses accepte les soumissions sans auth
DROP POLICY IF EXISTS "Users can insert their own satisfaction responses" ON public.satisfaction_reponses;
CREATE POLICY "Anyone can submit satisfaction responses"
  ON public.satisfaction_reponses
  FOR INSERT
  WITH CHECK (true);

-- Politique pour que reclamations accepte les soumissions sans auth  
DROP POLICY IF EXISTS "Users can create reclamations" ON public.reclamations;
CREATE POLICY "Anyone can submit reclamations"
  ON public.reclamations
  FOR INSERT
  WITH CHECK (true);