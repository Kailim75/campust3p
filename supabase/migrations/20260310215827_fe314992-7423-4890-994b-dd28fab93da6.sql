-- Add missing columns to signature_requests for stable PDF path resolution
ALTER TABLE public.signature_requests 
  ADD COLUMN IF NOT EXISTS document_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS document_storage_bucket TEXT DEFAULT 'generated-documents';