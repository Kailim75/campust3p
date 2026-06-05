
-- 1. contact_requalification_log: rewrite broken policies
DROP POLICY IF EXISTS "Admin/staff peuvent lire les logs de leur centre" ON public.contact_requalification_log;
DROP POLICY IF EXISTS "Admin/staff peuvent inserer des logs de leur centre" ON public.contact_requalification_log;

CREATE POLICY "Admin/staff peuvent lire les logs de leur centre"
ON public.contact_requalification_log
FOR SELECT TO authenticated
USING (
  has_centre_access(centre_id)
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'staff'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
);

CREATE POLICY "Admin/staff peuvent inserer des logs de leur centre"
ON public.contact_requalification_log
FOR INSERT TO authenticated
WITH CHECK (
  has_centre_access(centre_id)
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'staff'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
);

-- 2. produits-photos storage: restrict writes to admins/staff
DROP POLICY IF EXISTS "produits_photos_authenticated_write" ON storage.objects;
DROP POLICY IF EXISTS "produits_photos_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "produits_photos_authenticated_delete" ON storage.objects;

CREATE POLICY "produits_photos_staff_write"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'produits-photos'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'staff'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
);

CREATE POLICY "produits_photos_staff_update"
ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'produits-photos'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'staff'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
);

CREATE POLICY "produits_photos_staff_delete"
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'produits-photos'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'staff'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
);

-- 3. realtime inbox channel: require admin/staff role
DROP POLICY IF EXISTS "scoped_realtime_subscribe" ON realtime.messages;

CREATE POLICY "scoped_realtime_subscribe"
ON realtime.messages
FOR SELECT TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    realtime.topic() = ('notifications-' || auth.uid()::text)
    OR realtime.topic() = ANY (ARRAY['notifications-count', 'notifications-realtime'])
    OR (
      realtime.topic() ~ '^inbox-rt-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND has_centre_access((regexp_replace(realtime.topic(), '^inbox-rt-', ''))::uuid)
      AND (
        has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'staff'::app_role)
        OR has_role(auth.uid(), 'super_admin'::app_role)
      )
    )
  )
);

-- 4. Permissive insert policies: restrict to service_role
DROP POLICY IF EXISTS "Service role insertion blocages" ON public.contact_duplicate_block_log;
CREATE POLICY "Service role insertion blocages"
ON public.contact_duplicate_block_log
FOR INSERT TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_insert_tracking" ON public.email_tracking_events;
CREATE POLICY "service_role_insert_tracking"
ON public.email_tracking_events
FOR INSERT TO service_role
WITH CHECK (true);

-- 5. Security invoker on view
ALTER VIEW public.session_inscription_counts SET (security_invoker = true);
