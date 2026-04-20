-- =====================================================
-- AUDIT FACTURATION V2 (lecture seule)
-- Compare l'etat stocke avec un etat calcule a partir
-- des paiements actifs, sans modifier les donnees.
-- =====================================================

CREATE OR REPLACE FUNCTION public.audit_facturation_v2(
  p_limit INTEGER DEFAULT 50,
  p_only_anomalies BOOLEAN DEFAULT true
)
RETURNS TABLE (
  facture_id UUID,
  numero_facture TEXT,
  contact_id UUID,
  contact_name TEXT,
  centre_id UUID,
  current_status public.facture_statut,
  expected_status public.facture_statut,
  invoice_total NUMERIC,
  active_paid_total NUMERIC,
  remaining_due NUMERIC,
  overpaid_amount NUMERIC,
  active_payment_count INTEGER,
  deleted_payment_count INTEGER,
  deleted_paid_total NUMERIC,
  line_count INTEGER,
  date_emission DATE,
  date_echeance DATE,
  status_mismatch BOOLEAN,
  missing_lines BOOLEAN,
  missing_due_date BOOLEAN,
  soft_deleted_payments BOOLEAN,
  overpaid BOOLEAN,
  anomaly_reasons TEXT[],
  severity_score INTEGER
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH paiements_aggr AS (
    SELECT
      p.facture_id,
      COUNT(*) FILTER (WHERE p.deleted_at IS NULL)::INTEGER AS active_payment_count,
      COUNT(*) FILTER (WHERE p.deleted_at IS NOT NULL)::INTEGER AS deleted_payment_count,
      COALESCE(SUM(p.montant) FILTER (WHERE p.deleted_at IS NULL), 0)::NUMERIC AS active_paid_total,
      COALESCE(SUM(p.montant) FILTER (WHERE p.deleted_at IS NOT NULL), 0)::NUMERIC AS deleted_paid_total
    FROM public.paiements p
    GROUP BY p.facture_id
  ),
  lignes_aggr AS (
    SELECT
      fl.facture_id,
      COUNT(*)::INTEGER AS line_count
    FROM public.facture_lignes fl
    GROUP BY fl.facture_id
  ),
  base AS (
    SELECT
      f.id AS facture_id,
      f.numero_facture,
      f.contact_id,
      CONCAT_WS(' ', c.prenom, c.nom) AS contact_name,
      f.centre_id,
      f.statut AS current_status,
      f.montant_total::NUMERIC AS invoice_total,
      COALESCE(pa.active_paid_total, 0)::NUMERIC AS active_paid_total,
      GREATEST(f.montant_total - COALESCE(pa.active_paid_total, 0), 0)::NUMERIC AS remaining_due,
      GREATEST(COALESCE(pa.active_paid_total, 0) - f.montant_total, 0)::NUMERIC AS overpaid_amount,
      COALESCE(pa.active_payment_count, 0)::INTEGER AS active_payment_count,
      COALESCE(pa.deleted_payment_count, 0)::INTEGER AS deleted_payment_count,
      COALESCE(pa.deleted_paid_total, 0)::NUMERIC AS deleted_paid_total,
      COALESCE(la.line_count, 0)::INTEGER AS line_count,
      f.date_emission,
      f.date_echeance,
      f.created_at,
      CASE
        WHEN f.statut = 'annulee' THEN 'annulee'::public.facture_statut
        WHEN f.statut = 'brouillon' THEN 'brouillon'::public.facture_statut
        WHEN COALESCE(pa.active_paid_total, 0) >= f.montant_total AND f.montant_total > 0 THEN 'payee'::public.facture_statut
        WHEN COALESCE(pa.active_paid_total, 0) > 0 THEN 'partiel'::public.facture_statut
        WHEN f.date_echeance IS NOT NULL AND f.date_echeance < CURRENT_DATE THEN 'impayee'::public.facture_statut
        ELSE 'emise'::public.facture_statut
      END AS expected_status
    FROM public.factures f
    LEFT JOIN public.contacts c ON c.id = f.contact_id
    LEFT JOIN paiements_aggr pa ON pa.facture_id = f.id
    LEFT JOIN lignes_aggr la ON la.facture_id = f.id
    WHERE f.deleted_at IS NULL
  ),
  flagged AS (
    SELECT
      b.facture_id,
      b.numero_facture,
      b.contact_id,
      b.contact_name,
      b.centre_id,
      b.current_status,
      b.expected_status,
      b.invoice_total,
      b.active_paid_total,
      b.remaining_due,
      b.overpaid_amount,
      b.active_payment_count,
      b.deleted_payment_count,
      b.deleted_paid_total,
      b.line_count,
      b.date_emission,
      b.date_echeance,
      (b.current_status IS DISTINCT FROM b.expected_status) AS status_mismatch,
      (b.line_count = 0) AS missing_lines,
      (
        b.current_status IN ('emise', 'partiel', 'impayee')
        AND b.date_echeance IS NULL
      ) AS missing_due_date,
      (b.deleted_payment_count > 0) AS soft_deleted_payments,
      (b.active_paid_total > b.invoice_total) AS overpaid,
      ARRAY_REMOVE(ARRAY[
        CASE WHEN b.current_status IS DISTINCT FROM b.expected_status THEN 'statut_incoherent' END,
        CASE WHEN b.line_count = 0 THEN 'lignes_absentes' END,
        CASE WHEN b.current_status IN ('emise', 'partiel', 'impayee') AND b.date_echeance IS NULL THEN 'echeance_absente' END,
        CASE WHEN b.deleted_payment_count > 0 THEN 'paiements_supprimes' END,
        CASE WHEN b.active_paid_total > b.invoice_total THEN 'surpaiement' END
      ], NULL) AS anomaly_reasons,
      (
        CASE WHEN b.current_status IS DISTINCT FROM b.expected_status THEN 50 ELSE 0 END +
        CASE WHEN b.active_paid_total > b.invoice_total THEN 35 ELSE 0 END +
        CASE WHEN b.line_count = 0 THEN 20 ELSE 0 END +
        CASE WHEN b.deleted_payment_count > 0 THEN 15 ELSE 0 END +
        CASE WHEN b.current_status IN ('emise', 'partiel', 'impayee') AND b.date_echeance IS NULL THEN 10 ELSE 0 END
      )::INTEGER AS severity_score,
      b.created_at
    FROM base b
  )
  SELECT
    f.facture_id,
    f.numero_facture,
    f.contact_id,
    f.contact_name,
    f.centre_id,
    f.current_status,
    f.expected_status,
    f.invoice_total,
    f.active_paid_total,
    f.remaining_due,
    f.overpaid_amount,
    f.active_payment_count,
    f.deleted_payment_count,
    f.deleted_paid_total,
    f.line_count,
    f.date_emission,
    f.date_echeance,
    f.status_mismatch,
    f.missing_lines,
    f.missing_due_date,
    f.soft_deleted_payments,
    f.overpaid,
    f.anomaly_reasons,
    f.severity_score
  FROM flagged f
  WHERE NOT COALESCE(p_only_anomalies, true)
     OR COALESCE(array_length(f.anomaly_reasons, 1), 0) > 0
  ORDER BY
    f.severity_score DESC,
    f.date_echeance ASC NULLS LAST,
    f.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 500);
$$;

GRANT EXECUTE ON FUNCTION public.audit_facturation_v2(INTEGER, BOOLEAN) TO authenticated;
