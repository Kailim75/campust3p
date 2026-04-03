
-- =============================================
-- INBOX CRM — Tables (sans policies)
-- =============================================

CREATE TABLE public.crm_email_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id UUID NOT NULL REFERENCES public.centres(id),
  provider TEXT NOT NULL DEFAULT 'gmail',
  email_address TEXT NOT NULL,
  display_name TEXT,
  oauth_encrypted_token TEXT,
  oauth_refresh_token TEXT,
  oauth_token_expires_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  last_history_id TEXT,
  sync_status TEXT NOT NULL DEFAULT 'idle',
  sync_error TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(centre_id, email_address)
);

CREATE TABLE public.crm_email_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id UUID NOT NULL REFERENCES public.centres(id),
  account_id UUID NOT NULL REFERENCES public.crm_email_accounts(id),
  provider TEXT NOT NULL DEFAULT 'gmail',
  provider_thread_id TEXT NOT NULL,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'nouveau',
  is_unread BOOLEAN NOT NULL DEFAULT true,
  priority TEXT NOT NULL DEFAULT 'normale',
  assigned_to UUID,
  assigned_at TIMESTAMPTZ,
  assigned_by UUID,
  last_message_at TIMESTAMPTZ,
  message_count INTEGER NOT NULL DEFAULT 0,
  has_attachments BOOLEAN NOT NULL DEFAULT false,
  snippet TEXT,
  participants JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  UNIQUE(centre_id, provider, provider_thread_id)
);

CREATE TABLE public.crm_email_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id UUID NOT NULL REFERENCES public.centres(id),
  thread_id UUID NOT NULL REFERENCES public.crm_email_threads(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'gmail',
  provider_message_id TEXT NOT NULL,
  source_system TEXT NOT NULL DEFAULT 'gmail',
  in_reply_to TEXT,
  references_header TEXT,
  message_id_header TEXT,
  direction TEXT NOT NULL,
  from_address TEXT NOT NULL,
  from_name TEXT,
  to_addresses JSONB NOT NULL DEFAULT '[]',
  cc_addresses JSONB DEFAULT '[]',
  bcc_addresses JSONB DEFAULT '[]',
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  snippet TEXT,
  gmail_label_ids TEXT[] DEFAULT '{}',
  gmail_internal_date TIMESTAMPTZ,
  has_attachments BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMPTZ,
  sent_by UUID,
  send_status TEXT,
  send_error TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(centre_id, provider, provider_message_id)
);

CREATE TABLE public.crm_email_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id UUID NOT NULL REFERENCES public.centres(id),
  message_id UUID NOT NULL REFERENCES public.crm_email_messages(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  storage_path TEXT,
  sha256_hash TEXT,
  promoted_to_document_id UUID,
  promoted_to_table TEXT,
  promoted_at TIMESTAMPTZ,
  promoted_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.crm_email_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id UUID NOT NULL REFERENCES public.centres(id),
  thread_id UUID NOT NULL REFERENCES public.crm_email_threads(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  link_source TEXT NOT NULL DEFAULT 'auto',
  confidence_score NUMERIC(3,2),
  linked_by UUID,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(thread_id, entity_type, entity_id),
  CONSTRAINT valid_entity_type CHECK (entity_type IN ('contact', 'prospect', 'session', 'facture', 'devis', 'groupe_payeur', 'document'))
);

CREATE TABLE public.crm_email_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id UUID NOT NULL REFERENCES public.centres(id),
  thread_id UUID NOT NULL REFERENCES public.crm_email_threads(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- RLS
-- =============================================
ALTER TABLE public.crm_email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_email_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_email_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_email_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_email_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_email_notes ENABLE ROW LEVEL SECURITY;

-- == crm_email_accounts ==
CREATE POLICY "admin_full_accounts" ON public.crm_email_accounts
  FOR ALL TO authenticated
  USING (public.has_centre_access(centre_id) AND (public.has_role(auth.uid(), 'admin') OR public.is_super_admin()))
  WITH CHECK (public.has_centre_access(centre_id) AND (public.has_role(auth.uid(), 'admin') OR public.is_super_admin()));

CREATE POLICY "staff_read_accounts" ON public.crm_email_accounts
  FOR SELECT TO authenticated
  USING (public.has_centre_access(centre_id) AND public.has_role(auth.uid(), 'staff'));

-- == crm_email_threads ==
CREATE POLICY "admin_full_threads" ON public.crm_email_threads
  FOR ALL TO authenticated
  USING (public.has_centre_access(centre_id) AND (public.has_role(auth.uid(), 'admin') OR public.is_super_admin()))
  WITH CHECK (public.has_centre_access(centre_id) AND (public.has_role(auth.uid(), 'admin') OR public.is_super_admin()));

CREATE POLICY "staff_read_threads" ON public.crm_email_threads
  FOR SELECT TO authenticated
  USING (public.has_centre_access(centre_id) AND public.has_role(auth.uid(), 'staff'));

CREATE POLICY "staff_update_threads" ON public.crm_email_threads
  FOR UPDATE TO authenticated
  USING (public.has_centre_access(centre_id) AND public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_centre_access(centre_id) AND public.has_role(auth.uid(), 'staff'));

CREATE POLICY "formateur_read_threads" ON public.crm_email_threads
  FOR SELECT TO authenticated
  USING (
    public.has_centre_access(centre_id)
    AND public.has_role(auth.uid(), 'formateur')
    AND EXISTS (
      SELECT 1 FROM public.crm_email_links el
      JOIN public.sessions s ON s.id = el.entity_id AND el.entity_type = 'session'
      WHERE el.thread_id = crm_email_threads.id
        AND s.formateur_id = public.get_user_formateur_id()
    )
  );

-- == crm_email_messages ==
CREATE POLICY "admin_full_messages" ON public.crm_email_messages
  FOR ALL TO authenticated
  USING (public.has_centre_access(centre_id) AND (public.has_role(auth.uid(), 'admin') OR public.is_super_admin()))
  WITH CHECK (public.has_centre_access(centre_id) AND (public.has_role(auth.uid(), 'admin') OR public.is_super_admin()));

CREATE POLICY "staff_read_messages" ON public.crm_email_messages
  FOR SELECT TO authenticated
  USING (public.has_centre_access(centre_id) AND public.has_role(auth.uid(), 'staff'));

CREATE POLICY "staff_insert_messages" ON public.crm_email_messages
  FOR INSERT TO authenticated
  WITH CHECK (public.has_centre_access(centre_id) AND public.has_role(auth.uid(), 'staff'));

CREATE POLICY "formateur_read_messages" ON public.crm_email_messages
  FOR SELECT TO authenticated
  USING (
    public.has_centre_access(centre_id)
    AND public.has_role(auth.uid(), 'formateur')
    AND EXISTS (
      SELECT 1 FROM public.crm_email_threads t
      JOIN public.crm_email_links el ON el.thread_id = t.id
      JOIN public.sessions s ON s.id = el.entity_id AND el.entity_type = 'session'
      WHERE t.id = crm_email_messages.thread_id
        AND s.formateur_id = public.get_user_formateur_id()
    )
  );

-- == crm_email_attachments ==
CREATE POLICY "admin_full_attachments" ON public.crm_email_attachments
  FOR ALL TO authenticated
  USING (public.has_centre_access(centre_id) AND (public.has_role(auth.uid(), 'admin') OR public.is_super_admin()))
  WITH CHECK (public.has_centre_access(centre_id) AND (public.has_role(auth.uid(), 'admin') OR public.is_super_admin()));

CREATE POLICY "staff_read_attachments" ON public.crm_email_attachments
  FOR SELECT TO authenticated
  USING (public.has_centre_access(centre_id) AND public.has_role(auth.uid(), 'staff'));

CREATE POLICY "staff_update_attachments" ON public.crm_email_attachments
  FOR UPDATE TO authenticated
  USING (public.has_centre_access(centre_id) AND public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_centre_access(centre_id) AND public.has_role(auth.uid(), 'staff'));

CREATE POLICY "formateur_read_attachments" ON public.crm_email_attachments
  FOR SELECT TO authenticated
  USING (
    public.has_centre_access(centre_id)
    AND public.has_role(auth.uid(), 'formateur')
    AND EXISTS (
      SELECT 1 FROM public.crm_email_messages m
      JOIN public.crm_email_threads t ON t.id = m.thread_id
      JOIN public.crm_email_links el ON el.thread_id = t.id
      JOIN public.sessions s ON s.id = el.entity_id AND el.entity_type = 'session'
      WHERE m.id = crm_email_attachments.message_id
        AND s.formateur_id = public.get_user_formateur_id()
    )
  );

-- == crm_email_links ==
CREATE POLICY "admin_full_links" ON public.crm_email_links
  FOR ALL TO authenticated
  USING (public.has_centre_access(centre_id) AND (public.has_role(auth.uid(), 'admin') OR public.is_super_admin()))
  WITH CHECK (public.has_centre_access(centre_id) AND (public.has_role(auth.uid(), 'admin') OR public.is_super_admin()));

CREATE POLICY "staff_read_links" ON public.crm_email_links
  FOR SELECT TO authenticated
  USING (public.has_centre_access(centre_id) AND public.has_role(auth.uid(), 'staff'));

CREATE POLICY "staff_insert_links" ON public.crm_email_links
  FOR INSERT TO authenticated
  WITH CHECK (public.has_centre_access(centre_id) AND public.has_role(auth.uid(), 'staff'));

CREATE POLICY "formateur_read_links" ON public.crm_email_links
  FOR SELECT TO authenticated
  USING (public.has_centre_access(centre_id) AND public.has_role(auth.uid(), 'formateur'));

-- == crm_email_notes ==
CREATE POLICY "admin_full_notes" ON public.crm_email_notes
  FOR ALL TO authenticated
  USING (public.has_centre_access(centre_id) AND (public.has_role(auth.uid(), 'admin') OR public.is_super_admin()))
  WITH CHECK (public.has_centre_access(centre_id) AND (public.has_role(auth.uid(), 'admin') OR public.is_super_admin()));

CREATE POLICY "staff_crud_own_notes" ON public.crm_email_notes
  FOR ALL TO authenticated
  USING (public.has_centre_access(centre_id) AND public.has_role(auth.uid(), 'staff') AND created_by = auth.uid())
  WITH CHECK (public.has_centre_access(centre_id) AND public.has_role(auth.uid(), 'staff') AND created_by = auth.uid());

CREATE POLICY "staff_read_all_notes" ON public.crm_email_notes
  FOR SELECT TO authenticated
  USING (public.has_centre_access(centre_id) AND public.has_role(auth.uid(), 'staff'));

CREATE POLICY "formateur_read_notes" ON public.crm_email_notes
  FOR SELECT TO authenticated
  USING (
    public.has_centre_access(centre_id)
    AND public.has_role(auth.uid(), 'formateur')
    AND EXISTS (
      SELECT 1 FROM public.crm_email_threads t
      JOIN public.crm_email_links el ON el.thread_id = t.id
      JOIN public.sessions s ON s.id = el.entity_id AND el.entity_type = 'session'
      WHERE t.id = crm_email_notes.thread_id
        AND s.formateur_id = public.get_user_formateur_id()
    )
  );

-- =============================================
-- Index
-- =============================================
CREATE INDEX idx_crm_threads_centre_status ON public.crm_email_threads(centre_id, status);
CREATE INDEX idx_crm_threads_assigned ON public.crm_email_threads(assigned_to);
CREATE INDEX idx_crm_threads_last_msg ON public.crm_email_threads(last_message_at DESC);
CREATE INDEX idx_crm_threads_unread ON public.crm_email_threads(centre_id, is_unread) WHERE is_unread = true;
CREATE INDEX idx_crm_messages_thread ON public.crm_email_messages(thread_id);
CREATE INDEX idx_crm_messages_from ON public.crm_email_messages(from_address);
CREATE INDEX idx_crm_messages_date ON public.crm_email_messages(received_at DESC);
CREATE INDEX idx_crm_attachments_message ON public.crm_email_attachments(message_id);
CREATE INDEX idx_crm_attachments_hash ON public.crm_email_attachments(sha256_hash);
CREATE INDEX idx_crm_links_thread ON public.crm_email_links(thread_id);
CREATE INDEX idx_crm_links_entity ON public.crm_email_links(entity_type, entity_id);
CREATE INDEX idx_crm_notes_thread ON public.crm_email_notes(thread_id);

-- =============================================
-- Triggers updated_at
-- =============================================
CREATE TRIGGER update_crm_email_accounts_updated_at
  BEFORE UPDATE ON public.crm_email_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_email_threads_updated_at
  BEFORE UPDATE ON public.crm_email_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_email_notes_updated_at
  BEFORE UPDATE ON public.crm_email_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Storage bucket (privé, isolé par centre_id)
-- =============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('crm-email-attachments', 'crm-email-attachments', false);

CREATE POLICY "centre_read_email_attachments" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'crm-email-attachments'
    AND (storage.foldername(name))[1] IN (
      SELECT uc.centre_id::text FROM public.user_centres uc WHERE uc.user_id = auth.uid()
    )
  );

CREATE POLICY "admin_insert_email_attachments" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'crm-email-attachments'
    AND (storage.foldername(name))[1] IN (
      SELECT uc.centre_id::text FROM public.user_centres uc WHERE uc.user_id = auth.uid()
    )
    AND (public.has_role(auth.uid(), 'admin') OR public.is_super_admin())
  );
