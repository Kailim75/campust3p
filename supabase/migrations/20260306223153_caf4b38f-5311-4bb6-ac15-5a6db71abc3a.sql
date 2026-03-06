-- Disable only user-defined triggers for bulk restore
ALTER TABLE public.emargements DISABLE TRIGGER USER;

-- Restore all emargements from audit_logs
INSERT INTO public.emargements (id, session_id, contact_id, date_emargement, periode, heure_debut, heure_fin, present, signature_url, signature_data, date_signature, commentaires, created_at, updated_at)
SELECT 
  (old_data->>'id')::uuid,
  (old_data->>'session_id')::uuid,
  (old_data->>'contact_id')::uuid,
  (old_data->>'date_emargement')::date,
  old_data->>'periode',
  (old_data->>'heure_debut')::time,
  (old_data->>'heure_fin')::time,
  (old_data->>'present')::boolean,
  old_data->>'signature_url',
  old_data->>'signature_data',
  CASE WHEN old_data->>'date_signature' IS NOT NULL AND old_data->>'date_signature' != '' 
       THEN (old_data->>'date_signature')::timestamptz ELSE NULL END,
  old_data->>'commentaires',
  (old_data->>'created_at')::timestamptz,
  (old_data->>'updated_at')::timestamptz
FROM public.audit_logs
WHERE table_name = 'emargements' 
  AND action = 'DELETE'
  AND created_at >= '2026-03-06 22:02:00+00'
  AND created_at <= '2026-03-06 22:03:00+00'
  AND old_data->>'session_id' = '18f74ad5-e42f-4aa6-9681-00c028401802'
ON CONFLICT (id) DO NOTHING;

-- Re-enable user triggers
ALTER TABLE public.emargements ENABLE TRIGGER USER;