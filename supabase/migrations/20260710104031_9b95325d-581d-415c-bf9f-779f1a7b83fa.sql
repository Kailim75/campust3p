
DROP POLICY IF EXISTS "Anon view available creneaux" ON public.creneaux_conduite;

DROP POLICY IF EXISTS "Centre members can read params" ON public.parametres_financiers;
CREATE POLICY "Admins and staff can read params"
ON public.parametres_financiers
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'staff'::app_role)
  OR is_super_admin()
);

DROP POLICY IF EXISTS "pdp_tx_select_by_centre" ON public.facture_pdp_transmissions;
CREATE POLICY "pdp_tx_select_by_centre"
ON public.facture_pdp_transmissions
FOR SELECT
TO authenticated
USING (
  has_centre_access(centre_id)
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role) OR is_super_admin())
);

ALTER TABLE public.signature_requests
  ALTER COLUMN access_token SET NOT NULL,
  ALTER COLUMN access_token SET DEFAULT encode(extensions.gen_random_bytes(32), 'hex');
