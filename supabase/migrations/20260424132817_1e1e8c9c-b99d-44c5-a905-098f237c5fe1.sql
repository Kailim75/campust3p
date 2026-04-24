-- 1. Configuration table
CREATE TABLE public.relance_paiement_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id uuid NOT NULL UNIQUE REFERENCES public.centres(id) ON DELETE CASCADE,
  actif boolean NOT NULL DEFAULT true,
  intervalle_jours integer NOT NULL DEFAULT 7 CHECK (intervalle_jours BETWEEN 1 AND 90),
  nb_relances_max integer NOT NULL DEFAULT 3 CHECK (nb_relances_max BETWEEN 1 AND 10),
  template_email_id uuid REFERENCES public.email_templates(id) ON DELETE SET NULL,
  delai_premiere_relance_jours integer NOT NULL DEFAULT 0 CHECK (delai_premiere_relance_jours BETWEEN 0 AND 30),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.relance_paiement_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins/staff can view config of their centre"
ON public.relance_paiement_config FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.user_centres uc
          JOIN public.user_roles ur ON ur.user_id = uc.user_id
          WHERE uc.user_id = auth.uid()
            AND uc.centre_id = relance_paiement_config.centre_id
            AND ur.role::text IN ('admin','staff'))
);

CREATE POLICY "Admins can manage config of their centre"
ON public.relance_paiement_config FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.user_centres uc
          JOIN public.user_roles ur ON ur.user_id = uc.user_id
          WHERE uc.user_id = auth.uid()
            AND uc.centre_id = relance_paiement_config.centre_id
            AND ur.role::text = 'admin')
);

CREATE TRIGGER trg_relance_paiement_config_updated_at
BEFORE UPDATE ON public.relance_paiement_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Queue table
CREATE TABLE public.relance_paiement_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facture_id uuid NOT NULL REFERENCES public.factures(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  centre_id uuid NOT NULL REFERENCES public.centres(id) ON DELETE CASCADE,
  numero_relance integer NOT NULL DEFAULT 1,
  scheduled_at timestamptz NOT NULL,
  sent_at timestamptz,
  statut text NOT NULL DEFAULT 'pending' CHECK (statut IN ('pending','sent','cancelled','failed')),
  error_message text,
  email_destinataire text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_relance_queue_pending ON public.relance_paiement_queue(scheduled_at, statut) WHERE statut = 'pending';
CREATE INDEX idx_relance_queue_facture ON public.relance_paiement_queue(facture_id);

ALTER TABLE public.relance_paiement_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins/staff can view queue of their centre"
ON public.relance_paiement_queue FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.user_centres uc
          JOIN public.user_roles ur ON ur.user_id = uc.user_id
          WHERE uc.user_id = auth.uid()
            AND uc.centre_id = relance_paiement_queue.centre_id
            AND ur.role::text IN ('admin','staff'))
);

CREATE POLICY "Admins can manage queue of their centre"
ON public.relance_paiement_queue FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.user_centres uc
          JOIN public.user_roles ur ON ur.user_id = uc.user_id
          WHERE uc.user_id = auth.uid()
            AND uc.centre_id = relance_paiement_queue.centre_id
            AND ur.role::text = 'admin')
);

CREATE TRIGGER trg_relance_paiement_queue_updated_at
BEFORE UPDATE ON public.relance_paiement_queue
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Update regression trigger to also schedule relances
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
  v_contact_email text;
  v_message text;
  v_admin_user record;
  v_config record;
  v_first_send timestamptz;
BEGIN
  IF TG_OP <> 'UPDATE' OR OLD.statut IS NOT DISTINCT FROM NEW.statut THEN
    RETURN NEW;
  END IF;

  -- If facture goes back to payee → cancel pending relances
  IF NEW.statut::text = 'payee' AND OLD.statut::text IN ('partiel','impayee','envoyee') THEN
    UPDATE public.relance_paiement_queue
       SET statut = 'cancelled', updated_at = now()
     WHERE facture_id = NEW.id AND statut = 'pending';
    RETURN NEW;
  END IF;

  -- Detect regression
  IF OLD.statut::text = 'payee' AND NEW.statut::text IN ('partiel','impayee','envoyee') THEN
    v_is_regression := true;
  ELSIF OLD.statut::text = 'partiel' AND NEW.statut::text IN ('impayee','envoyee') THEN
    v_is_regression := true;
  END IF;

  IF NOT v_is_regression THEN
    RETURN NEW;
  END IF;

  SELECT nom, prenom, email INTO v_contact_nom, v_contact_prenom, v_contact_email
  FROM public.contacts WHERE id = NEW.contact_id;

  v_message := format(
    '⚠️ Régression de paiement sur facture %s (%s → %s) — %s %s, %s€',
    NEW.numero_facture, OLD.statut::text, NEW.statut::text,
    COALESCE(v_contact_prenom,''), COALESCE(v_contact_nom,''), NEW.montant_total
  );

  -- 1. Reminder in contact_historique
  INSERT INTO public.contact_historique (
    contact_id, type, titre, contenu,
    alerte_active, date_rappel, rappel_description
  ) VALUES (
    NEW.contact_id, 'rappel',
    format('Relance paiement — Facture %s', NEW.numero_facture),
    v_message, true,
    (CURRENT_DATE + INTERVAL '1 day')::timestamptz,
    format('Relancer le client suite à régression de statut (%s → %s) sur la facture %s.',
           OLD.statut::text, NEW.statut::text, NEW.numero_facture)
  );

  -- 2. Notify admin/staff
  FOR v_admin_user IN
    SELECT DISTINCT uc.user_id
    FROM public.user_centres uc
    JOIN public.user_roles ur ON ur.user_id = uc.user_id
    WHERE uc.centre_id = NEW.centre_id
      AND ur.role::text IN ('admin','staff')
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
    VALUES (
      v_admin_user.user_id, 'payment_regression',
      '⚠️ Régression de paiement', v_message, '/factures',
      jsonb_build_object(
        'facture_id', NEW.id, 'numero_facture', NEW.numero_facture,
        'contact_id', NEW.contact_id, 'old_statut', OLD.statut::text,
        'new_statut', NEW.statut::text, 'montant', NEW.montant_total
      )
    );
  END LOOP;

  -- 3. Schedule first automatic relance (if config active and email exists)
  SELECT * INTO v_config FROM public.relance_paiement_config
   WHERE centre_id = NEW.centre_id AND actif = true;

  IF v_config.id IS NOT NULL AND v_contact_email IS NOT NULL AND v_contact_email <> '' THEN
    -- Cancel any existing pending relances for this facture (avoid duplicates)
    UPDATE public.relance_paiement_queue
       SET statut = 'cancelled', updated_at = now()
     WHERE facture_id = NEW.id AND statut = 'pending';

    v_first_send := now() + (v_config.delai_premiere_relance_jours || ' days')::interval;

    INSERT INTO public.relance_paiement_queue (
      facture_id, contact_id, centre_id, numero_relance,
      scheduled_at, email_destinataire, metadata
    ) VALUES (
      NEW.id, NEW.contact_id, NEW.centre_id, 1,
      v_first_send, v_contact_email,
      jsonb_build_object(
        'old_statut', OLD.statut::text,
        'new_statut', NEW.statut::text,
        'numero_facture', NEW.numero_facture,
        'montant', NEW.montant_total
      )
    );
  END IF;

  RETURN NEW;
END;
$$;