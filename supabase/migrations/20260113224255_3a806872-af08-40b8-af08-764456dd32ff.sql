-- Create storage bucket for contact documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('contact-documents', 'contact-documents', false);

-- Create RLS policies for contact-documents bucket
CREATE POLICY "Authenticated users can view documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'contact-documents');

CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'contact-documents');

CREATE POLICY "Authenticated users can update documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'contact-documents');

CREATE POLICY "Authenticated users can delete documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'contact-documents');

-- Create table for document metadata
CREATE TABLE public.contact_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  type_document TEXT NOT NULL, -- CNI, permis, attestation, casier, certificat_medical, autre
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  date_expiration DATE,
  commentaires TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contact_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow read access to documents"
ON public.contact_documents FOR SELECT
USING (true);

CREATE POLICY "Allow insert access to documents"
ON public.contact_documents FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow update access to documents"
ON public.contact_documents FOR UPDATE
USING (true);

CREATE POLICY "Allow delete access to documents"
ON public.contact_documents FOR DELETE
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_contact_documents_updated_at
BEFORE UPDATE ON public.contact_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();