
CREATE OR REPLACE FUNCTION public.compute_invoice_compliance(p_facture_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  f RECORD;
  c RECORD;
  v_lignes_count INTEGER;
  v_issues JSONB := '[]'::jsonb;
  v_max INTEGER := 0;
  v_got INTEGER := 0;
  checks JSONB;
  chk JSONB;
BEGIN
  SELECT * INTO f FROM public.factures WHERE id = p_facture_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('score', 0, 'issues', jsonb_build_array(
      jsonb_build_object('code', 'NOT_FOUND', 'label', 'Facture introuvable', 'severity', 'bloquant')
    ));
  END IF;

  SELECT * INTO c FROM public.centre_formation WHERE centre_id = f.centre_id LIMIT 1;
  SELECT COUNT(*) INTO v_lignes_count FROM public.facture_lignes WHERE facture_id = p_facture_id;

  checks := jsonb_build_array(
    -- vendeur
    jsonb_build_object('ok', c.siret IS NOT NULL AND length(c.siret) = 14, 'w', 10, 'code', 'SELLER_SIRET', 'label', 'SIRET du centre manquant ou invalide', 'severity', 'bloquant'),
    jsonb_build_object('ok', c.regime_tva IS NOT NULL, 'w', 5, 'code', 'SELLER_REGIME_TVA', 'label', 'Régime TVA du centre non défini', 'severity', 'bloquant'),
    jsonb_build_object('ok', c.regime_tva IS DISTINCT FROM 'exonere_261_4_4_a' OR c.mention_exoneration_default IS NOT NULL, 'w', 3, 'code', 'SELLER_MENTION_EXO', 'label', 'Mention d''exonération TVA non renseignée', 'severity', 'avertissement'),
    jsonb_build_object('ok', c.numero_da_formation IS NOT NULL, 'w', 2, 'code', 'SELLER_DA', 'label', 'N° de déclaration d''activité manquant', 'severity', 'avertissement'),
    -- acheteur
    jsonb_build_object('ok', f.buyer_name_snapshot IS NOT NULL, 'w', 10, 'code', 'BUYER_NAME', 'label', 'Nom de l''acheteur non figé', 'severity', 'bloquant'),
    jsonb_build_object('ok', f.buyer_type IS NOT NULL, 'w', 5, 'code', 'BUYER_TYPE', 'label', 'Type d''acheteur (particulier/pro) non défini', 'severity', 'bloquant'),
    jsonb_build_object('ok', f.buyer_type = 'particulier' OR (f.buyer_siret IS NOT NULL AND length(f.buyer_siret) = 14) OR (f.buyer_siren IS NOT NULL AND length(f.buyer_siren) = 9), 'w', 10, 'code', 'BUYER_SIRET', 'label', 'SIRET/SIREN acheteur professionnel manquant', 'severity', 'bloquant'),
    jsonb_build_object('ok', f.buyer_address_snapshot IS NOT NULL, 'w', 8, 'code', 'BUYER_ADDRESS', 'label', 'Adresse de facturation non figée', 'severity', 'bloquant'),
    jsonb_build_object('ok', f.buyer_country IS NOT NULL, 'w', 2, 'code', 'BUYER_COUNTRY', 'label', 'Pays acheteur manquant', 'severity', 'avertissement'),
    -- pièce
    jsonb_build_object('ok', f.numero_facture IS NOT NULL, 'w', 5, 'code', 'INVOICE_NUMBER', 'label', 'Numéro de facture manquant', 'severity', 'bloquant'),
    jsonb_build_object('ok', f.date_emission IS NOT NULL, 'w', 5, 'code', 'INVOICE_DATE', 'label', 'Date d''émission manquante', 'severity', 'bloquant'),
    jsonb_build_object('ok', f.devise IS NOT NULL, 'w', 2, 'code', 'INVOICE_CURRENCY', 'label', 'Devise manquante', 'severity', 'avertissement'),
    jsonb_build_object('ok', f.regime_tva IS NOT NULL, 'w', 5, 'code', 'INVOICE_REGIME_TVA', 'label', 'Régime TVA de la facture non défini', 'severity', 'bloquant'),
    jsonb_build_object('ok', f.regime_tva IS DISTINCT FROM 'exonere_261_4_4_a' OR f.motif_exoneration_tva IS NOT NULL, 'w', 3, 'code', 'INVOICE_MOTIF_EXO', 'label', 'Motif d''exonération TVA manquant', 'severity', 'avertissement'),
    jsonb_build_object('ok', f.montant_ht IS NOT NULL, 'w', 8, 'code', 'INVOICE_HT', 'label', 'Montant HT non renseigné', 'severity', 'bloquant'),
    jsonb_build_object('ok', f.montant_tva IS NOT NULL, 'w', 5, 'code', 'INVOICE_TVA', 'label', 'Montant TVA non renseigné', 'severity', 'bloquant'),
    jsonb_build_object('ok', f.montant_ht IS NULL OR f.montant_tva IS NULL OR abs(coalesce(f.montant_ht,0) + coalesce(f.montant_tva,0) - coalesce(f.montant_total,0)) < 0.02, 'w', 5, 'code', 'INVOICE_TOTAL_COHERENCE', 'label', 'Incohérence HT + TVA ≠ Total TTC', 'severity', 'bloquant'),
    jsonb_build_object('ok', f.service_period_start IS NOT NULL AND f.service_period_end IS NOT NULL, 'w', 3, 'code', 'INVOICE_PERIOD', 'label', 'Période de prestation manquante', 'severity', 'avertissement'),
    -- lignes
    jsonb_build_object('ok', v_lignes_count > 0, 'w', 4, 'code', 'INVOICE_LINES', 'label', 'Aucune ligne de facturation', 'severity', 'bloquant')
  );

  FOR chk IN SELECT * FROM jsonb_array_elements(checks) LOOP
    v_max := v_max + (chk->>'w')::int;
    IF (chk->>'ok')::boolean THEN
      v_got := v_got + (chk->>'w')::int;
    ELSE
      v_issues := v_issues || jsonb_build_object(
        'code', chk->>'code',
        'label', chk->>'label',
        'severity', chk->>'severity'
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'score', CASE WHEN v_max = 0 THEN 0 ELSE round((v_got::numeric / v_max::numeric) * 100)::int END,
    'issues', v_issues,
    'max', v_max,
    'got', v_got
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.compute_invoice_compliance(UUID) TO authenticated;
