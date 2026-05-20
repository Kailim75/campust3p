
-- ═══════════════════════════════════════════════════════════════
-- Sprint 4.2 — Vue enrichie + RPC paginée pour les factures
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.v_factures_enriched
WITH (security_invoker = true)
AS
SELECT
  f.*,
  COALESCE(p.total_paye, 0)::numeric AS total_paye,
  GREATEST(0, f.montant_total - COALESCE(p.total_paye, 0))::numeric AS reste_a_payer,
  CASE
    WHEN f.statut = 'payee'::facture_statut THEN 0
    WHEN f.statut = 'brouillon'::facture_statut THEN 5
    WHEN f.date_echeance IS NULL THEN 50
    WHEN f.date_echeance < CURRENT_DATE - INTERVAL '60 days' THEN 100
    WHEN f.date_echeance < CURRENT_DATE - INTERVAL '30 days' THEN 80
    WHEN f.date_echeance < CURRENT_DATE THEN 60
    ELSE 30
  END AS risk_score,
  CASE
    WHEN f.statut IN ('emise'::facture_statut,'partiel'::facture_statut,'impayee'::facture_statut)
      AND f.date_echeance IS NOT NULL
      AND f.date_echeance < CURRENT_DATE THEN true
    ELSE false
  END AS is_overdue
FROM public.factures f
LEFT JOIN LATERAL (
  SELECT SUM(montant) AS total_paye
  FROM public.paiements pa
  WHERE pa.facture_id = f.id AND pa.deleted_at IS NULL
) p ON true;

COMMENT ON VIEW public.v_factures_enriched IS
  'Sprint 4.2 — Factures + total_paye, reste_a_payer, risk_score, is_overdue. security_invoker => respecte RLS de factures/paiements.';


-- RPC paginée serveur — utilisée par useFacturesPaginated
CREATE OR REPLACE FUNCTION public.get_factures_paginated(
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 50,
  p_statut text DEFAULT NULL,
  p_financement text DEFAULT NULL,
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_sort_by text DEFAULT 'created_at',
  p_sort_dir text DEFAULT 'desc'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_total integer;
  v_rows jsonb;
  v_offset integer := GREATEST(0, (p_page - 1) * p_page_size);
  v_sort text;
BEGIN
  -- Whitelist tri
  v_sort := CASE p_sort_by
    WHEN 'date_emission' THEN 'date_emission'
    WHEN 'date_echeance' THEN 'date_echeance'
    WHEN 'montant_total' THEN 'montant_total'
    WHEN 'risk_score' THEN 'risk_score'
    ELSE 'created_at'
  END;

  -- COUNT
  EXECUTE format($q$
    SELECT count(*)::int FROM public.v_factures_enriched
    WHERE deleted_at IS NULL
      AND (%L IS NULL OR statut::text = %L)
      AND (%L IS NULL OR type_financement::text = %L)
      AND (%L::date IS NULL OR date_emission >= %L::date)
      AND (%L::date IS NULL OR date_emission <= %L::date)
      AND (%L IS NULL OR numero_facture ILIKE '%%' || %L || '%%' OR coalesce(commentaires,'') ILIKE '%%' || %L || '%%')
  $q$,
    p_statut, p_statut,
    p_financement, p_financement,
    p_date_from, p_date_from,
    p_date_to, p_date_to,
    p_search, p_search, p_search
  ) INTO v_total;

  -- ROWS
  EXECUTE format($q$
    SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
    FROM (
      SELECT * FROM public.v_factures_enriched
      WHERE deleted_at IS NULL
        AND (%L IS NULL OR statut::text = %L)
        AND (%L IS NULL OR type_financement::text = %L)
        AND (%L::date IS NULL OR date_emission >= %L::date)
        AND (%L::date IS NULL OR date_emission <= %L::date)
        AND (%L IS NULL OR numero_facture ILIKE '%%' || %L || '%%' OR coalesce(commentaires,'') ILIKE '%%' || %L || '%%')
      ORDER BY %I %s NULLS LAST
      LIMIT %L OFFSET %L
    ) t
  $q$,
    p_statut, p_statut,
    p_financement, p_financement,
    p_date_from, p_date_from,
    p_date_to, p_date_to,
    p_search, p_search, p_search,
    v_sort, CASE WHEN lower(p_sort_dir) = 'asc' THEN 'ASC' ELSE 'DESC' END,
    p_page_size, v_offset
  ) INTO v_rows;

  RETURN jsonb_build_object(
    'rows', v_rows,
    'total', v_total,
    'page', p_page,
    'page_size', p_page_size,
    'total_pages', GREATEST(1, CEIL(v_total::numeric / NULLIF(p_page_size,0))::int)
  );
END;
$$;

COMMENT ON FUNCTION public.get_factures_paginated IS
  'Sprint 4.2 — Pagination serveur des factures (filtres + tri + count). security_invoker.';


-- ═══════════════════════════════════════════════════════════════
-- Sprint 8 — Factur-X & PDP : colonnes + table de transmissions
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.factures
  ADD COLUMN IF NOT EXISTS facturx_xml text,
  ADD COLUMN IF NOT EXISTS facturx_generated_at timestamptz;


CREATE TABLE IF NOT EXISTS public.facture_pdp_transmissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facture_id uuid NOT NULL REFERENCES public.factures(id) ON DELETE CASCADE,
  centre_id uuid NOT NULL,
  pdp_target text NOT NULL,                     -- ex: ppf, docaposte, esker, ...
  statut text NOT NULL DEFAULT 'en_attente',    -- en_attente | envoye | accepte | rejete | erreur
  pdp_reference text,                            -- id retourné par la PDP
  payload jsonb,
  response jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX IF NOT EXISTS idx_facture_pdp_transmissions_facture
  ON public.facture_pdp_transmissions(facture_id);
CREATE INDEX IF NOT EXISTS idx_facture_pdp_transmissions_centre
  ON public.facture_pdp_transmissions(centre_id);

ALTER TABLE public.facture_pdp_transmissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pdp_tx_select_by_centre" ON public.facture_pdp_transmissions;
CREATE POLICY "pdp_tx_select_by_centre"
  ON public.facture_pdp_transmissions
  FOR SELECT
  TO authenticated
  USING (centre_id IN (SELECT centre_id FROM public.user_centres WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "pdp_tx_insert_by_centre" ON public.facture_pdp_transmissions;
CREATE POLICY "pdp_tx_insert_by_centre"
  ON public.facture_pdp_transmissions
  FOR INSERT
  TO authenticated
  WITH CHECK (centre_id IN (SELECT centre_id FROM public.user_centres WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "pdp_tx_update_by_centre" ON public.facture_pdp_transmissions;
CREATE POLICY "pdp_tx_update_by_centre"
  ON public.facture_pdp_transmissions
  FOR UPDATE
  TO authenticated
  USING (centre_id IN (SELECT centre_id FROM public.user_centres WHERE user_id = auth.uid()))
  WITH CHECK (centre_id IN (SELECT centre_id FROM public.user_centres WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "pdp_tx_delete_admin" ON public.facture_pdp_transmissions;
CREATE POLICY "pdp_tx_delete_admin"
  ON public.facture_pdp_transmissions
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

COMMENT ON TABLE public.facture_pdp_transmissions IS
  'Sprint 8 — Historique des transmissions de factures vers une PDP (Plateforme de Dématérialisation Partenaire).';
