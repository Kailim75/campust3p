-- ════════════════════════════════════════════════════════════════════════════
-- Corrige l'accès en lecture aux signatures du flux de signature publique.
-- ════════════════════════════════════════════════════════════════════════════
-- À FAIRE APPLIQUER PAR L'AGENT LOVABLE (le sync GitHub n'applique pas les
-- migrations ; l'éditeur SQL du panneau Cloud refuse le DDL).
--
-- ── Symptôme (capture directeur, 14/09/2026) ─────────────────────────────────
-- « Voir signature » → « Impossible d'ouvrir la signature (fichier introuvable
-- ou accès refusé) ». (Avant le correctif front #98, c'était un 404 « Page
-- introuvable » : une valeur signature_url = chemin brut ouverte comme route.)
--
-- ── Cause racine (mesurée en prod, lecture seule) ────────────────────────────
-- L'edge function public-sign-document téléverse les PNG de signature à :
--   generated-documents / centre/<centreId>/signatures/<contactId>/sig-<id>-<ts>.png
-- (préfixe « centre/ »). Or la fonction RLS storage_object_centre_id(name) lit le
-- centre au PREMIER segment du chemin ; sur ces chemins elle lit « centre »
-- (pas un uuid) → renvoie NULL. La policy de lecture du bucket
-- (gd_select : bucket_id='generated-documents' AND storage_object_centre_id(name)
-- IS NOT NULL AND …) refuse alors la lecture à TOUT LE MONDE, y compris admin.
-- Mesuré : storage_object_centre_id('centre/97e6…/signatures/…') = NULL, et le
-- fichier existe bien (EXISTS dans generated-documents = true). Ce n'est donc pas
-- « fichier introuvable » mais « accès refusé » par la RLS.
--
-- ── Correctif ────────────────────────────────────────────────────────────────
-- Rendre storage_object_centre_id tolérant à un préfixe « centre/ » : le centre
-- est alors au 2ᵉ segment. La fonction est par ailleurs INCHANGÉE (même signature,
-- STABLE, SECURITY DEFINER, search_path=public). Aucune baisse de sécurité : la
-- policy vérifie ENSUITE que l'utilisateur a accès à CE centre (un chemin ne peut
-- pas être forgé sans passer la policy d'INSERT). Corrige toutes les signatures
-- existantes ET futures, sans déplacer aucun fichier.
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.storage_object_centre_id(object_name text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_seg text;
BEGIN
  v_seg := split_part(object_name, '/', 1);
  -- Tolère un préfixe « centre/ » (chemin du flux public-sign-document) :
  -- le centre est alors au 2ᵉ segment.
  IF v_seg = 'centre' THEN
    v_seg := split_part(object_name, '/', 2);
  END IF;
  BEGIN
    RETURN v_seg::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$function$;

-- ── SONDE DE VÉRIFICATION (éditeur SQL, après application) ────────────────────
-- Doit renvoyer un uuid (et non NULL) sur un chemin « centre/… » :
-- SELECT storage_object_centre_id(name) AS centre, left(name, 50) AS chemin
-- FROM storage.objects
-- WHERE bucket_id = 'generated-documents' AND name ILIKE 'centre/%sig-%'
-- LIMIT 3;
