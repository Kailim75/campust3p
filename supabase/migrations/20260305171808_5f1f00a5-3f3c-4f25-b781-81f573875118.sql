
-- =============================================
-- Sprint 3: Security observability infrastructure
-- =============================================

-- Table to store smoke test run results
CREATE TABLE public.security_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'unknown', -- 'pass', 'fail', 'warn'
  summary_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_pass int NOT NULL DEFAULT 0,
  total_fail int NOT NULL DEFAULT 0,
  total_warn int NOT NULL DEFAULT 0
);

ALTER TABLE public.security_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_select_security_runs" ON public.security_runs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin());

CREATE POLICY "admin_insert_security_runs" ON public.security_runs
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_super_admin());

-- RPC: run_security_smoke_tests (read-only, returns results)
CREATE OR REPLACE FUNCTION public.run_security_smoke_tests()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_results jsonb := '[]'::jsonb;
  v_test jsonb;
  r record;
  v_cnt int;
  v_rls_enabled bool;
  v_table regclass;
  v_total_pass int := 0;
  v_total_fail int := 0;
  v_total_warn int := 0;
  v_status text;
BEGIN
  -- Auth check
  IF NOT (has_role(auth.uid(), 'admin') OR is_super_admin()) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  -- 1) Public buckets
  SELECT count(*) INTO v_cnt FROM storage.buckets WHERE public = true;
  v_test := jsonb_build_object(
    'test', 'Buckets publics',
    'status', CASE WHEN v_cnt = 0 THEN 'PASS' ELSE 'FAIL' END,
    'details', v_cnt || ' bucket(s) public(s)'
  );
  v_results := v_results || v_test;
  IF v_cnt = 0 THEN v_total_pass := v_total_pass + 1; ELSE v_total_fail := v_total_fail + 1; END IF;

  -- 2) RLS + orphans on tables with centre_id
  FOR r IN
    SELECT c.table_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.column_name = 'centre_id'
      AND c.table_name NOT IN ('user_centres')
    ORDER BY c.table_name
  LOOP
    v_table := to_regclass('public.' || r.table_name);
    IF v_table IS NULL THEN CONTINUE; END IF;

    SELECT relrowsecurity INTO v_rls_enabled FROM pg_class WHERE oid = v_table;
    
    -- RLS check
    v_test := jsonb_build_object(
      'test', 'RLS: ' || r.table_name,
      'status', CASE WHEN v_rls_enabled THEN 'PASS' ELSE 'FAIL' END,
      'details', CASE WHEN v_rls_enabled THEN 'ON' ELSE 'OFF' END
    );
    v_results := v_results || v_test;
    IF v_rls_enabled THEN v_total_pass := v_total_pass + 1; ELSE v_total_fail := v_total_fail + 1; END IF;

    -- Orphans check
    EXECUTE format('SELECT count(*) FROM %s WHERE centre_id IS NULL', v_table) INTO v_cnt;
    v_test := jsonb_build_object(
      'test', 'Orphans: ' || r.table_name,
      'status', CASE WHEN v_cnt = 0 THEN 'PASS' ELSE 'FAIL' END,
      'details', v_cnt || ' orphelin(s)'
    );
    v_results := v_results || v_test;
    IF v_cnt = 0 THEN v_total_pass := v_total_pass + 1; ELSE v_total_fail := v_total_fail + 1; END IF;
  END LOOP;

  -- 3) Centre-aware policies on critical tables
  FOR r IN
    SELECT unnest(ARRAY[
      'prospects','contacts','factures','devis','sessions',
      'creneaux_conduite','formateurs','partners','vehicules',
      'catalogue_formations','session_inscriptions','action_logs','audit_logs'
    ]) AS table_name
  LOOP
    v_table := to_regclass('public.' || r.table_name);
    IF v_table IS NULL THEN
      v_test := jsonb_build_object('test', 'Centre-aware: ' || r.table_name, 'status', 'SKIP', 'details', 'table absente');
      v_results := v_results || v_test;
      CONTINUE;
    END IF;

    SELECT count(*) INTO v_cnt
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = r.table_name
      AND (position('has_centre_access' IN coalesce(qual,'')) > 0
           OR position('has_centre_access' IN coalesce(with_check,'')) > 0);

    v_test := jsonb_build_object(
      'test', 'Centre-aware: ' || r.table_name,
      'status', CASE WHEN v_cnt > 0 THEN 'PASS' ELSE 'FAIL' END,
      'details', v_cnt || ' policy(ies)'
    );
    v_results := v_results || v_test;
    IF v_cnt > 0 THEN v_total_pass := v_total_pass + 1; ELSE v_total_fail := v_total_fail + 1; END IF;
  END LOOP;

  -- 4) Storage policies centre-aware
  SELECT count(*) INTO v_cnt
  FROM pg_policies
  WHERE schemaname = 'storage' AND tablename = 'objects'
    AND (position('storage_object_centre_id' IN coalesce(qual,'')) > 0
         OR position('storage_object_centre_id' IN coalesce(with_check,'')) > 0);

  v_test := jsonb_build_object(
    'test', 'Storage centre-aware',
    'status', CASE WHEN v_cnt > 0 THEN 'PASS' ELSE 'FAIL' END,
    'details', v_cnt || ' policy(ies)'
  );
  v_results := v_results || v_test;
  IF v_cnt > 0 THEN v_total_pass := v_total_pass + 1; ELSE v_total_fail := v_total_fail + 1; END IF;

  -- 5) partner_stats security_invoker
  SELECT CASE WHEN 'security_invoker=true' = ANY(c.reloptions) THEN true ELSE false END INTO v_rls_enabled
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'partner_stats';

  v_test := jsonb_build_object(
    'test', 'Vue partner_stats security_invoker',
    'status', CASE WHEN v_rls_enabled THEN 'PASS' ELSE 'FAIL' END,
    'details', CASE WHEN v_rls_enabled THEN 'security_invoker=true' ELSE 'DANGER: security_invoker=false' END
  );
  v_results := v_results || v_test;
  IF v_rls_enabled THEN v_total_pass := v_total_pass + 1; ELSE v_total_fail := v_total_fail + 1; END IF;

  -- 6) Storage public_read policies (should be 0)
  SELECT count(*) INTO v_cnt
  FROM pg_policies
  WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname LIKE '%public_read%';

  v_test := jsonb_build_object(
    'test', 'Storage public_read policies',
    'status', CASE WHEN v_cnt = 0 THEN 'PASS' ELSE 'WARN' END,
    'details', v_cnt || ' policy(ies) public_read'
  );
  v_results := v_results || v_test;
  IF v_cnt = 0 THEN v_total_pass := v_total_pass + 1; ELSE v_total_warn := v_total_warn + 1; END IF;

  -- Determine overall status
  v_status := CASE
    WHEN v_total_fail > 0 THEN 'fail'
    WHEN v_total_warn > 0 THEN 'warn'
    ELSE 'pass'
  END;

  -- Store the run
  INSERT INTO security_runs (created_by, status, summary_json, total_pass, total_fail, total_warn)
  VALUES (auth.uid(), v_status, v_results, v_total_pass, v_total_fail, v_total_warn);

  RETURN jsonb_build_object(
    'status', v_status,
    'total_pass', v_total_pass,
    'total_fail', v_total_fail,
    'total_warn', v_total_warn,
    'results', v_results
  );
END;
$$;
