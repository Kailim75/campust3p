
-- Drop and recreate INSERT policy to allow null centre_id for authenticated users
DROP POLICY "Users can create action logs for their centre" ON public.ia_action_logs;
CREATE POLICY "Users can create action logs"
  ON public.ia_action_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (centre_id IS NULL OR has_centre_access(centre_id))
  );

-- Also fix SELECT policy to allow reading own logs with null centre_id
DROP POLICY "Users can view their centre action logs" ON public.ia_action_logs;
CREATE POLICY "Users can view action logs"
  ON public.ia_action_logs
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR is_super_admin()
    OR (centre_id IS NOT NULL AND has_centre_access(centre_id))
  );

-- Fix UPDATE policy too
DROP POLICY "Users can update their centre action logs" ON public.ia_action_logs;
CREATE POLICY "Users can update action logs"
  ON public.ia_action_logs
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR is_super_admin()
    OR (centre_id IS NOT NULL AND has_centre_access(centre_id))
  );
