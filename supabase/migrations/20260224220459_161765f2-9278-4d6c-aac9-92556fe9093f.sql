
-- ═══════════════════════════════════════════════════════════════
-- Trigger : auto-create a versement when a paiement is inserted
-- Maps mode_paiement → mode_versement (cheque → cb fallback)
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.sync_paiement_to_versement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_mode_versement public.mode_versement;
BEGIN
  -- Map mode_paiement → mode_versement
  v_mode_versement := CASE NEW.mode_paiement::TEXT
    WHEN 'especes' THEN 'especes'::public.mode_versement
    WHEN 'cb' THEN 'cb'::public.mode_versement
    WHEN 'virement' THEN 'virement'::public.mode_versement
    WHEN 'cpf' THEN 'cpf'::public.mode_versement
    WHEN 'cheque' THEN 'cb'::public.mode_versement  -- fallback: cheque → cb
    ELSE 'virement'::public.mode_versement
  END;

  INSERT INTO public.versements (paiement_id, montant, date_encaissement, mode, reference, notes)
  VALUES (
    NEW.id,
    NEW.montant,
    NEW.date_paiement,
    v_mode_versement,
    NEW.reference,
    NEW.commentaires
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- Attach trigger on INSERT
CREATE TRIGGER trg_sync_paiement_to_versement
AFTER INSERT ON public.paiements
FOR EACH ROW
EXECUTE FUNCTION public.sync_paiement_to_versement();

-- ═══════════════════════════════════════════════════════════════
-- Backfill: create versements for all existing paiements
-- ═══════════════════════════════════════════════════════════════
INSERT INTO public.versements (paiement_id, montant, date_encaissement, mode, reference, notes)
SELECT
  p.id,
  p.montant,
  p.date_paiement,
  CASE p.mode_paiement::TEXT
    WHEN 'especes' THEN 'especes'::public.mode_versement
    WHEN 'cb' THEN 'cb'::public.mode_versement
    WHEN 'virement' THEN 'virement'::public.mode_versement
    WHEN 'cpf' THEN 'cpf'::public.mode_versement
    WHEN 'cheque' THEN 'cb'::public.mode_versement
    ELSE 'virement'::public.mode_versement
  END,
  p.reference,
  p.commentaires
FROM public.paiements p
LEFT JOIN public.versements v ON v.paiement_id = p.id
WHERE v.id IS NULL;
