
-- Function to sync statut_paiement on session_inscriptions
CREATE OR REPLACE FUNCTION public.sync_inscription_statut_paiement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_inscription_id UUID;
  v_total_facture NUMERIC;
  v_total_paye NUMERIC;
  v_new_statut TEXT;
BEGIN
  -- Determine which inscription to update
  IF TG_TABLE_NAME = 'paiements' THEN
    -- Get inscription_id via facture
    SELECT f.session_inscription_id INTO v_inscription_id
    FROM public.factures f
    WHERE f.id = COALESCE(NEW.facture_id, OLD.facture_id)
      AND f.session_inscription_id IS NOT NULL;
  ELSIF TG_TABLE_NAME = 'factures' THEN
    v_inscription_id := COALESCE(NEW.session_inscription_id, OLD.session_inscription_id);
  END IF;

  -- Skip if no inscription linked
  IF v_inscription_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Calculate totals
  SELECT 
    COALESCE(SUM(f.montant_total), 0),
    COALESCE(SUM(p_total.total), 0)
  INTO v_total_facture, v_total_paye
  FROM public.factures f
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(p.montant), 0) AS total
    FROM public.paiements p
    WHERE p.facture_id = f.id AND p.deleted_at IS NULL
  ) p_total ON TRUE
  WHERE f.session_inscription_id = v_inscription_id
    AND f.deleted_at IS NULL
    AND f.statut != 'annulee';

  -- Determine new status
  IF v_total_facture = 0 THEN
    v_new_statut := 'non_paye';
  ELSIF v_total_paye >= v_total_facture THEN
    v_new_statut := 'paye';
  ELSIF v_total_paye > 0 THEN
    v_new_statut := 'partiel';
  ELSE
    v_new_statut := 'non_paye';
  END IF;

  -- Update only if changed
  UPDATE public.session_inscriptions
  SET statut_paiement = v_new_statut
  WHERE id = v_inscription_id
    AND statut_paiement IS DISTINCT FROM v_new_statut;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger on factures
CREATE TRIGGER trg_sync_inscription_paiement_on_facture
AFTER INSERT OR UPDATE OR DELETE ON public.factures
FOR EACH ROW EXECUTE FUNCTION public.sync_inscription_statut_paiement();

-- Trigger on paiements
CREATE TRIGGER trg_sync_inscription_paiement_on_paiement
AFTER INSERT OR UPDATE OR DELETE ON public.paiements
FOR EACH ROW EXECUTE FUNCTION public.sync_inscription_statut_paiement();
