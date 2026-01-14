-- =============================================
-- PHASE 2.2: Émargement numérique (Qualiopi)
-- =============================================

-- Table pour les feuilles d'émargement
CREATE TABLE public.emargements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  date_emargement DATE NOT NULL,
  periode TEXT NOT NULL CHECK (periode IN ('matin', 'apres_midi')),
  heure_debut TIME,
  heure_fin TIME,
  present BOOLEAN NOT NULL DEFAULT false,
  signature_url TEXT,
  signature_data TEXT,
  ip_signature TEXT,
  user_agent_signature TEXT,
  date_signature TIMESTAMP WITH TIME ZONE,
  commentaires TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id, contact_id, date_emargement, periode)
);

-- Index pour les recherches
CREATE INDEX idx_emargements_session_id ON public.emargements(session_id);
CREATE INDEX idx_emargements_contact_id ON public.emargements(contact_id);
CREATE INDEX idx_emargements_date ON public.emargements(date_emargement);

-- Enable RLS
ALTER TABLE public.emargements ENABLE ROW LEVEL SECURITY;

-- Policies pour staff/admin
CREATE POLICY "Staff can select emargements"
ON public.emargements FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role));

CREATE POLICY "Staff can insert emargements"
ON public.emargements FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role));

CREATE POLICY "Staff can update emargements"
ON public.emargements FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role));

CREATE POLICY "Staff can delete emargements"
ON public.emargements FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role));

-- Trigger pour audit
CREATE TRIGGER audit_emargements
AFTER INSERT OR UPDATE OR DELETE ON public.emargements
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- =============================================
-- PHASE 2.3: Notifications en temps réel
-- =============================================

CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour les performances
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs ne voient que leurs propres notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Staff peut créer des notifications pour tous
CREATE POLICY "Staff can insert notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role));

CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;