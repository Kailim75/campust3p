-- Audit du 13/08/2026 — P0 (perte de données)
--
-- Ces tables subissent des DELETE définitifs depuis le front (trésorerie,
-- preuves et audits Qualiopi, lignes de facture, factures/documents formateur,
-- séances de conduite, cartes pro, coûts) sans corbeille ni trace : une fausse
-- manipulation était irréversible.
--
-- En attendant leur passage au soft-delete (chantier à part : chaque lecture de
-- ces tables devra alors filtrer deleted_at, sous peine de lignes fantômes dans
-- les totaux), le trigger d'audit générique — déjà utilisé sur contacts,
-- factures, paiements… — rend toute insertion/modification/suppression
-- traçable (qui, quand, quoi) et récupérable depuis audit_logs.old_data.
--
-- audit_trigger_function() gère l'absence de colonne centre_id (repli sur le
-- centre principal de l'utilisateur) ; toutes ces tables ont une colonne id.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'transactions_bancaires',
    'qualiopi_preuves',
    'qualiopi_audits',
    'qualiopi_actions',
    'facture_lignes',
    'formateur_factures',
    'formateur_documents',
    'seances_conduite',
    'cartes_professionnelles',
    'financial_costs',
    'financial_cash_manual'
  ] LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE 'Table public.% absente — trigger d''audit ignoré', t;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%I ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function()',
      t, t
    );
  END LOOP;
END $$;
