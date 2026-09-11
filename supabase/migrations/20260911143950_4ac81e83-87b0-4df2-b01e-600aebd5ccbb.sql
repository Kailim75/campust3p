DO $exec_m2$
DECLARE
  v_sql text;
  v_md5 text;
BEGIN
  SELECT string_agg(txt, '' ORDER BY part), md5(string_agg(txt, '' ORDER BY part))
    INTO v_sql, v_md5
  FROM public._mig_buffer;

  IF v_md5 IS DISTINCT FROM 'eed5b55372991ccdc924f5345bfded78' THEN
    RAISE EXCEPTION 'Contenu du fichier non conforme (empreinte %) : rien n''a été appliqué.', v_md5;
  END IF;

  EXECUTE v_sql;
END $exec_m2$;