-- ════════════════════════════════════════════════════════════════════════════
-- Fermeture de l'accès ANONYME aux 3 fonctions d'ÉCRITURE du flux de réservation.
-- ════════════════════════════════════════════════════════════════════════════
--
-- À FAIRE APPLIQUER PAR L'AGENT LOVABLE (le sync GitHub n'applique pas les
-- migrations ; l'éditeur SQL du panneau Cloud refuse le DDL/DCL).
-- REVOKE = idempotent : réappliquer est sans risque.
--
-- Second (et dernier) lot annoncé par la migration
-- 20260911190000_revoquer_anon_rpc_internes.sql (section « Hors périmètre, à
-- traiter dans un second lot »).
--
-- ── Constat ──────────────────────────────────────────────────────────────────
-- reserver_creneau_public(text, uuid), annuler_reservation_public(text, uuid, text)
-- et use_reservation_token(text) sont SECURITY DEFINER (elles contournent la RLS)
-- et ÉCRIVENT :
--   • reserver_creneau_public : INSERT reservations_conduite + UPDATE creneaux_conduite ;
--   • annuler_reservation_public : UPDATE reservations_conduite + UPDATE creneaux_conduite ;
--   • use_reservation_token : UPDATE tokens_reservation (compteur d'usage du jeton).
-- Comme toute fonction du schéma public, elles portent le GRANT EXECUTE par défaut
-- à PUBLIC (donc à anon) : avec la seule clé anon publique du site, sans aucun
-- compte, on peut les appeler via /rest/v1/rpc/<fonction>. La SEULE barrière est le
-- paramètre p_token (validé contre tokens_reservation : actif + non expiré) — un
-- jeton devinable, énuméré (aucune limite de débit) ou fuité permettrait de forger
-- ou d'annuler des réservations.
--
-- ── Ce flux n'est PAS câblé (mesuré le 12/09/2026, lecture seule) ─────────────
--   • Aucun appelant : ni front (src/, seulement les types générés), ni edge
--     function, ni autre fonction/migration SQL.
--   • Le jumeau de LECTURE validate_reservation_token(text) a déjà été révoqué
--     pour anon (20260911190000 : « flux de réservation non câblé ») ; en revanche
--     use_reservation_token (écriture du compteur) avait été oubliée du premier lot.
--   • La policy de lecture « Anon view available creneaux » a été supprimée dès
--     20260710104031. Il ne reste donc QUE ces trois grants d'ÉCRITURE, résiduels.
-- Fermer l'accès anonyme ne casse donc aucune fonctionnalité vivante. Si la
-- réservation publique est un jour réellement construite, les droits seront
-- rétablis AVEC un durcissement du jeton (entropie suffisante, limite de débit).
--
-- ── Ce que fait cette migration ──────────────────────────────────────────────
-- REVOKE EXECUTE ... FROM PUBLIC, anon sur les trois fonctions.
--   • Révoquer anon SEUL ne ferme rien (accès résiduel via PUBLIC) : on révoque
--     PUBLIC ET anon, exactement comme pour les 12 fonctions du premier lot.
--   • Le périmètre est l'accès ANONYME (PUBLIC + anon). authenticated et
--     service_role ne sont pas ciblés ; s'ils portent un grant explicite il est
--     conservé — la sonde ci-dessous montre l'état réel après application.
-- Idiome REVOKE FROM PUBLIC déjà employé par le dépôt (20260909215451,
-- 20260910150000, 20260911190000).
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- Réservation d'un créneau — INSERT reservations_conduite + UPDATE creneaux_conduite.
REVOKE EXECUTE ON FUNCTION public.reserver_creneau_public(text, uuid) FROM PUBLIC, anon;

-- Annulation d'une réservation — UPDATE reservations_conduite + creneaux_conduite.
REVOKE EXECUTE ON FUNCTION public.annuler_reservation_public(text, uuid, text) FROM PUBLIC, anon;

-- Incrément du compteur d'usage d'un jeton — UPDATE tokens_reservation.
REVOKE EXECUTE ON FUNCTION public.use_reservation_token(text) FROM PUBLIC, anon;

COMMIT;

-- ── SONDE DE VÉRIFICATION (à passer dans l'éditeur SQL après application) ───────
-- anon_execute doit repasser à false sur les trois ; authenticated inchangé.
-- SELECT p.oid::regprocedure AS fonction,
--        has_function_privilege('anon', p.oid, 'EXECUTE')          AS anon_execute,
--        has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute
-- FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public' AND p.oid::regprocedure::text IN (
--   'reserver_creneau_public(text,uuid)',
--   'annuler_reservation_public(text,uuid,text)',
--   'use_reservation_token(text)')
-- ORDER BY 1;