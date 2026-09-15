-- ════════════════════════════════════════════════════════════════════
-- Supervision minimale — volet B : notification interne sur échec
-- ════════════════════════════════════════════════════════════════════
-- Contexte : voir 20260915150000_cron_heartbeats.sql. Ce lot ajoute une
-- notification interne (cloche, table `notifications` existante) quand :
--   1) un workflow_executions passe à 'failed' ;
--   2) un email_logs est écrit avec status = 'failed' (valeur confirmée
--      par la contrainte CHECK de la table — migration
--      20260114114222 : email_logs.status IN ('sent','failed','bounced',
--      'delivered') — et par 7 des 8 fonctions cron qui l'écrivent ;
--      `send-daily-report` écrit à tort 'error' dans son propre code, une
--      dette préexistante hors périmètre de ce lot, non corrigée ici).
--
-- `notifications.user_id` est NOT NULL (une notification par destinataire) :
-- on reprend le motif déjà en place dans
-- `handle_facture_payment_regression` (migration 20260424132817) —
-- fan-out vers tous les admin/staff. `workflow_executions` et `email_logs`
-- n'ont pas de `centre_id` : le fan-out est donc global (tous les
-- admin/staff, tous centres), pas filtré par centre comme la régression
-- de paiement.
--
-- Deux triggers séparés (INSERT / UPDATE) plutôt qu'un seul combiné :
-- un trigger déclenché sur INSERT ne peut pas référencer OLD dans sa
-- clause WHEN (OLD n'existe pas encore) — deux triggers évite l'ambiguïté
-- plutôt que de déplacer ce test dans le corps de la fonction.

-- ── 1) workflow_executions → 'failed' ───────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_workflow_execution_failed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workflow_nom text;
  v_message text;
  v_user record;
BEGIN
  SELECT nom INTO v_workflow_nom FROM public.workflows WHERE id = NEW.workflow_id;

  v_message := format(
    '⚠️ Le workflow « %s » a échoué%s',
    COALESCE(v_workflow_nom, NEW.workflow_id::text),
    CASE WHEN NEW.error_message IS NOT NULL THEN ' — ' || left(NEW.error_message, 300) ELSE '' END
  );

  FOR v_user IN
    SELECT DISTINCT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role::text IN ('admin', 'staff')
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
    VALUES (
      v_user.user_id,
      'systeme',
      '⚠️ Échec de workflow',
      v_message,
      '/automations',
      jsonb_build_object(
        'workflow_execution_id', NEW.id,
        'workflow_id', NEW.workflow_id,
        'error_message', NEW.error_message
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_workflow_execution_failed
AFTER UPDATE ON public.workflow_executions
FOR EACH ROW
WHEN (NEW.status = 'failed' AND OLD.status IS DISTINCT FROM 'failed')
EXECUTE FUNCTION public.notify_workflow_execution_failed();

-- ── 2) email_logs → 'failed' (INSERT direct en échec, ou UPDATE vers) ──
CREATE OR REPLACE FUNCTION public.notify_email_log_failed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message text;
  v_user record;
BEGIN
  v_message := format(
    '✉️ Échec d''envoi email (%s) à %s%s',
    NEW.type,
    NEW.recipient_email,
    CASE WHEN NEW.error_message IS NOT NULL THEN ' — ' || left(NEW.error_message, 300) ELSE '' END
  );

  FOR v_user IN
    SELECT DISTINCT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role::text IN ('admin', 'staff')
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
    VALUES (
      v_user.user_id,
      'systeme',
      '✉️ Échec d''envoi email',
      v_message,
      '/automations',
      jsonb_build_object(
        'email_log_id', NEW.id,
        'email_type', NEW.type,
        'recipient_email', NEW.recipient_email,
        'error_message', NEW.error_message
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_email_logs_failed_insert
AFTER INSERT ON public.email_logs
FOR EACH ROW
WHEN (NEW.status = 'failed')
EXECUTE FUNCTION public.notify_email_log_failed();

CREATE TRIGGER trg_notify_email_logs_failed_update
AFTER UPDATE ON public.email_logs
FOR EACH ROW
WHEN (NEW.status = 'failed' AND OLD.status IS DISTINCT FROM 'failed')
EXECUTE FUNCTION public.notify_email_log_failed();
