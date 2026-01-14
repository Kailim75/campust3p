-- =============================================
-- PHASE 1.1: Journal d'audit (audit_logs)
-- =============================================

-- Table pour stocker l'historique des modifications
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour les recherches fréquentes
CREATE INDEX idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_record_id ON public.audit_logs(record_id);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Seuls les admins peuvent voir les logs
CREATE POLICY "Admins can view audit_logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Fonction générique pour créer des logs d'audit
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_data JSONB;
  new_data JSONB;
  changed TEXT[];
  record_uuid UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    old_data := to_jsonb(OLD);
    new_data := NULL;
    record_uuid := OLD.id;
    changed := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    old_data := to_jsonb(OLD);
    new_data := to_jsonb(NEW);
    record_uuid := NEW.id;
    -- Calculer les champs modifiés
    SELECT ARRAY_AGG(key) INTO changed
    FROM jsonb_each(new_data) AS n(key, value)
    WHERE old_data->key IS DISTINCT FROM new_data->key;
  ELSE -- INSERT
    old_data := NULL;
    new_data := to_jsonb(NEW);
    record_uuid := NEW.id;
    changed := NULL;
  END IF;

  INSERT INTO public.audit_logs (
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    changed_fields,
    user_id,
    user_email,
    created_at
  ) VALUES (
    TG_TABLE_NAME,
    record_uuid,
    TG_OP,
    old_data,
    new_data,
    changed,
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    now()
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Appliquer le trigger sur les tables sensibles
CREATE TRIGGER audit_contacts
AFTER INSERT OR UPDATE OR DELETE ON public.contacts
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_factures
AFTER INSERT OR UPDATE OR DELETE ON public.factures
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_paiements
AFTER INSERT OR UPDATE OR DELETE ON public.paiements
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_devis
AFTER INSERT OR UPDATE OR DELETE ON public.devis
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_sessions
AFTER INSERT OR UPDATE OR DELETE ON public.sessions
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_session_inscriptions
AFTER INSERT OR UPDATE OR DELETE ON public.session_inscriptions
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_formateurs
AFTER INSERT OR UPDATE OR DELETE ON public.formateurs
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_user_roles
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_signature_requests
AFTER INSERT OR UPDATE OR DELETE ON public.signature_requests
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- =============================================
-- PHASE 1.2: Corriger FK formateur sur sessions
-- =============================================

-- Ajouter la nouvelle colonne formateur_id
ALTER TABLE public.sessions 
ADD COLUMN formateur_id UUID REFERENCES public.formateurs(id);

-- Créer un index pour les performances
CREATE INDEX idx_sessions_formateur_id ON public.sessions(formateur_id);

-- =============================================
-- PHASE 1.3: Table email_logs
-- =============================================

CREATE TABLE public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  facture_id UUID REFERENCES public.factures(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  template_used TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced', 'delivered')),
  error_message TEXT,
  resend_id TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour les recherches
CREATE INDEX idx_email_logs_contact_id ON public.email_logs(contact_id);
CREATE INDEX idx_email_logs_created_at ON public.email_logs(created_at DESC);
CREATE INDEX idx_email_logs_type ON public.email_logs(type);
CREATE INDEX idx_email_logs_status ON public.email_logs(status);

-- Enable RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Staff peut voir les logs emails
CREATE POLICY "Staff can view email_logs"
ON public.email_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role));

-- Seul le système peut insérer (via service role dans Edge Functions)
CREATE POLICY "System can insert email_logs"
ON public.email_logs FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role));