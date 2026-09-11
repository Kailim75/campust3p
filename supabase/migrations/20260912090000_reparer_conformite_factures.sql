-- ════════════════════════════════════════════════════════════════════════════
-- Migration 1 — Réparer public.compute_invoice_compliance
-- ════════════════════════════════════════════════════════════════════════════
--
-- ATTENTION : à appliquer par l'agent Lovable uniquement (le sync GitHub
-- n'applique pas les migrations ; l'éditeur SQL du panneau Cloud refuse le DDL).
-- Idempotente : CREATE OR REPLACE + REVOKE/GRANT, rejouable sans effet de bord.
-- Cette migration n'écrit AUCUNE donnée.
--
-- SÉQUENCE PRÉVUE : volet front publié, puis 20260912090100 (garde), puis
-- celle-ci. L'ordre inverse fonctionne aussi (vérifié au banc) : les deux sont
-- indépendantes ; mais réparer le score AVANT la garde rouvrirait l'émission
-- groupée sur des factures dont les coordonnées acheteur ne sont pas encore
-- figées.
--
-- ── Pourquoi ────────────────────────────────────────────────────────────────
-- La définition en place (20260519121856, ligne 26) lit
--     SELECT * INTO c FROM public.centre_formation WHERE centre_id = f.centre_id
-- or centre_formation n'a PAS de colonne centre_id (mesuré en production le
-- 11/09/2026 dans information_schema : aucune ligne). La fonction échoue donc à
-- CHAQUE appel depuis sa création :
--   • persist_facture_compliance (AFTER UPDATE, passage à « emise ») avale
--     l'erreur (EXCEPTION WHEN OTHERS THEN NULL) : compliance_score n'a jamais
--     été écrit ;
--   • useInvoiceCompliance (badge, tiroir de conformité) reçoit une erreur ;
--   • useInvoiceComplianceBatch renvoie score 0 : BulkEmitConfirmDialog bloque
--     TOUTE émission groupée (0 < seuil 70) ;
--   • submit-pdp retombe sur compliance_score (NULL → 0) : 422 systématique.
--
-- ── Comment le projet relie un centre à sa fiche centre_formation ──────────
-- Convention en place : centre_formation.id = centres.id = factures.centre_id.
-- Preuves dans le dépôt :
--   • 20260617082735 a renuméroté la fiche unique sur l'id du centre
--     (97e69258-…) ;
--   • la policy auth_read_centre_formation (20260504182940) filtre par
--     has_centre_access(id) ;
--   • snapshot_facture_on_emission (20260519164035) lit
--     centre_formation WHERE id = NEW.centre_id ;
--   • useEInvoicingSettings lit centre_formation .eq("id", centreId).
-- Le front « documents » lit encore centre_formation LIMIT 1 (dette mono-centre
-- de CLAUDE.md) : ce n'est PAS repris ici, parce qu'une lecture LIMIT 1 donnerait
-- à une facture l'identité d'un autre centre dès l'ouverture du second.
--
-- À L'OUVERTURE D'UN SECOND CENTRE : rien à changer dans cette fonction, à
-- condition que sa fiche centre_formation soit créée avec id = centres.id (la
-- policy centre_formation_admin_insert l'impose déjà via has_centre_access(id)).
-- En revanche les lectures LIMIT 1 du front et de send-automated-emails devront
-- passer à « WHERE id = centre_id » (liste de CLAUDE.md, « chemins encore
-- mono-centre »). Si la fiche est introuvable, la fonction le dit (règle
-- SELLER_PROFILE ci-dessous) au lieu d'emprunter une autre identité.
--
-- ── Règles modifiées (et elles seules) ──────────────────────────────────────
--  1. Lecture du centre : WHERE id = f.centre_id (au lieu de centre_id, absente).
--  2. SELLER_DA (N° de déclaration d'activité, 2 points) : SUPPRIMÉE.
--     Décision du directeur du 10/09/2026 : le centre n'a PAS de NDA et la
--     mention ne doit pas apparaître. Garder la règle, même à 0 point, afficherait
--     « NDA manquant » dans le tiroir de conformité et pousserait à le saisir.
--     Le maximum passe de 100 à 98 points ; le score reste normalisé sur 100.
--  3. BUYER_SIRET : un acheteur « b2c » est un particulier. Le déclencheur de
--     snapshot écrit buyer_type = 'b2c' (jamais 'particulier'), et
--     BuyerSnapshotEditDialog propose b2c / b2b / public : l'ancienne règle
--     retirait 10 points à TOUTE facture de particulier. 'particulier' reste
--     accepté pour les données plus anciennes.
--  4. SIRET / SIREN : les espaces sont ignorés avant de compter les chiffres
--     (un SIRET saisi « 123 456 789 00012 » faisait 17 caractères).
--  5. SELLER_PROFILE (règle BLOQUANTE, révision 2 du 12/09/2026) : une fiche
--     centre introuvable OU illisible pour l'appelant (RLS, droits retirés)
--     ramène le score à 0, et la liste des défauts reste complète. Sans cela,
--     une facture dont le vendeur est inconnu pouvait dépasser le seuil (85/100
--     mesuré sur le banc de la v1) et partir en émission groupée ou en
--     transmission : « aucune identité inventée » (CLAUDE.md) vaut aussi pour
--     l'absence d'identité. Le score 0 se lit dans le tiroir de conformité avec
--     le motif « Fiche du centre introuvable ou illisible ».
-- Les autres règles, poids, libellés, sévérités et la forme du résultat
-- ({score, issues, max, got}) sont inchangés.
--
-- ── Sécurité ────────────────────────────────────────────────────────────────
-- SECURITY INVOKER conservé : appelée depuis le navigateur ou submit-pdp (JWT
-- utilisateur), elle ne voit que les factures et la fiche centre permises par
-- la RLS ; une facture d'un autre centre répond NOT_FOUND. Appelée par
-- persist_facture_compliance (SECURITY DEFINER), elle s'exécute avec les droits
-- du propriétaire. EXECUTE est retiré à PUBLIC/anon (anon n'en a aucun usage).
--
-- ── Effets de la réparation (à connaître AVANT d'appliquer) ────────────────
--  • Le score redevient calculé partout (badge, tiroir, dialogue d'émission
--    groupée, submit-pdp).
--  • persist_facture_compliance écrira compliance_score/compliance_issues à
--    chaque passage à « emise » : c'est un second UPDATE sur la facture, donc
--    une seconde ligne audit_logs par émission. Aucun rattrapage des factures
--    déjà émises n'est fait ici (cela réécrirait updated_at de ~480 factures).
--  • BulkEmitConfirmDialog cesse de bloquer « à 0 » : il affiche le vrai score.
--    Un brouillon reste souvent sous 70, parce que les snapshots acheteur,
--    montant_ht et le motif d'exonération ne sont posés qu'À l'émission ; les
--    motifs sont désormais listés au lieu d'un 0 muet.
--  • submit-pdp peut redevenir passant (score >= seuil) : la « transmission »
--    est SIMULÉE (référence LOCAL-…) mais écrit e_invoice_status = 'envoye'.
--    Le bouton du panneau exige einv_pdp_choice <> 'non_choisie' — un réglage
--    que le directeur change lui-même en deux clics (Réglages › E-invoicing).
--    Ce chemin est donc ATTEIGNABLE, pas théorique : vérifier le réglage
--    (sonde S2) et neutraliser la simulation avant d'appliquer.
--    La garde de M2 tient compte de cette simulation : tant que la référence
--    est une marque 'LOCAL-…', l'accusé et le Factur-X restent CORRIGEABLES
--    (R6). Une facture faussement « transmise » n'est donc jamais gravée.
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.compute_invoice_compliance(p_facture_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
  f public.factures%ROWTYPE;
  -- %ROWTYPE (et non RECORD) : si la fiche est introuvable, les champs valent
  -- NULL au lieu de lever « record is not assigned yet ».
  c public.centre_formation%ROWTYPE;
  v_centre_trouve boolean;
  v_lignes_count integer;
  v_siret_vendeur text;
  v_siret_acheteur text;
  v_siren_acheteur text;
  v_issues jsonb := '[]'::jsonb;
  v_max integer := 0;
  v_got integer := 0;
  checks jsonb;
  chk jsonb;
BEGIN
  SELECT * INTO f FROM public.factures WHERE id = p_facture_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('score', 0, 'issues', jsonb_build_array(
      jsonb_build_object('code', 'NOT_FOUND', 'label', 'Facture introuvable', 'severity', 'bloquant')
    ));
  END IF;

  -- Convention du projet : la fiche du centre porte l'id du centre.
  -- (Un second centre : rien à changer ici, voir l'en-tête.)
  -- « Illisible » comprend le cas où l'appelant n'a pas le droit de lire la
  -- table (droits retirés) : on le traite comme une fiche absente, sans casser
  -- l'appel.
  BEGIN
    SELECT * INTO c FROM public.centre_formation WHERE id = f.centre_id;
    v_centre_trouve := FOUND;
  EXCEPTION WHEN insufficient_privilege THEN
    v_centre_trouve := false;
  END;

  SELECT COUNT(*) INTO v_lignes_count FROM public.facture_lignes WHERE facture_id = p_facture_id;

  v_siret_vendeur  := regexp_replace(COALESCE(c.siret, ''), '\s', '', 'g');
  v_siret_acheteur := regexp_replace(COALESCE(f.buyer_siret, ''), '\s', '', 'g');
  v_siren_acheteur := regexp_replace(COALESCE(f.buyer_siren, ''), '\s', '', 'g');

  checks := jsonb_build_array(
    -- vendeur
    jsonb_build_object('ok', v_centre_trouve, 'w', 0, 'code', 'SELLER_PROFILE', 'label', 'Fiche du centre introuvable ou illisible pour cette facture (Réglages › Centre) : conformité ramenée à 0', 'severity', 'bloquant'),
    jsonb_build_object('ok', length(v_siret_vendeur) = 14, 'w', 10, 'code', 'SELLER_SIRET', 'label', 'SIRET du centre manquant ou invalide', 'severity', 'bloquant'),
    jsonb_build_object('ok', c.regime_tva IS NOT NULL, 'w', 5, 'code', 'SELLER_REGIME_TVA', 'label', 'Régime TVA du centre non défini', 'severity', 'bloquant'),
    jsonb_build_object('ok', c.regime_tva IS DISTINCT FROM 'exonere_261_4_4_a' OR c.mention_exoneration_default IS NOT NULL, 'w', 3, 'code', 'SELLER_MENTION_EXO', 'label', 'Mention d''exonération TVA non renseignée', 'severity', 'avertissement'),
    -- SELLER_DA supprimée (décision du directeur du 10/09/2026 : pas de NDA).
    -- acheteur
    jsonb_build_object('ok', f.buyer_name_snapshot IS NOT NULL, 'w', 10, 'code', 'BUYER_NAME', 'label', 'Nom de l''acheteur non figé', 'severity', 'bloquant'),
    jsonb_build_object('ok', f.buyer_type IS NOT NULL, 'w', 5, 'code', 'BUYER_TYPE', 'label', 'Type d''acheteur (particulier/pro) non défini', 'severity', 'bloquant'),
    jsonb_build_object('ok', f.buyer_type IN ('particulier', 'b2c') OR length(v_siret_acheteur) = 14 OR length(v_siren_acheteur) = 9, 'w', 10, 'code', 'BUYER_SIRET', 'label', 'SIRET/SIREN acheteur professionnel manquant', 'severity', 'bloquant'),
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
    jsonb_build_object('ok', f.montant_ht IS NULL OR f.montant_tva IS NULL OR abs(COALESCE(f.montant_ht, 0) + COALESCE(f.montant_tva, 0) - COALESCE(f.montant_total, 0)) < 0.02, 'w', 5, 'code', 'INVOICE_TOTAL_COHERENCE', 'label', 'Incohérence HT + TVA ≠ Total TTC', 'severity', 'bloquant'),
    jsonb_build_object('ok', f.service_period_start IS NOT NULL AND f.service_period_end IS NOT NULL, 'w', 3, 'code', 'INVOICE_PERIOD', 'label', 'Période de prestation manquante', 'severity', 'avertissement'),
    -- lignes
    jsonb_build_object('ok', v_lignes_count > 0, 'w', 4, 'code', 'INVOICE_LINES', 'label', 'Aucune ligne de facturation', 'severity', 'bloquant')
  );

  FOR chk IN SELECT * FROM jsonb_array_elements(checks) LOOP
    v_max := v_max + (chk->>'w')::int;
    -- Un test NULL (donnée absente) compte comme un échec, comme avant.
    IF COALESCE((chk->>'ok')::boolean, false) THEN
      v_got := v_got + (chk->>'w')::int;
    ELSE
      v_issues := v_issues || jsonb_build_object(
        'code', chk->>'code',
        'label', chk->>'label',
        'severity', chk->>'severity'
      );
    END IF;
  END LOOP;

  -- Règle bloquante : vendeur inconnu ⇒ 0, jamais un score au-dessus du seuil.
  IF NOT v_centre_trouve THEN
    RETURN jsonb_build_object('score', 0, 'issues', v_issues, 'max', v_max, 'got', 0);
  END IF;

  RETURN jsonb_build_object(
    'score', CASE WHEN v_max = 0 THEN 0 ELSE round((v_got::numeric / v_max::numeric) * 100)::int END,
    'issues', v_issues,
    'max', v_max,
    'got', v_got
  );
END;
$function$;

COMMENT ON FUNCTION public.compute_invoice_compliance(uuid) IS
  'Score de conformité e-invoicing d''une facture (0-100). Fiche vendeur : centre_formation.id = factures.centre_id ; fiche introuvable ou illisible ⇒ score 0 (règle SELLER_PROFILE bloquante). Règle SELLER_DA retirée le 12/09/2026 (décision du 10/09/2026 : pas de NDA).';

REVOKE EXECUTE ON FUNCTION public.compute_invoice_compliance(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.compute_invoice_compliance(uuid) TO authenticated, service_role;

-- Constat non bloquant : factures dont le centre n'a pas de fiche portant son id.
-- (Visible dans le journal d'application de la migration ; la sonde S1 le
-- mesure aussi en lecture seule.)
DO $$
DECLARE
  v_orphelines integer;
BEGIN
  SELECT count(*) INTO v_orphelines
  FROM public.factures f
  WHERE NOT EXISTS (SELECT 1 FROM public.centre_formation cf WHERE cf.id = f.centre_id);
  IF v_orphelines > 0 THEN
    RAISE WARNING 'compute_invoice_compliance : % facture(s) sans fiche centre_formation portant l''id de leur centre (règle SELLER_PROFILE en échec)', v_orphelines;
  END IF;
END $$;
