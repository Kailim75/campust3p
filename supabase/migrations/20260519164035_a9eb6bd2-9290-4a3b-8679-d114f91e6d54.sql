CREATE OR REPLACE FUNCTION public.snapshot_facture_on_emission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_centre_vat_regime TEXT;
  v_partner RECORD;
  v_contact RECORD;
  v_totals RECORD;
BEGIN
  IF NEW.statut = 'emise' AND (OLD.statut IS DISTINCT FROM 'emise') THEN
    SELECT COALESCE(einv_default_vat_regime, 'exonere_261_4_4_a')
      INTO v_centre_vat_regime
      FROM public.centre_formation
      WHERE id = NEW.centre_id;

    IF NEW.regime_tva IS NULL THEN
      NEW.regime_tva := COALESCE(v_centre_vat_regime, 'exonere_261_4_4_a');
    END IF;

    IF NEW.motif_exoneration_tva IS NULL THEN
      NEW.motif_exoneration_tva := 'TVA non applicable, art. 261-4-4°a du CGI';
    END IF;

    -- Snapshot acheteur (B2B partner sinon B2C contact)
    IF NEW.client_partner_id IS NOT NULL THEN
      SELECT * INTO v_partner FROM public.partners WHERE id = NEW.client_partner_id;
      IF FOUND THEN
        NEW.buyer_type := COALESCE(NEW.buyer_type, 'b2b');
        NEW.buyer_name_snapshot := COALESCE(NEW.buyer_name_snapshot, v_partner.company_name);
        NEW.buyer_siret := COALESCE(NEW.buyer_siret, v_partner.siret);
        NEW.buyer_tva_intracom := COALESCE(NEW.buyer_tva_intracom, v_partner.tva_intracom);
        NEW.buyer_email_facturation := COALESCE(NEW.buyer_email_facturation, COALESCE(v_partner.email_facturation, v_partner.email));
        NEW.buyer_country := COALESCE(NEW.buyer_country, 'FR');
        IF NEW.buyer_address_snapshot IS NULL THEN
          NEW.buyer_address_snapshot := jsonb_build_object(
            'line1', v_partner.address,
            'postal_code', v_partner.code_postal,
            'city', v_partner.ville,
            'country', 'FR'
          );
        END IF;
      END IF;
    ELSIF NEW.contact_id IS NOT NULL THEN
      SELECT * INTO v_contact FROM public.contacts WHERE id = NEW.contact_id;
      IF FOUND THEN
        NEW.buyer_type := COALESCE(NEW.buyer_type, 'b2c');
        NEW.buyer_name_snapshot := COALESCE(
          NEW.buyer_name_snapshot,
          TRIM(CONCAT_WS(' ', v_contact.prenom, v_contact.nom))
        );
        NEW.buyer_email_facturation := COALESCE(NEW.buyer_email_facturation, v_contact.email);
        NEW.buyer_country := COALESCE(NEW.buyer_country, 'FR');
        IF NEW.buyer_address_snapshot IS NULL THEN
          NEW.buyer_address_snapshot := jsonb_build_object(
            'line1', v_contact.rue,
            'postal_code', v_contact.code_postal,
            'city', v_contact.ville,
            'country', 'FR'
          );
        END IF;
      END IF;
    END IF;

    -- Agrégats HT/TVA depuis les lignes
    SELECT
      COALESCE(SUM(montant_ht), 0) AS total_ht,
      COALESCE(SUM(montant_tva), 0) AS total_tva,
      COALESCE(SUM(montant_ttc), 0) AS total_ttc
    INTO v_totals
    FROM public.facture_lignes
    WHERE facture_id = NEW.id;

    NEW.montant_ht := COALESCE(NEW.montant_ht, v_totals.total_ht);
    NEW.montant_tva := COALESCE(NEW.montant_tva, v_totals.total_tva);
    IF NEW.date_emission IS NULL THEN
      NEW.date_emission := CURRENT_DATE;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;