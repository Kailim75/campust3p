-- Durcissement sécurité — bucket de stockage public.produits-photos rendu privé
--
-- Contexte : le bucket "produits-photos" a été créé public (migration
-- 20260509104943, VALUES ('produits-photos', 'produits-photos', true)). Un
-- bucket public expose tout objet via une URL /object/public/<bucket>/<path>
-- devinable, sans vérification RLS ni jeton — même si l'écriture est déjà
-- restreinte au staff/admin du centre et cloisonnée par centre_id (migration
-- 20260910123000, storage_object_centre_id) depuis le 10/09/2026.
--
-- Preuve qu'aucun code front ou edge ne dépend de l'URL publique de ce bucket
-- (aucun appel `getPublicUrl` sur "produits-photos") :
--   grep -rn "produits-photos" src supabase   → aucune occurrence hors migrations SQL
--   grep -rn "getPublicUrl" src               → CentreFormationSettings.tsx,
--     LearnerEmargementTab.tsx, useContactDocuments.ts, useEmargements.ts,
--     useSignatures.ts — aucun ne cible ce bucket.
-- Passer le bucket en privé n'exige donc aucun changement de code : les
-- consommateurs éventuels devront utiliser `createSignedUrl` (déjà le motif
-- utilisé ailleurs dans le repo pour les buckets privés).
--
-- Idempotente : ne modifie rien si le bucket est déjà privé ou absent.
--
-- Sonde avant application :
--   SELECT id, public FROM storage.buckets WHERE id = 'produits-photos';
-- Sonde après application (attendu : public = false) :
--   SELECT id, public FROM storage.buckets WHERE id = 'produits-photos';

UPDATE storage.buckets
   SET public = false
 WHERE id = 'produits-photos'
   AND public = true;

-- Assertion (la migration échoue si le bucket reste public)
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM storage.buckets
   WHERE id = 'produits-photos' AND public = true;
  IF n <> 0 THEN
    RAISE EXCEPTION 'produits-photos : le bucket est toujours public';
  END IF;
END $$;
