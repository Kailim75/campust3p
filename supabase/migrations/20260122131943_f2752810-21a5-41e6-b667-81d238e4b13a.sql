-- Ajouter le champ formation_type pour associer les modèles à un type de formation
ALTER TABLE public.document_template_files
ADD COLUMN IF NOT EXISTS formation_type TEXT;

-- Ajouter le champ type_document pour distinguer attestation, emargement, etc.
ALTER TABLE public.document_template_files
ADD COLUMN IF NOT EXISTS type_document TEXT DEFAULT 'autre';

-- Créer un index pour améliorer les performances de filtrage
CREATE INDEX IF NOT EXISTS idx_document_template_files_formation_type 
ON public.document_template_files(formation_type);

CREATE INDEX IF NOT EXISTS idx_document_template_files_type_document 
ON public.document_template_files(type_document);

-- Ajouter un commentaire explicatif
COMMENT ON COLUMN public.document_template_files.formation_type IS 'Type de formation associé: VTC, TAXI, VMDTR, MOB, FCO_VTC, FCO_TAXI, FCO_VMDTR, etc.';
COMMENT ON COLUMN public.document_template_files.type_document IS 'Type de document: attestation, emargement, convention, convocation, etc.';