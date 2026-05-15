
CREATE OR REPLACE VIEW public.v_inscription_workflow
WITH (security_invoker = true)
AS
WITH base AS (
  SELECT
    si.id AS inscription_id,
    si.contact_id,
    si.session_id,
    s.centre_id,
    si.statut AS inscription_statut,
    si.contract_frame_status,
    si.contract_document_type,
    s.date_debut,
    s.date_fin,
    s.duree_heures,
    s.nom AS session_nom,
    EXISTS (
      SELECT 1 FROM public.generated_documents_v2 gd
      JOIN public.template_studio_templates t ON t.id = gd.template_id
      WHERE gd.contact_id = si.contact_id
        AND gd.session_id = si.session_id
        AND gd.deleted_at IS NULL
        AND gd.status = 'generated'
        AND t.type::text = 'convocation'
    ) AS convocation_generated,
    EXISTS (
      SELECT 1 FROM public.document_envois de
      WHERE de.contact_id = si.contact_id
        AND de.session_id = si.session_id
        AND de.document_type = 'convocation'
        AND de.statut <> 'echec'
    ) AS convocation_sent,
    EXISTS (
      SELECT 1 FROM public.signature_requests sr
      WHERE sr.contact_id = si.contact_id
        AND sr.session_inscription_id = si.id
        AND sr.statut = 'signe'
        AND sr.type_document IN ('contrat','convention')
    ) AS contract_signed,
    (SELECT COUNT(*) FROM public.emargements e
       WHERE e.session_id = si.session_id
         AND e.contact_id = si.contact_id
         AND e.deleted_at IS NULL) AS emargement_total,
    (SELECT COUNT(*) FROM public.emargements e
       WHERE e.session_id = si.session_id
         AND e.contact_id = si.contact_id
         AND e.deleted_at IS NULL
         AND e.present = true
         AND e.signature_url IS NOT NULL) AS emargement_signed,
    EXISTS (
      SELECT 1 FROM public.generated_documents_v2 gd
      JOIN public.template_studio_templates t ON t.id = gd.template_id
      WHERE gd.contact_id = si.contact_id
        AND gd.session_id = si.session_id
        AND gd.deleted_at IS NULL
        AND gd.status = 'generated'
        AND t.type::text IN ('attestation','certificat_realisation')
    ) AS attestation_generated,
    EXISTS (
      SELECT 1 FROM public.document_envois de
      WHERE de.contact_id = si.contact_id
        AND de.session_id = si.session_id
        AND de.document_type IN ('attestation','certificat_realisation')
        AND de.statut <> 'echec'
    ) AS attestation_sent
  FROM public.session_inscriptions si
  JOIN public.sessions s ON s.id = si.session_id
  WHERE si.deleted_at IS NULL
    AND s.deleted_at IS NULL
)
SELECT
  b.*,
  CASE
    WHEN b.attestation_sent THEN 'atteste'
    WHEN b.attestation_generated THEN 'termine'
    WHEN b.date_fin < CURRENT_DATE AND b.emargement_signed > 0 THEN 'termine'
    WHEN b.emargement_signed > 0 THEN 'emarge'
    WHEN b.date_debut <= CURRENT_DATE AND b.date_fin >= CURRENT_DATE THEN 'en_formation'
    WHEN b.convocation_sent THEN 'convoque'
    ELSE 'inscrit'
  END AS workflow_step,
  (NOT b.convocation_generated
    AND b.date_debut IS NOT NULL
    AND b.date_debut - CURRENT_DATE BETWEEN 0 AND 7) AS alert_convocation_missing,
  (b.convocation_generated AND NOT b.convocation_sent
    AND b.date_debut IS NOT NULL
    AND b.date_debut - CURRENT_DATE BETWEEN 0 AND 7) AS alert_convocation_unsent,
  (b.date_debut <= CURRENT_DATE AND b.date_fin >= CURRENT_DATE
    AND b.emargement_signed = 0) AS alert_emargement_missing,
  (b.date_fin IS NOT NULL
    AND CURRENT_DATE - b.date_fin >= 2
    AND NOT b.attestation_generated) AS alert_attestation_late,
  (NOT b.contract_signed
    AND b.date_debut IS NOT NULL
    AND b.date_debut - CURRENT_DATE <= 3) AS alert_contract_unsigned
FROM base b;

GRANT SELECT ON public.v_inscription_workflow TO authenticated;
