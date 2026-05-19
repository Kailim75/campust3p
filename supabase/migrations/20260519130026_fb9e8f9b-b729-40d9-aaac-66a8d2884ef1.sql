-- Sprint 7: paramètres e-invoicing par centre
ALTER TABLE public.centre_formation
  ADD COLUMN IF NOT EXISTS einv_blocking_threshold INTEGER NOT NULL DEFAULT 70 CHECK (einv_blocking_threshold BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS einv_default_vat_regime TEXT NOT NULL DEFAULT 'exonere_261_4_4_a',
  ADD COLUMN IF NOT EXISTS einv_pdp_choice TEXT NOT NULL DEFAULT 'non_choisie';

COMMENT ON COLUMN public.centre_formation.einv_blocking_threshold IS 'Seuil de score conformité en dessous duquel l''émission groupée est bloquée (0-100).';
COMMENT ON COLUMN public.centre_formation.einv_default_vat_regime IS 'Code du régime TVA appliqué par défaut au snapshot d''émission.';
COMMENT ON COLUMN public.centre_formation.einv_pdp_choice IS 'Identifiant de la PDP choisie (non_choisie, ppf, dpii, ...).';

-- Mettre à jour le trigger snapshot pour lire le régime TVA depuis le centre
CREATE OR REPLACE FUNCTION public.snapshot_facture_on_emission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

    IF NEW.vat_regime IS NULL THEN
      NEW.vat_regime := COALESCE(v_centre_vat_regime, 'exonere_261_4_4_a');
    END IF;

    IF NEW.vat_legal_mention IS NULL THEN
      NEW.vat_legal_mention := 'TVA non applicable, art. 261-4-4°a du CGI';
    END IF;

    -- Snapshot acheteur (B2B partner sinon B2C contact)
    IF NEW.partner_id IS NOT NULL THEN
      SELECT * INTO v_partner FROM public.partners WHERE id = NEW.partner_id;
      IF FOUND THEN
        NEW.buyer_type := COALESCE(NEW.buyer_type, 'b2b');
        NEW.buyer_name_snapshot := COALESCE(NEW.buyer_name_snapshot, v_partner.nom);
        NEW.buyer_siren := COALESCE(NEW.buyer_siren, v_partner.siren);
        NEW.buyer_siret := COALESCE(NEW.buyer_siret, v_partner.siret);
        NEW.buyer_tva_intracom := COALESCE(NEW.buyer_tva_intracom, v_partner.tva_intracom);
        NEW.buyer_email_facturation := COALESCE(NEW.buyer_email_facturation, v_partner.email);
        NEW.buyer_country := COALESCE(NEW.buyer_country, 'FR');
        IF NEW.buyer_address_snapshot IS NULL THEN
          NEW.buyer_address_snapshot := jsonb_build_object(
            'line1', v_partner.adresse,
            'postal_code', v_partner.code_postal,
            'city', v_partner.ville,
            'country', COALESCE(v_partner.pays, 'FR')
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
            'line1', v_contact.adresse,
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

    NEW.total_ht_snapshot := COALESCE(NEW.total_ht_snapshot, v_totals.total_ht);
    NEW.total_tva_snapshot := COALESCE(NEW.total_tva_snapshot, v_totals.total_tva);
    NEW.total_ttc_snapshot := COALESCE(NEW.total_ttc_snapshot, v_totals.total_ttc);
    NEW.emitted_at := COALESCE(NEW.emitted_at, NOW());
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.snapshot_facture_on_emission() FROM PUBLIC, anon, authenticated;