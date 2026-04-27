-- Sécurisation du search_path de toutes les fonctions SECURITY DEFINER
-- du schéma public. Idempotent : skip les fonctions déjà configurées avec
-- search_path verrouillé sur (public, pg_temp) ou équivalent.
DO $$
DECLARE
  r RECORD;
  v_has_safe_path BOOLEAN;
  v_count_updated INTEGER := 0;
  v_count_skipped INTEGER := 0;
BEGIN
  FOR r IN
    SELECT
      p.oid,
      n.nspname AS schema_name,
      p.proname AS func_name,
      pg_get_function_identity_arguments(p.oid) AS args,
      p.proconfig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true   -- SECURITY DEFINER only
  LOOP
    v_has_safe_path := false;

    IF r.proconfig IS NOT NULL THEN
      -- Considère sécurisé si une entrée search_path existe déjà
      IF EXISTS (
        SELECT 1
        FROM unnest(r.proconfig) AS cfg
        WHERE cfg ILIKE 'search_path=%'
      ) THEN
        v_has_safe_path := true;
      END IF;
    END IF;

    IF v_has_safe_path THEN
      v_count_skipped := v_count_skipped + 1;
    ELSE
      EXECUTE format(
        'ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_temp',
        r.schema_name, r.func_name, r.args
      );
      v_count_updated := v_count_updated + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'secure_function_search_path: % updated, % already safe',
    v_count_updated, v_count_skipped;
END;
$$;