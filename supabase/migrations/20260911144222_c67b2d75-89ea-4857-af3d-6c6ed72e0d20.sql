DO $exec_m1$
DECLARE
  v_sql text;
  v_md5 text;
BEGIN
  SELECT string_agg(txt, '' ORDER BY part), md5(string_agg(txt, '' ORDER BY part))
    INTO v_sql, v_md5
  FROM public._mig_buffer;

  IF v_md5 IS DISTINCT FROM '93777345364184a58a22afbf489cb520' THEN
    RAISE EXCEPTION 'Contenu du fichier non conforme (empreinte %) : rien n''a été appliqué.', v_md5;
  END IF;

  EXECUTE v_sql;
END $exec_m1$;

DROP TABLE IF EXISTS public._mig_buffer;