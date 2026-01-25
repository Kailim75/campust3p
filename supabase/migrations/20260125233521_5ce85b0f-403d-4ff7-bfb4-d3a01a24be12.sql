-- Add document type to security_charters to support multiple legal documents
ALTER TABLE public.security_charters 
ADD COLUMN IF NOT EXISTS document_type TEXT NOT NULL DEFAULT 'security_charter';

-- Create index for faster lookups by type
CREATE INDEX IF NOT EXISTS idx_security_charters_document_type 
ON public.security_charters(document_type, status);

-- Update existing RPC to be type-aware
CREATE OR REPLACE FUNCTION public.has_accepted_current_document(p_document_type TEXT DEFAULT 'security_charter')
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.charter_acceptances ca
    JOIN public.security_charters sc ON sc.id = ca.charter_id
    WHERE ca.user_id = auth.uid()
      AND sc.status = 'active'
      AND sc.document_type = p_document_type
  );
$$;

-- Get active document by type
CREATE OR REPLACE FUNCTION public.get_active_document(p_document_type TEXT DEFAULT 'security_charter')
RETURNS TABLE(id uuid, titre text, contenu text, version integer, roles_requis text[], activated_at timestamp with time zone, document_type text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id, titre, contenu, version, roles_requis, activated_at, document_type
  FROM public.security_charters
  WHERE status = 'active'
    AND security_charters.document_type = p_document_type
  ORDER BY activated_at DESC
  LIMIT 1;
$$;

-- Check all required documents are accepted
CREATE OR REPLACE FUNCTION public.get_pending_documents()
RETURNS TABLE(id uuid, titre text, contenu text, version integer, document_type text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT sc.id, sc.titre, sc.contenu, sc.version, sc.document_type
  FROM public.security_charters sc
  WHERE sc.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM public.charter_acceptances ca
      WHERE ca.charter_id = sc.id
        AND ca.user_id = auth.uid()
    )
  ORDER BY 
    CASE sc.document_type 
      WHEN 'privacy_policy' THEN 1 
      WHEN 'security_charter' THEN 2 
      ELSE 3 
    END;
$$;

-- Insert default Privacy Policy (RGPD compliant for SaaS CRM/LMS)
INSERT INTO public.security_charters (titre, contenu, version, roles_requis, status, activated_at, document_type)
VALUES (
  'Politique de Confidentialité RGPD',
  E'# Politique de Confidentialité

## Préambule

La présente Politique de Confidentialité décrit comment **CampusT3P** (ci-après « nous », « notre » ou « la Plateforme ») collecte, utilise, stocke et protège vos données personnelles conformément au Règlement Général sur la Protection des Données (RGPD - UE 2016/679).

---

## Article 1 - Responsable du Traitement

Le responsable du traitement des données personnelles est le Centre de Formation utilisant la plateforme CampusT3P. Pour toute question relative à vos données, contactez votre centre de formation ou notre Délégué à la Protection des Données (DPO).

---

## Article 2 - Données Collectées

Nous collectons les catégories de données suivantes :

### 2.1 Données d''identification
- Nom, prénom, civilité
- Date et lieu de naissance
- Adresse postale, email, téléphone

### 2.2 Données professionnelles
- Numéro de permis de conduire
- Numéro de carte professionnelle
- Historique de formation

### 2.3 Données de connexion
- Adresse IP
- Logs de connexion
- Données de navigation

### 2.4 Données pédagogiques
- Résultats d''évaluations et examens
- Progression dans les modules
- Temps de formation

---

## Article 3 - Finalités du Traitement

Vos données sont traitées pour :

1. **Gestion administrative** : inscription, facturation, suivi des formations
2. **Obligations légales** : conformité Qualiopi, déclarations préfectorales
3. **Amélioration des services** : statistiques anonymisées, qualité pédagogique
4. **Communication** : convocations, résultats, informations importantes

---

## Article 4 - Base Légale

Les traitements sont fondés sur :
- L''**exécution du contrat** de formation
- Le **consentement** pour les communications marketing
- Les **obligations légales** (Qualiopi, Code du Travail)
- L''**intérêt légitime** pour l''amélioration des services

---

## Article 5 - Durée de Conservation

| Type de données | Durée de conservation |
|----------------|----------------------|
| Données de formation | 5 ans après la fin de formation |
| Documents comptables | 10 ans |
| Données de connexion | 1 an |
| Données anonymisées | Illimitée |

---

## Article 6 - Vos Droits

Conformément au RGPD, vous disposez des droits suivants :

- **Droit d''accès** : obtenir une copie de vos données
- **Droit de rectification** : corriger des données inexactes
- **Droit à l''effacement** : demander la suppression de vos données
- **Droit à la portabilité** : récupérer vos données dans un format standard
- **Droit d''opposition** : vous opposer à certains traitements
- **Droit à la limitation** : restreindre le traitement

Pour exercer ces droits, contactez votre centre de formation ou utilisez la section RGPD de votre espace personnel.

---

## Article 7 - Sécurité des Données

Nous mettons en œuvre les mesures suivantes :
- Chiffrement des données en transit (TLS 1.3)
- Chiffrement au repos des données sensibles
- Contrôle d''accès basé sur les rôles (RBAC)
- Journalisation des accès
- Sauvegardes régulières

---

## Article 8 - Sous-traitants

Nos sous-traitants techniques :
- **Hébergement** : Infrastructure cloud sécurisée (certifiée ISO 27001)
- **Emails** : Service d''envoi transactionnel

Tous nos sous-traitants sont soumis à des clauses contractuelles conformes au RGPD.

---

## Article 9 - Transferts Hors UE

En cas de transfert de données hors de l''Union Européenne, nous nous assurons de l''existence de garanties appropriées (Clauses Contractuelles Types, décision d''adéquation).

---

## Article 10 - Cookies

La plateforme utilise uniquement des cookies techniques essentiels au fonctionnement du service. Aucun cookie de traçage publicitaire n''est utilisé.

---

## Article 11 - Réclamations

Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la CNIL (Commission Nationale de l''Informatique et des Libertés) : www.cnil.fr

---

## Article 12 - Modifications

Cette politique peut être modifiée. En cas de changement substantiel, vous serez informé(e) et invité(e) à accepter la nouvelle version.

---

**Dernière mise à jour** : Janvier 2026  
**Version** : 1.0',
  1,
  ARRAY['admin', 'staff', 'formateur', 'secretariat'],
  'active',
  now(),
  'privacy_policy'
);