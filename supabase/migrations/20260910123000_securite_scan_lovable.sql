-- Correctifs du scan de sécurité Lovable du 10/09/2026 (2 critiques, 1 avertissement).
-- Rejouable (DROP IF EXISTS + CREATE). Motif initplan (CLAUDE.md) : les appels
-- indépendants de la ligne sont enveloppés en (SELECT fn()).

-- ---------------------------------------------------------------------------
-- 1. enquete_tokens — CRITIQUE
--    Un jeton d'enquête est un secret porteur (lien public de satisfaction /
--    réclamation). La policy d'insertion ne vérifiait que auth.uid() IS NOT NULL :
--    n'importe quel utilisateur authentifié pouvait créer un jeton valide pour un
--    contact d'un AUTRE centre. On exige désormais l'accès au centre du contact
--    (et de la session, si renseignée), comme la policy DELETE existante.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "auth_create_tokens" ON public.enquete_tokens;
DROP POLICY IF EXISTS "Authenticated users can create tokens" ON public.enquete_tokens;
DROP POLICY IF EXISTS "insert_tokens_centre_scoped" ON public.enquete_tokens;

CREATE POLICY "insert_tokens_centre_scoped" ON public.enquete_tokens
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_contact_centre_access(contact_id)
    AND (session_id IS NULL OR public.has_session_centre_access(session_id))
  );

-- ---------------------------------------------------------------------------
-- 2. Bucket produits-photos — CRITIQUE
--    Les quatre policies ne contrôlaient que le rôle, jamais le centre : un
--    admin/staff d'un centre pouvait lire, écraser ou supprimer les photos d'un
--    autre centre. Alignement sur les autres buckets (pedagogie,
--    contact-documents…) : le premier segment du chemin est le centre_id
--    (public.storage_object_centre_id). Le front n'envoie aujourd'hui aucun
--    fichier dans ce bucket ; tout futur envoi devra utiliser <centre_id>/<fichier>.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "produits_photos_public_read" ON storage.objects;
DROP POLICY IF EXISTS "produits_photos_authenticated_read" ON storage.objects;
DROP POLICY IF EXISTS "produits_photos_authenticated_write" ON storage.objects;
DROP POLICY IF EXISTS "produits_photos_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "produits_photos_authenticated_delete" ON storage.objects;
DROP POLICY IF EXISTS "produits_photos_staff_write" ON storage.objects;
DROP POLICY IF EXISTS "produits_photos_staff_update" ON storage.objects;
DROP POLICY IF EXISTS "produits_photos_staff_delete" ON storage.objects;
DROP POLICY IF EXISTS "produits_photos_centre_read" ON storage.objects;
DROP POLICY IF EXISTS "produits_photos_centre_write" ON storage.objects;
DROP POLICY IF EXISTS "produits_photos_centre_update" ON storage.objects;
DROP POLICY IF EXISTS "produits_photos_centre_delete" ON storage.objects;

CREATE POLICY "produits_photos_centre_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'produits-photos'
    AND public.storage_object_centre_id(name) IS NOT NULL
    AND public.has_centre_access(public.storage_object_centre_id(name))
  );

CREATE POLICY "produits_photos_centre_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'produits-photos'
    AND public.storage_object_centre_id(name) IS NOT NULL
    AND public.has_centre_access(public.storage_object_centre_id(name))
    AND (SELECT public.is_admin_or_staff())
  );

CREATE POLICY "produits_photos_centre_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'produits-photos'
    AND public.storage_object_centre_id(name) IS NOT NULL
    AND public.has_centre_access(public.storage_object_centre_id(name))
    AND (SELECT public.is_admin_or_staff())
  )
  WITH CHECK (
    bucket_id = 'produits-photos'
    AND public.storage_object_centre_id(name) IS NOT NULL
    AND public.has_centre_access(public.storage_object_centre_id(name))
    AND (SELECT public.is_admin_or_staff())
  );

CREATE POLICY "produits_photos_centre_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'produits-photos'
    AND public.storage_object_centre_id(name) IS NOT NULL
    AND public.has_centre_access(public.storage_object_centre_id(name))
    AND (SELECT public.is_admin_or_staff())
  );

-- ---------------------------------------------------------------------------
-- 3. formateurs — AVERTISSEMENT
--    La policy SELECT donnait à tout utilisateur de rôle « formateur » la lecture
--    de TOUTES les fiches formateurs du centre, RIB, SIRET et taux horaire compris.
--    Un formateur ne voit plus que sa propre fiche, rattachée par user_id ou par
--    email (le portail formateur la retrouve par email : src/pages/FormateurPortal.tsx).
--    Admin, staff et super_admin : inchangé.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "centre_select_formateurs" ON public.formateurs;

CREATE POLICY "centre_select_formateurs" ON public.formateurs
  FOR SELECT TO authenticated
  USING (
    public.has_centre_access(centre_id)
    AND (
      (SELECT public.is_admin_or_staff())
      OR user_id = (SELECT auth.uid())
      OR lower(email) = lower((SELECT auth.jwt() ->> 'email'))
    )
  );
