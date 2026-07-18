DO $mig$
DECLARE
  r RECORD;
  parts text[];
  expr text;
  prev text;
  i int;
  s text;
  n int := 0;
BEGIN
  FOR r IN
    SELECT tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename NOT IN (
        'template_audit_log',
        'contacts','contact_documents','contact_historique',
        'session_inscriptions','factures','paiements','sessions',
        'prospects','examens_t3p','examens_pratique'
      )
  LOOP
    parts := ARRAY[r.qual, r.with_check];
    FOR i IN 1..2 LOOP
      expr := parts[i];
      IF expr IS NOT NULL THEN
        -- STRIP existing wrappers to normalise (idempotent)
        LOOP
          prev := expr;
          expr := regexp_replace(expr, '\(SELECT auth\.uid\(\)\)', 'auth.uid()', 'g');
          expr := regexp_replace(expr, '\(SELECT is_admin_or_staff\(\)\)', 'is_admin_or_staff()', 'g');
          expr := regexp_replace(expr, '\(SELECT is_super_admin\(\)\)', 'is_super_admin()', 'g');
          expr := regexp_replace(expr, '\(SELECT get_user_formateur_id\(\)\)', 'get_user_formateur_id()', 'g');
          expr := regexp_replace(expr, '\(SELECT has_role\(auth\.uid\(\), (''[a-z_]+''::app_role)\)\)', 'has_role(auth.uid(), \1)', 'g');
          EXIT WHEN expr = prev;
        END LOOP;

        -- WRAP has_role first, then protect its inner auth.uid() from the general auth.uid wrap
        expr := regexp_replace(expr, 'has_role\(auth\.uid\(\), (''[a-z_]+''::app_role)\)', '(SELECT has_role(auth.uid(), \1))', 'g');
        expr := replace(expr, '(SELECT has_role(auth.uid(),', '(SELECT has_role(§AU§,');

        -- WRAP no-arg fns
        expr := regexp_replace(expr, '\mauth\.uid\(\)', '(SELECT auth.uid())', 'g');
        expr := regexp_replace(expr, '\mis_admin_or_staff\(\)', '(SELECT is_admin_or_staff())', 'g');
        expr := regexp_replace(expr, '\mis_super_admin\(\)', '(SELECT is_super_admin())', 'g');
        expr := regexp_replace(expr, '\mget_user_formateur_id\(\)', '(SELECT get_user_formateur_id())', 'g');

        -- RESTORE protected marker
        expr := replace(expr, '§AU§', 'auth.uid()');

        parts[i] := expr;
      END IF;
    END LOOP;

    IF (parts[1] IS DISTINCT FROM r.qual) OR (parts[2] IS DISTINCT FROM r.with_check) THEN
      s := format('ALTER POLICY %I ON public.%I', r.policyname, r.tablename);
      IF parts[1] IS NOT NULL THEN
        s := s || ' USING (' || parts[1] || ')';
      END IF;
      IF parts[2] IS NOT NULL THEN
        s := s || ' WITH CHECK (' || parts[2] || ')';
      END IF;
      EXECUTE s;
      n := n + 1;
    END IF;
  END LOOP;
  RAISE NOTICE 'RLS initplan lot 2: % policies modifiées', n;
END $mig$;

-- Vérification : le total de policies public doit rester à 400
DO $check$
DECLARE
  total int;
BEGIN
  SELECT count(*) INTO total FROM pg_policies WHERE schemaname='public';
  IF total <> 400 THEN
    RAISE EXCEPTION 'Total policies changed: expected 400, got %', total;
  END IF;
END $check$;
