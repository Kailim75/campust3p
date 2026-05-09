
-- 1. Realtime channel subscription scoping
DROP POLICY IF EXISTS "Authenticated users can subscribe to channels" ON realtime.messages;
DROP POLICY IF EXISTS "auth_realtime_subscribe" ON realtime.messages;
DROP POLICY IF EXISTS "Allow authenticated subscriptions" ON realtime.messages;
DROP POLICY IF EXISTS "authenticated can subscribe" ON realtime.messages;

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'realtime' AND tablename = 'messages'
      AND (qual = 'true' OR qual ILIKE '%auth.uid() IS NOT NULL%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON realtime.messages', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "scoped_realtime_subscribe" ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL AND (
      -- Personal notification channels: notifications-<uid>
      realtime.topic() = 'notifications-' || auth.uid()::text
      -- Generic notification channels (filtered by table RLS on payload)
      OR realtime.topic() IN ('notifications-count', 'notifications-realtime')
      -- Centre-scoped inbox channel: inbox-rt-<centre_uuid>
      OR (
        realtime.topic() ~ '^inbox-rt-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND public.has_centre_access(
          (regexp_replace(realtime.topic(), '^inbox-rt-', ''))::uuid
        )
      )
    )
  );

-- 2. enquete_tokens DELETE ownership check
DROP POLICY IF EXISTS "auth_delete_tokens" ON public.enquete_tokens;

CREATE POLICY "delete_tokens_centre_scoped" ON public.enquete_tokens
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = enquete_tokens.contact_id
        AND public.has_centre_access(c.centre_id)
    )
  );

-- 3. CRM email attachments storage: drop overly permissive INSERT policy
DROP POLICY IF EXISTS "admin_staff_insert_crm_attachments" ON storage.objects;
