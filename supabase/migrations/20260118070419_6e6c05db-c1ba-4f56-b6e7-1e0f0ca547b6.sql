-- Allow staff users to update Qualiopi indicators (status changes)
-- Existing policy only allows admin.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'qualiopi_indicateurs'
      AND policyname = 'Staff can update qualiopi_indicateurs'
  ) THEN
    EXECUTE 'CREATE POLICY "Staff can update qualiopi_indicateurs"
    ON public.qualiopi_indicateurs
    FOR UPDATE
    TO authenticated
    USING (
      has_role(auth.uid(), ''admin''::public.app_role)
      OR has_role(auth.uid(), ''staff''::public.app_role)
    )
    WITH CHECK (
      has_role(auth.uid(), ''admin''::public.app_role)
      OR has_role(auth.uid(), ''staff''::public.app_role)
    )';
  END IF;
END $$;