-- Function: auto-create relance when payment status regresses
CREATE OR REPLACE FUNCTION public.handle_facture_payment_regression()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_regression boolean := false;
  v_contact_nom text;
  v_contact_prenom text;
  v_message text;
  v_admin_user record;
BEGIN
  -- Only act on UPDATE where statut changed
  IF TG_OP <> 'UPDATE' OR OLD.statut IS NOT DISTINCT FROM NEW.statut THEN
    RETURN NEW;
  END IF;

  -- Detect regression: payee → (partiel|impayee|envoyee) OR partiel → (impayee|envoyee)
  IF OLD.statut::text = 'payee' AND NEW.statut::text IN ('partiel', 'impayee', 'envoyee') THEN
    v_is_regression := true;
  ELSIF OLD.statut::text = 'partiel' AND NEW.statut::text IN ('impayee', 'envoyee') THEN
    v_is_regression := true;
  END IF;

  IF NOT v_is_regression THEN
    RETURN NEW;
  END IF;

  -- Get contact name
  SELECT nom, prenom INTO v_contact_nom, v_contact_prenom
  FROM public.contacts WHERE id = NEW.contact_id;

  v_message := format(
    '⚠️ Régression de paiement sur facture %s (%s → %s) — %s %s, %s€',
    NEW.numero_facture,
    OLD.statut::text,
    NEW.statut::text,
    COALESCE(v_contact_prenom, ''),
    COALESCE(v_contact_nom, ''),
    NEW.montant_total
  );

  -- 1. Create active reminder in contact_historique (visible in Suivi tab)
  INSERT INTO public.contact_historique (
    contact_id, type, titre, contenu,
    alerte_active, date_rappel, rappel_description
  ) VALUES (
    NEW.contact_id,
    'rappel',
    format('Relance paiement — Facture %s', NEW.numero_facture),
    v_message,
    true,
    (CURRENT_DATE + INTERVAL '1 day')::timestamptz,
    format('Relancer le client suite à régression de statut (%s → %s) sur la facture %s.',
           OLD.statut::text, NEW.statut::text, NEW.numero_facture)
  );

  -- 2. Notify all admin/staff of the centre
  FOR v_admin_user IN
    SELECT DISTINCT uc.user_id
    FROM public.user_centres uc
    JOIN public.user_roles ur ON ur.user_id = uc.user_id
    WHERE uc.centre_id = NEW.centre_id
      AND ur.role::text IN ('admin', 'staff')
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
    VALUES (
      v_admin_user.user_id,
      'payment_regression',
      '⚠️ Régression de paiement',
      v_message,
      '/factures',
      jsonb_build_object(
        'facture_id', NEW.id,
        'numero_facture', NEW.numero_facture,
        'contact_id', NEW.contact_id,
        'old_statut', OLD.statut::text,
        'new_statut', NEW.statut::text,
        'montant', NEW.montant_total
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Trigger on factures
DROP TRIGGER IF EXISTS trg_facture_payment_regression ON public.factures;
CREATE TRIGGER trg_facture_payment_regression
AFTER UPDATE OF statut ON public.factures
FOR EACH ROW
EXECUTE FUNCTION public.handle_facture_payment_regression();