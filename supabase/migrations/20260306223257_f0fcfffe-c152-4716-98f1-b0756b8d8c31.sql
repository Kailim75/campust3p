-- Disable audit trigger to re-link factures
ALTER TABLE public.factures DISABLE TRIGGER USER;

-- Re-link factures to restored inscriptions
UPDATE factures f
SET session_inscription_id = si.id
FROM session_inscriptions si
WHERE si.session_id = '18f74ad5-e42f-4aa6-9681-00c028401802'
  AND f.contact_id = si.contact_id
  AND f.session_inscription_id IS NULL;

-- Re-enable triggers
ALTER TABLE public.factures ENABLE TRIGGER USER;