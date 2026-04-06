-- 1. Staff can delete links they created or any link (admin already has ALL)
CREATE POLICY "staff_delete_links" ON public.crm_email_links
FOR DELETE USING (
  has_centre_access(centre_id) AND has_role(auth.uid(), 'staff'::app_role)
);

-- 2. Add gmail_attachment_id column for on-demand download
ALTER TABLE public.crm_email_attachments
ADD COLUMN IF NOT EXISTS gmail_attachment_id text;

-- 3. Index for assignment filter
CREATE INDEX IF NOT EXISTS idx_crm_email_threads_assigned_to
ON public.crm_email_threads (assigned_to) WHERE assigned_to IS NOT NULL;

-- 4. Storage policies for crm-email-attachments bucket
CREATE POLICY "admin_staff_read_crm_attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'crm-email-attachments'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'staff'::public.app_role)
    OR public.is_super_admin()
  )
);

CREATE POLICY "admin_staff_insert_crm_attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'crm-email-attachments'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'staff'::public.app_role)
    OR public.is_super_admin()
  )
);

-- 5. Unique constraint on crm_email_links if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'crm_email_links_thread_entity_unique'
  ) THEN
    ALTER TABLE public.crm_email_links
    ADD CONSTRAINT crm_email_links_thread_entity_unique
    UNIQUE (thread_id, entity_type, entity_id);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;