-- Audit du 13/08/2026 — P0 (sécurité / intégrité juridique des signatures)
--
-- Ces quatre RPC sont SECURITY DEFINER (contournent la RLS), étaient accordées
-- au rôle anon et ne prennent qu'un UUID en paramètre : aucune vérification de
-- jeton n'était possible. À partir du seul UUID d'un lien de signature, un
-- tiers non authentifié pouvait lire l'identité/email du candidat, récupérer
-- l'access_token de TOUS ses documents (get_related_signature_docs) et faire
-- passer une demande à « signé » ou « refusé ».
--
-- Le flux public passe désormais exclusivement par l'edge function
-- public-sign-document (actions get_info / list_related / get_document_url /
-- sign / refuse, gardées par access_token ou signing_token). Les fonctions
-- sont conservées (révocation réversible) mais ne sont plus appelables par
-- le client. Aucun code serveur ne les utilise (vérifié : 0 usage dans
-- supabase/functions/).
--
-- ORDRE DE DÉPLOIEMENT (sinon la page de signature casse) :
--   1) redéployer l'edge function public-sign-document ;
--   2) publier le front (SignaturePage n'appelle plus ces RPC) ;
--   3) appliquer cette migration.

REVOKE EXECUTE ON FUNCTION public.get_signature_request_public(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_related_signature_docs(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sign_document_public(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refuse_document_public(uuid, text) FROM PUBLIC, anon, authenticated;
