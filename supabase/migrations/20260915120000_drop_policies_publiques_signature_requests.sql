-- P0 sécurité — fermeture des policies publiques par en-tête sur public.signature_requests
--
-- Contexte : deux policies publiques survivent sur cette table, gardées par un en-tête HTTP
-- x-signature-token qu'aucun code n'a jamais envoyé :
--   - "Public can view signature request with valid access token" (SELECT TO public,
--     créée par 20260402185314)
--   - "Public can sign or refuse sent signature requests" (UPDATE sans clause TO, créée par
--     20260209220359, redéfinie par 20260504182940)
-- Toutes deux conservées à dessein par 20260714185913 (bloc "preserve public-token access
-- policies", ~ligne 450-465) au moment où les autres policies par has_role() ont été nettoyées.
--
-- Pourquoi sans risque fonctionnel : le flux public de signature passe exclusivement par les
-- edge functions service_role resolve-signing-token / public-sign-document (voir
-- src/pages/SignaturePage.tsx, qui n'appelle jamais supabase.from("signature_requests")). Aucun
-- code — ni edge function, ni client — n'a jamais envoyé l'en-tête x-signature-token qui garde
-- ces policies : `git log -S'x-signature-token' --oneline` ne retourne que 2 commits, tous deux
-- des ajouts de migrations SQL (0c230b8c, df4bf9eb), jamais du code applicatif qui le poserait
-- sur une requête. Ces policies sont donc mortes et exploitables par quiconque connaît un
-- contact_id/session_inscription_id (falsification d'état de signature avec le seul jeton de
-- lecture reçu par e-mail).
--
-- Sonde avant application (attendu : les 2 policies ci-dessus, TO public / sans clause TO) :
--   SELECT policyname, roles, cmd FROM pg_policies WHERE schemaname='public' AND tablename='signature_requests';
-- Sonde après application (attendu : uniquement des policies TO authenticated) :
--   SELECT policyname, roles, cmd FROM pg_policies WHERE schemaname='public' AND tablename='signature_requests';

DROP POLICY IF EXISTS "Public can sign or refuse sent signature requests" ON public.signature_requests;
DROP POLICY IF EXISTS "Public can view signature request with valid access token" ON public.signature_requests;

-- Ceinture : anon n'a aucune raison d'accéder à cette table (SignaturePage n'y accède que via les edge functions).
REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public.signature_requests FROM anon;

-- Assertions (la migration échoue si la fermeture n'est pas effective)
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'signature_requests'
     AND ('public' = ANY(roles) OR 'anon' = ANY(roles));
  IF n <> 0 THEN
    RAISE EXCEPTION 'signature_requests : % policy(ies) public/anon subsistent', n;
  END IF;
  SELECT count(*) INTO n FROM information_schema.role_table_grants
   WHERE table_schema = 'public' AND table_name = 'signature_requests' AND grantee = 'anon';
  IF n <> 0 THEN
    RAISE EXCEPTION 'signature_requests : anon détient encore % privilège(s)', n;
  END IF;
  SELECT count(*) INTO n FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'signature_requests' AND 'authenticated' = ANY(roles);
  IF n < 4 THEN
    RAISE EXCEPTION 'signature_requests : policies staff attendues (4), trouvées %', n;
  END IF;
END $$;
