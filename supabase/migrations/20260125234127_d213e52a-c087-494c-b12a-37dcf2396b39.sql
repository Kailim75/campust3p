-- Create GDPR Processing Register table (Article 30 compliant)
CREATE TABLE public.gdpr_processing_register (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Basic identification
  code TEXT NOT NULL,
  nom_traitement TEXT NOT NULL,
  description TEXT,
  
  -- Article 30 required fields
  finalites TEXT NOT NULL, -- Purposes of processing
  base_legale TEXT NOT NULL, -- Legal basis (consent, contract, legal obligation, etc.)
  categories_personnes TEXT[] NOT NULL DEFAULT '{}', -- Categories of data subjects
  categories_donnees TEXT[] NOT NULL DEFAULT '{}', -- Categories of personal data
  destinataires TEXT[] DEFAULT '{}', -- Recipients
  transferts_hors_ue JSONB DEFAULT '[]', -- Transfers outside EU
  delais_conservation TEXT, -- Retention periods
  mesures_securite TEXT[], -- Security measures
  
  -- Additional metadata
  responsable_traitement TEXT,
  sous_traitants JSONB DEFAULT '[]',
  source_donnees TEXT, -- How data is collected
  decisions_automatisees BOOLEAN DEFAULT false,
  analyse_impact_requise BOOLEAN DEFAULT false,
  date_mise_en_oeuvre DATE,
  
  -- Status and tracking
  statut TEXT NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif', 'archive', 'en_revision')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  UNIQUE(code)
);

-- Create history table for audit trail
CREATE TABLE public.gdpr_processing_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  processing_id UUID NOT NULL REFERENCES public.gdpr_processing_register(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'created', 'updated', 'archived'
  changed_fields TEXT[],
  old_values JSONB,
  new_values JSONB,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.gdpr_processing_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdpr_processing_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only super_admin and admin can access
CREATE POLICY "Super admins and admins can view processing register"
ON public.gdpr_processing_register
FOR SELECT
TO authenticated
USING (
  public.is_super_admin() OR 
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Super admins can manage processing register"
ON public.gdpr_processing_register
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins and admins can view processing history"
ON public.gdpr_processing_history
FOR SELECT
TO authenticated
USING (
  public.is_super_admin() OR 
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Super admins can insert processing history"
ON public.gdpr_processing_history
FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin());

-- Indexes for performance
CREATE INDEX idx_gdpr_processing_statut ON public.gdpr_processing_register(statut);
CREATE INDEX idx_gdpr_processing_history_processing_id ON public.gdpr_processing_history(processing_id);

-- Trigger to log changes
CREATE OR REPLACE FUNCTION public.log_gdpr_processing_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  changed TEXT[];
  action_type TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    action_type := 'created';
    INSERT INTO public.gdpr_processing_history (processing_id, action, new_values, changed_by)
    VALUES (NEW.id, action_type, to_jsonb(NEW), auth.uid());
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := CASE WHEN NEW.statut = 'archive' AND OLD.statut != 'archive' THEN 'archived' ELSE 'updated' END;
    -- Find changed fields
    SELECT ARRAY_AGG(key) INTO changed
    FROM jsonb_each(to_jsonb(NEW)) AS n(key, value)
    WHERE to_jsonb(OLD)->key IS DISTINCT FROM to_jsonb(NEW)->key;
    
    INSERT INTO public.gdpr_processing_history (processing_id, action, changed_fields, old_values, new_values, changed_by)
    VALUES (NEW.id, action_type, changed, to_jsonb(OLD), to_jsonb(NEW), auth.uid());
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER gdpr_processing_audit_trigger
AFTER INSERT OR UPDATE ON public.gdpr_processing_register
FOR EACH ROW
EXECUTE FUNCTION public.log_gdpr_processing_changes();

-- Update timestamp trigger
CREATE TRIGGER update_gdpr_processing_updated_at
BEFORE UPDATE ON public.gdpr_processing_register
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default processing activities for a CRM/LMS
INSERT INTO public.gdpr_processing_register (code, nom_traitement, description, finalites, base_legale, categories_personnes, categories_donnees, destinataires, delais_conservation, mesures_securite, responsable_traitement, source_donnees) VALUES
('TR-001', 'Gestion des inscriptions aux formations', 'Traitement des données personnelles dans le cadre de l''inscription et du suivi des apprenants aux formations professionnelles.', 'Inscription aux formations, suivi pédagogique, émission des attestations', 'Exécution du contrat de formation', ARRAY['Apprenants', 'Candidats'], ARRAY['Nom, prénom, civilité', 'Date et lieu de naissance', 'Coordonnées (email, téléphone, adresse)', 'Données professionnelles (permis, carte pro)'], ARRAY['Personnel administratif', 'Formateurs'], '5 ans après la fin de formation', ARRAY['Chiffrement TLS', 'Contrôle d''accès RBAC', 'Journalisation des accès'], 'Directeur du Centre de Formation', 'Formulaire d''inscription'),

('TR-002', 'Facturation et comptabilité', 'Traitement des données nécessaires à l''établissement des factures et au suivi comptable.', 'Émission des factures, suivi des paiements, obligations comptables', 'Obligation légale (Code du Commerce)', ARRAY['Apprenants', 'Entreprises clientes'], ARRAY['Nom, prénom', 'Adresse de facturation', 'Montants facturés', 'Historique des paiements'], ARRAY['Service comptable', 'Expert-comptable'], '10 ans (obligations légales)', ARRAY['Accès restreint', 'Sauvegardes chiffrées'], 'Responsable administratif', 'Contrat de formation'),

('TR-003', 'Gestion des examens et certifications', 'Suivi des résultats d''examens théoriques et pratiques, délivrance des attestations.', 'Évaluation des compétences, délivrance des certifications', 'Exécution du contrat, obligation légale (Qualiopi)', ARRAY['Apprenants'], ARRAY['Nom, prénom', 'Résultats d''examens', 'Notes et évaluations', 'Numéros de certificat'], ARRAY['Formateurs', 'Préfecture (pour T3P)'], '5 ans après certification', ARRAY['Accès restreint aux formateurs', 'Traçabilité des modifications'], 'Responsable pédagogique', 'Évaluations en formation'),

('TR-004', 'Enquêtes de satisfaction', 'Collecte des retours des apprenants pour améliorer la qualité des formations (Qualiopi).', 'Amélioration continue, conformité Qualiopi indicateur 32', 'Intérêt légitime', ARRAY['Apprenants'], ARRAY['Identifiant anonymisé', 'Notes de satisfaction', 'Commentaires'], ARRAY['Responsable qualité'], '3 ans', ARRAY['Anonymisation partielle', 'Accès restreint'], 'Responsable qualité', 'Formulaire post-formation'),

('TR-005', 'Gestion des réclamations', 'Traitement des réclamations et non-conformités dans le cadre de la démarche qualité.', 'Traitement des réclamations, amélioration continue (Qualiopi ind. 31)', 'Intérêt légitime', ARRAY['Apprenants', 'Entreprises'], ARRAY['Nom, prénom', 'Nature de la réclamation', 'Historique des échanges'], ARRAY['Responsable qualité', 'Direction'], '5 ans', ARRAY['Confidentialité des échanges'], 'Responsable qualité', 'Formulaire de réclamation'),

('TR-006', 'Émargement et suivi de présence', 'Enregistrement des présences pour la conformité réglementaire et la facturation OPCO/CPF.', 'Preuve de présence, justificatifs OPCO/CPF', 'Obligation légale (financement formation)', ARRAY['Apprenants'], ARRAY['Nom, prénom', 'Signatures', 'Horodatage'], ARRAY['OPCO', 'Caisse des Dépôts (CPF)'], '5 ans', ARRAY['Intégrité des signatures', 'Horodatage sécurisé'], 'Responsable administratif', 'Feuilles d''émargement'),

('TR-007', 'Plateforme e-learning (LMS)', 'Suivi de la progression pédagogique sur les modules en ligne.', 'Suivi pédagogique, adaptation du parcours', 'Exécution du contrat de formation', ARRAY['Apprenants'], ARRAY['Identifiant', 'Progression modules', 'Scores quiz', 'Temps de connexion'], ARRAY['Formateurs', 'Responsable pédagogique'], '5 ans après fin de formation', ARRAY['Authentification sécurisée', 'Journaux d''accès'], 'Responsable pédagogique', 'Plateforme LMS'),

('TR-008', 'Gestion des utilisateurs internes', 'Administration des comptes utilisateurs du personnel (admins, formateurs, secrétariat).', 'Gestion des accès, traçabilité des actions', 'Intérêt légitime', ARRAY['Personnel interne'], ARRAY['Nom, prénom, email', 'Rôle', 'Logs de connexion'], ARRAY['Administrateur système'], 'Durée du contrat + 1 an', ARRAY['Authentification forte', 'Révocation immédiate'], 'Direction', 'Embauche / contrat'),

('TR-009', 'Partenaires et prescripteurs', 'Gestion des relations avec les partenaires apporteurs d''affaires.', 'Suivi commercial, commissionnement', 'Exécution du contrat de partenariat', ARRAY['Partenaires', 'Prescripteurs'], ARRAY['Nom société', 'Contact', 'Historique apports'], ARRAY['Service commercial'], 'Durée du partenariat + 3 ans', ARRAY['Accès restreint'], 'Responsable commercial', 'Contrat de partenariat'),

('TR-010', 'Location de véhicules', 'Gestion des contrats de location de véhicules aux apprenants.', 'Gestion locative, facturation', 'Exécution du contrat de location', ARRAY['Apprenants locataires'], ARRAY['Nom, prénom', 'Permis de conduire', 'Contrat signé', 'Échéances'], ARRAY['Service administratif'], 'Durée du contrat + 5 ans', ARRAY['Conservation sécurisée des contrats'], 'Responsable administratif', 'Contrat de location');