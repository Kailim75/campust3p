-- Fusion de deux fiches contact (chantier A de AUDIT-2026-07-21.md).
--
-- Transfère TOUT ce qui pointe vers la fiche fusionnée (découverte dynamique
-- des clés étrangères — robuste aux évolutions de schéma), complète les
-- champs vides de la fiche conservée, journalise, puis archive la fiche
-- fusionnée en soft delete (motif maison : deleted_at + audit_logs).
-- Atomique : la moindre erreur (ex. contrainte d'unicité) annule tout.

CREATE OR REPLACE FUNCTION public.merge_contacts(p_garder uuid, p_fusionner uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r RECORD;
  v_centre_garder uuid;
  v_centre_fusionner uuid;
  v_nom_fusionne text;
BEGIN
  IF p_garder = p_fusionner THEN
    RAISE EXCEPTION 'merge_contacts: les deux identifiants sont identiques';
  END IF;

  SELECT centre_id INTO v_centre_garder
    FROM contacts WHERE id = p_garder AND deleted_at IS NULL;
  SELECT centre_id, trim(coalesce(prenom,'') || ' ' || coalesce(nom,''))
    INTO v_centre_fusionner, v_nom_fusionne
    FROM contacts WHERE id = p_fusionner AND deleted_at IS NULL;

  IF v_centre_garder IS NULL OR v_centre_fusionner IS NULL THEN
    RAISE EXCEPTION 'merge_contacts: fiche introuvable ou déjà supprimée';
  END IF;

  -- Autorisation : admin/staff avec accès aux centres des DEUX fiches.
  IF NOT (
    has_centre_access(v_centre_garder)
    AND has_centre_access(v_centre_fusionner)
    AND ((SELECT has_role(auth.uid(), 'admin'::app_role))
         OR (SELECT has_role(auth.uid(), 'staff'::app_role)))
  ) THEN
    RAISE EXCEPTION 'merge_contacts: accès refusé';
  END IF;

  -- 1. Réassigner dynamiquement toute FK public.* -> contacts(id).
  FOR r IN
    SELECT tc.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON kcu.constraint_name = tc.constraint_name
     AND kcu.table_schema = tc.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
     AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND ccu.table_name = 'contacts'
      AND ccu.column_name = 'id'
      AND NOT (tc.table_name = 'contacts')
  LOOP
    EXECUTE format('UPDATE public.%I SET %I = $1 WHERE %I = $2',
                   r.table_name, r.column_name, r.column_name)
      USING p_garder, p_fusionner;
  END LOOP;

  -- 2. Compléter les champs vides de la fiche conservée (jamais d'écrasement).
  UPDATE contacts g SET
    email              = COALESCE(g.email, f.email),
    telephone          = COALESCE(g.telephone, f.telephone),
    email_facturation  = COALESCE(g.email_facturation, f.email_facturation),
    date_naissance     = COALESCE(g.date_naissance, f.date_naissance),
    ville_naissance    = COALESCE(g.ville_naissance, f.ville_naissance),
    rue                = COALESCE(g.rue, f.rue),
    code_postal        = COALESCE(g.code_postal, f.code_postal),
    ville              = COALESCE(g.ville, f.ville),
    formation          = COALESCE(g.formation, f.formation),
    email_interne      = COALESCE(g.email_interne, f.email_interne),
    email_interne_consulte_le = COALESCE(g.email_interne_consulte_le, f.email_interne_consulte_le)
  FROM contacts f
  WHERE g.id = p_garder AND f.id = p_fusionner;

  -- 3. Journaliser la fusion sur la fiche conservée.
  INSERT INTO contact_historique (contact_id, type, titre, contenu, auto_category, auto_metadata)
  VALUES (
    p_garder,
    'note',
    '[AUTO] Fusion de fiches',
    format('Fiche « %s » (%s) fusionnée dans celle-ci : historique, documents, factures et examens transférés.', v_nom_fusionne, p_fusionner),
    'fusion_contacts',
    jsonb_build_object('fusionne_id', p_fusionner, 'fusionne_nom', v_nom_fusionne)
  );

  -- 4. Archiver la fiche fusionnée (soft delete, motif maison).
  UPDATE contacts
     SET deleted_at = now(),
         deleted_by = auth.uid(),
         delete_reason = format('Fusionné dans %s', p_garder),
         archived = true
   WHERE id = p_fusionner;

  INSERT INTO audit_logs (table_name, record_id, action, user_id, user_email, new_data)
  VALUES (
    'contacts',
    p_fusionner,
    'MERGE_INTO',
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    jsonb_build_object('merged_into', p_garder, 'merged_at', now())
  );

  RETURN true;
END;
$function$;