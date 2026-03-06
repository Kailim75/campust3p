-- Fix access to legacy template files stored under "templates/..."
-- Current storage policies require a UUID as first path segment, which blocks older template objects.

DROP POLICY IF EXISTS dt_select ON storage.objects;
CREATE POLICY dt_select
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'document-templates'
  AND (
    (
      storage_object_centre_id(name) IS NOT NULL
      AND has_centre_access(storage_object_centre_id(name))
    )
    OR name LIKE 'templates/%'
  )
  AND (
    has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'staff')
    OR is_super_admin()
  )
);

DROP POLICY IF EXISTS dt_insert ON storage.objects;
CREATE POLICY dt_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'document-templates'
  AND (
    (
      storage_object_centre_id(name) IS NOT NULL
      AND has_centre_access(storage_object_centre_id(name))
    )
    OR name LIKE 'templates/%'
  )
  AND (
    has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'staff')
    OR is_super_admin()
  )
);

DROP POLICY IF EXISTS dt_delete ON storage.objects;
CREATE POLICY dt_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'document-templates'
  AND (
    (
      storage_object_centre_id(name) IS NOT NULL
      AND has_centre_access(storage_object_centre_id(name))
    )
    OR name LIKE 'templates/%'
  )
  AND (
    has_role(auth.uid(), 'admin')
    OR is_super_admin()
  )
);