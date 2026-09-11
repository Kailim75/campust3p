-- ════════════════════════════════════════════════════════════════════════════
-- Fermeture de l'accès ANONYME à 12 fonctions SECURITY DEFINER internes.
-- ════════════════════════════════════════════════════════════════════════════
--
-- À FAIRE APPLIQUER PAR L'AGENT LOVABLE (le sync GitHub n'applique pas les
-- migrations ; l'éditeur SQL du panneau Cloud refuse le DDL).
--
-- ── Constat mesuré en production le 11/09/2026 (pg_proc.proacl, lecture seule) ──
-- Ces fonctions sont SECURITY DEFINER (elles contournent la RLS) et renvoient des
-- données. En production, CHACUNE porte trois droits EXECUTE distincts :
--   =X/postgres            → PUBLIC (tout rôle, y compris anon)
--   anon=X/postgres        → anon explicite
--   authenticated=X/postgres → authenticated explicite
-- (l'environnement Supabase pose ces trois grants par défaut sur toute fonction
-- du schéma public). Conséquence : avec la seule clé anon publique du site, sans
-- aucun compte, on obtient par PostgREST /rest/v1/rpc/<fonction> des données
-- personnelles d'apprenants et des données métier, TOUS CENTRES CONFONDUS.
--
-- ── Ce que fait cette migration ──────────────────────────────────────────────
-- Pour chaque fonction fermée : REVOKE EXECUTE ... FROM PUBLIC, anon.
--   • Révoquer anon seul NE FERME RIEN : l'accès subsiste via PUBLIC.
--   • Révoquer PUBLIC ET anon ferme les deux chemins.
--   • authenticated conserve son grant EXPLICITE (mesuré présent sur les 16) :
--     les écrans internes continuent de fonctionner. Les GRANT ... TO authenticated
--     ci-dessous sont donc, en production, des no-op idempotents ; on les garde
--     comme filet (si un environnement n'avait pas le grant explicite, il serait
--     rétabli plutôt que perdu avec PUBLIC).
--   • service_role garde son grant : les edge functions ne sont pas impactées.
-- Idiome REVOKE FROM PUBLIC déjà employé par le dépôt (20260909215451, 20260910150000).
-- Idempotent : REVOKE/GRANT ne lèvent pas d'erreur si l'état est déjà celui visé.
--
-- ── NON TOUCHÉES (flux publics réels, anon requis, prouvés par le routage) ─────
--   get_active_legal_mentions()          → /mentions-legales           (src/App.tsx:161)
--   get_active_document(text)            → /politique-confidentialite  (src/App.tsx:162)
--   validate_enquete_token(text)         → /enquete/:token             (src/App.tsx:152)
--   validate_learner_portal_token(text)  → /apprenants/portail         (src/App.tsx:155)
--
-- ── Vérification (sondes de métadonnées, aucune donnée appelée) ────────────────
-- Voir la fin du fichier : has_function_privilege('anon', …) doit repasser à false
-- sur les 12 fermées et rester true sur les 4 gardées.
--
-- ── Hors périmètre, à traiter dans un second lot ───────────────────────────────
-- anon garde EXECUTE, via le même GRANT PUBLIC par défaut, sur d'AUTRES fonctions
-- definer qui ne renvoient pas de lignes — dont des fonctions d'ÉCRITURE du flux de
-- réservation (reserver_creneau_public, annuler_reservation_public). Elles ne sont
-- pas fermées ici ; elles feront l'objet d'un lot dédié après instruction.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- 1. check_duplicate_contacts — PII apprenant (nom, email, date de naissance, téléphone).
--    Appelée par src/hooks/useDuplicateCheck.ts, useProspectDuplicateCheck.ts (écrans internes).
REVOKE EXECUTE ON FUNCTION public.check_duplicate_contacts(text, text, text, text, uuid) FROM PUBLIC, anon;

-- 2. check_active_duplicate_email — PII (existence + nom/prénom pour un email).
--    Appelée par src/hooks/useActiveDuplicateCheck.ts (écrans internes).
REVOKE EXECUTE ON FUNCTION public.check_active_duplicate_email(text, uuid, uuid) FROM PUBLIC, anon;

-- 3. get_carte_pro_for_formation — numéro de carte professionnelle. AUCUN appelant (front/edge/SQL).
REVOKE EXECUTE ON FUNCTION public.get_carte_pro_for_formation(uuid, text) FROM PUBLIC, anon;

-- 4. get_partner_stats — chiffre d'affaires et commissions d'un partenaire.
--    Appelée par src/hooks/usePartners.ts (/partenaires, interne).
REVOKE EXECUTE ON FUNCTION public.get_partner_stats(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_partner_stats(uuid) TO authenticated;

-- 5. get_centre_users — liste du personnel du centre. Pas d'appelant front actuel.
REVOKE EXECUTE ON FUNCTION public.get_centre_users(uuid) FROM PUBLIC, anon;

-- 6. get_trash_items — contenu de la corbeille (libellés, emails de suppression), tous centres.
--    Appelée par src/hooks/useTrash.ts (/corbeille, interne).
REVOKE EXECUTE ON FUNCTION public.get_trash_items(text, text, integer, integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_trash_items(text, text, integer, integer) TO authenticated;

-- 7. check_creneau_conflicts — conflits de planning. Appelée uniquement par d'autres
--    fonctions definer (exécutées comme leur propriétaire) : aucun grant de rôle requis.
REVOKE EXECUTE ON FUNCTION public.check_creneau_conflicts(date, time without time zone, time without time zone, uuid, uuid, uuid, uuid) FROM PUBLIC, anon;

-- 8. create_attestation_certificate — ÉCRIT (crée une attestation). Exposée à anon = forge possible.
--    Appelée par src/lib/documents/documentUtils.ts (génération de document, interne).
REVOKE EXECUTE ON FUNCTION public.create_attestation_certificate(uuid, uuid, text, jsonb) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.create_attestation_certificate(uuid, uuid, text, jsonb) TO authenticated;

-- 9. reconcile_factures_inscriptions — ÉCRIT (rapprochement facturation).
--    Appelée par src/hooks/useReconcileFactures.ts (interne).
REVOKE EXECUTE ON FUNCTION public.reconcile_factures_inscriptions() FROM PUBLIC, anon;

-- 10. get_active_charter — charte de sécurité interne. Appelée par src/hooks/useSecurityCharter.ts (superadmin).
REVOKE EXECUTE ON FUNCTION public.get_active_charter() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_active_charter() TO authenticated;

-- 11. get_pending_documents — documents légaux à valider. Appelée par src/hooks/useLegalDocuments.ts (interne, post-connexion).
REVOKE EXECUTE ON FUNCTION public.get_pending_documents() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_pending_documents() TO authenticated;

-- 12. validate_reservation_token — flux de réservation non câblé (aucune route ni appelant front).
REVOKE EXECUTE ON FUNCTION public.validate_reservation_token(text) FROM PUBLIC, anon;

COMMIT;

-- ── SONDES DE VÉRIFICATION (à passer dans l'éditeur SQL après application) ──────
-- A. Les 12 fermées : anon_execute doit être false partout.
-- SELECT p.oid::regprocedure AS fonction,
--        has_function_privilege('anon', p.oid, 'EXECUTE')          AS anon_execute,
--        has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute
-- FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public' AND p.oid::regprocedure::text IN (
--   'check_duplicate_contacts(text,text,text,text,uuid)',
--   'check_active_duplicate_email(text,uuid,uuid)',
--   'get_carte_pro_for_formation(uuid,text)',
--   'get_partner_stats(uuid)',
--   'get_centre_users(uuid)',
--   'get_trash_items(text,text,integer,integer)',
--   'check_creneau_conflicts(date,time without time zone,time without time zone,uuid,uuid,uuid,uuid)',
--   'create_attestation_certificate(uuid,uuid,text,jsonb)',
--   'reconcile_factures_inscriptions()',
--   'get_active_charter()',
--   'get_pending_documents()',
--   'validate_reservation_token(text)')
-- ORDER BY 1;
--
-- B. Les 4 gardées : anon_execute doit rester true.
-- SELECT p.oid::regprocedure AS fonction, has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute
-- FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public' AND p.oid::regprocedure::text IN (
--   'get_active_legal_mentions()', 'get_active_document(text)',
--   'validate_enquete_token(text)', 'validate_learner_portal_token(text)')
-- ORDER BY 1;
