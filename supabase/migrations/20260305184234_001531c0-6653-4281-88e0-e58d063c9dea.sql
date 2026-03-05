
-- Index for anti-duplicate lookups on generated_documents_v2
CREATE INDEX IF NOT EXISTS idx_generated_docs_v2_dedup
  ON generated_documents_v2 (template_id, contact_id, session_id, inscription_id, status);

-- Update auto_generate defaults for seed pack items
UPDATE document_pack_items 
SET auto_generate = true 
WHERE template_id IN ('a1000001-0000-0000-0000-000000000002', 'a1000001-0000-0000-0000-000000000003');

UPDATE document_pack_items 
SET auto_generate = false 
WHERE template_id = 'a1000001-0000-0000-0000-000000000001';
