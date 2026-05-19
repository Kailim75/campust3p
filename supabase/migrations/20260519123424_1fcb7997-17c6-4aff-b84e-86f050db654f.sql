
-- Sprint 5: Automatic snapshot of buyer/seller data on invoice emission
-- Triggered when statut transitions to 'emise' from 'brouillon'

CREATE OR REPLACE FUNCTION public.snapshot_facture_on_emission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contact RECORD;
  v_partner RECORD;
  v_centre RECORD;
  v_ht NUMERIC := 0;
  v_tva NUMERIC := 0;
  v_compliance JSONB;
BEGIN
  -- Only act when transitioning to 'emise'
  IF NEW.statut = 'emise' AND (OLD.statut IS DISTINCT FROM 'emise') THEN

    -- 1) Buyer snapshot (priority: client_partner_id, fallback: contact_id)
    IF NEW.client_partner_id IS NOT NULL THEN
      SELECT raison_sociale, siret, adresse, code_postal, ville,
             email_facturation, type_client, tva_intracom
      INTO v_partner
      FROM public.partners WHERE id = NEW.client_partner_id;

      IF FOUND THEN
        NEW.buyer_type := COALESCE(NEW.buyer_type, v_partner.type_client, 'b2b');
        NEW.buyer_name_snapshot := COALESCE(NEW.buyer_name_snapshot, v_partner.raison_sociale);
        NEW.buyer_siret := COALESCE(NEW.buyer_siret, v_partner.siret);
        NEW.buyer_siren := COALESCE(NEW.buyer_siren, LEFT(REGEXP_REPLACE(v_partner.siret, '\s', '', 'g'), 9));
        NEW.buyer_address_snapshot := COALESCE(
          NEW.buyer_address_snapshot,
          jsonb_build_object(
            'adresse', v_partner.adresse,
            'code_postal', v_partner.code_postal,
            'ville', v_partner.ville,
            'pays', 'France'
          )
        );
        NEW.buyer_email_facturation := COALESCE(NEW.buyer_email_facturation, v_partner.email_facturation);
        NEW.buyer_tva_intracom := COALESCE(NEW.buyer_tva_intracom, v_partner.tva_intracom);
      END IF;
    ELSIF NEW.contact_id IS NOT NULL THEN
      SELECT nom, prenom, email, adresse, code_postal, ville
      INTO v_contact
      FROM public.contacts WHERE id = NEW.contact_id;

      IF FOUND THEN
        NEW.buyer_type := COALESCE(NEW.buyer_type, 'b2c');
        NEW.buyer_name_snapshot := COALESCE(
          NEW.buyer_name_snapshot,
          TRIM(CONCAT(v_contact.prenom, ' ', v_contact.nom))
        );
        NEW.buyer_address_snapshot := COALESCE(
          NEW.buyer_address_snapshot,
          jsonb_build_object(
            'adresse', v_contact.adresse,
            'code_postal', v_contact.code_postal,
            'ville', v_contact.ville,
            'pays', 'France'
          )
        );
        NEW.buyer_email_facturation := COALESCE(NEW.buyer_email_facturation, v_contact.email);
      END IF;
    END IF;

    NEW.buyer_country := COALESCE(NEW.buyer_country, 'FR');

    -- 2) Aggregate HT/TVA from lines (if not set)
    SELECT COALESCE(SUM(montant_ht), 0), COALESCE(SUM(montant_tva), 0)
    INTO v_ht, v_tva
    FROM public.facture_lignes
    WHERE facture_id = NEW.id;

    IF NEW.montant_ht IS NULL OR NEW.montant_ht = 0 THEN
      NEW.montant_ht := v_ht;
    END IF;
    IF NEW.montant_tva IS NULL THEN
      NEW.montant_tva := v_tva;
    END IF;

    -- 3) Default VAT regime (training centers usually exempt art. 261-4-4°a CGI)
    NEW.regime_tva := COALESCE(NEW.regime_tva, 'exonere_261_4_4_a');
    IF NEW.regime_tva LIKE 'exonere%' AND NEW.motif_exoneration_tva IS NULL THEN
      NEW.motif_exoneration_tva := 'Exonération de TVA – art. 261-4-4°a du CGI (formation professionnelle continue)';
    END IF;

    -- 4) Default e-invoice status
    NEW.e_invoice_status := COALESCE(NEW.e_invoice_status, 'not_required');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_snapshot_facture_on_emission ON public.factures;
CREATE TRIGGER trg_snapshot_facture_on_emission
  BEFORE UPDATE ON public.factures
  FOR EACH ROW
  EXECUTE FUNCTION public.snapshot_facture_on_emission();

-- Post-emission: recompute compliance and persist on the row
CREATE OR REPLACE FUNCTION public.persist_facture_compliance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_compliance JSONB;
BEGIN
  IF NEW.statut = 'emise' AND (OLD.statut IS DISTINCT FROM 'emise') THEN
    BEGIN
      v_compliance := public.compute_invoice_compliance(NEW.id);
      UPDATE public.factures
      SET compliance_score = (v_compliance->>'score')::int,
          compliance_issues = v_compliance->'issues'
      WHERE id = NEW.id;
    EXCEPTION WHEN OTHERS THEN
      -- silent: do not block emission
      NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_persist_facture_compliance ON public.factures;
CREATE TRIGGER trg_persist_facture_compliance
  AFTER UPDATE ON public.factures
  FOR EACH ROW
  EXECUTE FUNCTION public.persist_facture_compliance();
