
-- 1. user_roles : interdire l'attribution du rôle super_admin sauf par un super_admin
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND (role <> 'super_admin'::app_role OR is_super_admin())
);

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND (role <> 'super_admin'::app_role OR is_super_admin())
);

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND (role <> 'super_admin'::app_role OR is_super_admin())
);

-- 2. centre_formation : scoper la lecture par centre (admins uniquement gardent un accès large)
DROP POLICY IF EXISTS "auth_read_centre_formation" ON public.centre_formation;

CREATE POLICY "auth_read_centre_formation"
ON public.centre_formation
FOR SELECT
TO authenticated
USING (
  is_super_admin()
  OR (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
    AND has_centre_access(id)
  )
);

-- 3. crm_email_accounts : empêcher le staff de lire les jetons OAuth (column-level)
REVOKE SELECT (oauth_encrypted_token, oauth_refresh_token) ON public.crm_email_accounts FROM authenticated;
GRANT SELECT (oauth_encrypted_token, oauth_refresh_token) ON public.crm_email_accounts TO service_role;

-- 4. signature_requests : exiger le jeton d'accès pour les UPDATE publics
DROP POLICY IF EXISTS "Public can sign or refuse sent signature requests" ON public.signature_requests;

CREATE POLICY "Public can sign or refuse sent signature requests"
ON public.signature_requests
FOR UPDATE
USING (
  statut = 'envoye'::text
  AND access_token IS NOT NULL
  AND access_token = ((current_setting('request.headers'::text, true))::json ->> 'x-signature-token'::text)
)
WITH CHECK (
  statut = ANY (ARRAY['signe'::text, 'refuse'::text])
  AND access_token = ((current_setting('request.headers'::text, true))::json ->> 'x-signature-token'::text)
);

-- 5. realtime.messages : restreindre aux utilisateurs authentifiés (default-deny pour anon)
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can receive realtime" ON realtime.messages;
CREATE POLICY "Authenticated users can receive realtime"
ON realtime.messages
FOR SELECT
TO authenticated
USING (true);
