BEGIN;

REVOKE EXECUTE ON FUNCTION public.check_duplicate_contacts(text, text, text, text, uuid) FROM PUBLIC, anon;

REVOKE EXECUTE ON FUNCTION public.check_active_duplicate_email(text, uuid, uuid) FROM PUBLIC, anon;

REVOKE EXECUTE ON FUNCTION public.get_carte_pro_for_formation(uuid, text) FROM PUBLIC, anon;

REVOKE EXECUTE ON FUNCTION public.get_partner_stats(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_partner_stats(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_centre_users(uuid) FROM PUBLIC, anon;

REVOKE EXECUTE ON FUNCTION public.get_trash_items(text, text, integer, integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_trash_items(text, text, integer, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.check_creneau_conflicts(date, time without time zone, time without time zone, uuid, uuid, uuid, uuid) FROM PUBLIC, anon;

REVOKE EXECUTE ON FUNCTION public.create_attestation_certificate(uuid, uuid, text, jsonb) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.create_attestation_certificate(uuid, uuid, text, jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.reconcile_factures_inscriptions() FROM PUBLIC, anon;

REVOKE EXECUTE ON FUNCTION public.get_active_charter() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_active_charter() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_pending_documents() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_pending_documents() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.validate_reservation_token(text) FROM PUBLIC, anon;

COMMIT;