-- Table pour stocker les fichiers de modèles (PDF/DOCX)
CREATE TABLE public.document_template_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  description TEXT,
  type_fichier TEXT NOT NULL CHECK (type_fichier IN ('pdf', 'docx')),
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  variables TEXT[] DEFAULT '{}',
  categorie TEXT DEFAULT 'general',
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Table pour les documents générés
CREATE TABLE public.generated_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  template_file_id UUID REFERENCES public.document_template_files(id) ON DELETE SET NULL,
  template_text_id UUID REFERENCES public.document_templates(id) ON DELETE SET NULL,
  nom TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT DEFAULT 'application/pdf',
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT check_template_source CHECK (
    template_file_id IS NOT NULL OR template_text_id IS NOT NULL
  )
);

-- Enable RLS
ALTER TABLE public.document_template_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for document_template_files
CREATE POLICY "Users with admin or staff role can view template files"
ON public.document_template_files
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'staff')
);

CREATE POLICY "Users with admin or staff role can insert template files"
ON public.document_template_files
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'staff')
);

CREATE POLICY "Users with admin or staff role can update template files"
ON public.document_template_files
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'staff')
);

CREATE POLICY "Users with admin role can delete template files"
ON public.document_template_files
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for generated_documents
CREATE POLICY "Users with admin or staff role can view generated documents"
ON public.generated_documents
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'staff')
);

CREATE POLICY "Users with admin or staff role can insert generated documents"
ON public.generated_documents
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'staff')
);

CREATE POLICY "Users with admin or staff role can delete generated documents"
ON public.generated_documents
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'staff')
);

-- Update trigger for document_template_files
CREATE TRIGGER update_document_template_files_updated_at
BEFORE UPDATE ON public.document_template_files
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for template files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('document-templates', 'document-templates', false)
ON CONFLICT (id) DO NOTHING;

-- Storage bucket for generated documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('generated-documents', 'generated-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for document-templates bucket
CREATE POLICY "Authenticated users with role can view template files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'document-templates' AND
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
);

CREATE POLICY "Authenticated users with role can upload template files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'document-templates' AND
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
);

CREATE POLICY "Admin users can delete template files from storage"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'document-templates' AND
  public.has_role(auth.uid(), 'admin')
);

-- Storage policies for generated-documents bucket
CREATE POLICY "Authenticated users with role can view generated documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'generated-documents' AND
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
);

CREATE POLICY "Authenticated users with role can upload generated documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'generated-documents' AND
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
);

CREATE POLICY "Authenticated users with role can delete generated documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'generated-documents' AND
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
);