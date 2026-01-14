-- 1) Role system (separate table) to avoid "any authenticated user" access
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'staff');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER helper to avoid recursive RLS checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- user_roles policies
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Users can read own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2) Tighten all business tables to staff/admin only (instead of any authenticated user)
-- Helper expression:
-- (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))

-- catalogue_formations
ALTER TABLE public.catalogue_formations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can select catalogue_formations" ON public.catalogue_formations;
DROP POLICY IF EXISTS "Authenticated users can insert catalogue_formations" ON public.catalogue_formations;
DROP POLICY IF EXISTS "Authenticated users can update catalogue_formations" ON public.catalogue_formations;
DROP POLICY IF EXISTS "Authenticated users can delete catalogue_formations" ON public.catalogue_formations;
CREATE POLICY "Staff can select catalogue_formations" ON public.catalogue_formations FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can insert catalogue_formations" ON public.catalogue_formations FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can update catalogue_formations" ON public.catalogue_formations FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can delete catalogue_formations" ON public.catalogue_formations FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- contact_documents
ALTER TABLE public.contact_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can select contact_documents" ON public.contact_documents;
DROP POLICY IF EXISTS "Authenticated users can insert contact_documents" ON public.contact_documents;
DROP POLICY IF EXISTS "Authenticated users can update contact_documents" ON public.contact_documents;
DROP POLICY IF EXISTS "Authenticated users can delete contact_documents" ON public.contact_documents;
CREATE POLICY "Staff can select contact_documents" ON public.contact_documents FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can insert contact_documents" ON public.contact_documents FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can update contact_documents" ON public.contact_documents FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can delete contact_documents" ON public.contact_documents FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- contact_historique
ALTER TABLE public.contact_historique ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can select contact_historique" ON public.contact_historique;
DROP POLICY IF EXISTS "Authenticated users can insert contact_historique" ON public.contact_historique;
DROP POLICY IF EXISTS "Authenticated users can update contact_historique" ON public.contact_historique;
DROP POLICY IF EXISTS "Authenticated users can delete contact_historique" ON public.contact_historique;
CREATE POLICY "Staff can select contact_historique" ON public.contact_historique FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can insert contact_historique" ON public.contact_historique FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can update contact_historique" ON public.contact_historique FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can delete contact_historique" ON public.contact_historique FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- contacts
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can select contacts" ON public.contacts;
DROP POLICY IF EXISTS "Authenticated users can insert contacts" ON public.contacts;
DROP POLICY IF EXISTS "Authenticated users can update contacts" ON public.contacts;
DROP POLICY IF EXISTS "Authenticated users can delete contacts" ON public.contacts;
CREATE POLICY "Staff can select contacts" ON public.contacts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can insert contacts" ON public.contacts FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can update contacts" ON public.contacts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can delete contacts" ON public.contacts FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- devis
ALTER TABLE public.devis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can select devis" ON public.devis;
DROP POLICY IF EXISTS "Authenticated users can insert devis" ON public.devis;
DROP POLICY IF EXISTS "Authenticated users can update devis" ON public.devis;
DROP POLICY IF EXISTS "Authenticated users can delete devis" ON public.devis;
CREATE POLICY "Staff can select devis" ON public.devis FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can insert devis" ON public.devis FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can update devis" ON public.devis FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can delete devis" ON public.devis FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- devis_lignes
ALTER TABLE public.devis_lignes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can select devis_lignes" ON public.devis_lignes;
DROP POLICY IF EXISTS "Authenticated users can insert devis_lignes" ON public.devis_lignes;
DROP POLICY IF EXISTS "Authenticated users can update devis_lignes" ON public.devis_lignes;
DROP POLICY IF EXISTS "Authenticated users can delete devis_lignes" ON public.devis_lignes;
CREATE POLICY "Staff can select devis_lignes" ON public.devis_lignes FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can insert devis_lignes" ON public.devis_lignes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can update devis_lignes" ON public.devis_lignes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can delete devis_lignes" ON public.devis_lignes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- document_templates
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can select document_templates" ON public.document_templates;
DROP POLICY IF EXISTS "Authenticated users can insert document_templates" ON public.document_templates;
DROP POLICY IF EXISTS "Authenticated users can update document_templates" ON public.document_templates;
DROP POLICY IF EXISTS "Authenticated users can delete document_templates" ON public.document_templates;
CREATE POLICY "Staff can select document_templates" ON public.document_templates FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can insert document_templates" ON public.document_templates FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can update document_templates" ON public.document_templates FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can delete document_templates" ON public.document_templates FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- email_templates
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can select email_templates" ON public.email_templates;
DROP POLICY IF EXISTS "Authenticated users can insert email_templates" ON public.email_templates;
DROP POLICY IF EXISTS "Authenticated users can update email_templates" ON public.email_templates;
DROP POLICY IF EXISTS "Authenticated users can delete email_templates" ON public.email_templates;
CREATE POLICY "Staff can select email_templates" ON public.email_templates FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can insert email_templates" ON public.email_templates FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can update email_templates" ON public.email_templates FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can delete email_templates" ON public.email_templates FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- facture_lignes
ALTER TABLE public.facture_lignes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can select facture_lignes" ON public.facture_lignes;
DROP POLICY IF EXISTS "Authenticated users can insert facture_lignes" ON public.facture_lignes;
DROP POLICY IF EXISTS "Authenticated users can update facture_lignes" ON public.facture_lignes;
DROP POLICY IF EXISTS "Authenticated users can delete facture_lignes" ON public.facture_lignes;
CREATE POLICY "Staff can select facture_lignes" ON public.facture_lignes FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can insert facture_lignes" ON public.facture_lignes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can update facture_lignes" ON public.facture_lignes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can delete facture_lignes" ON public.facture_lignes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- factures
ALTER TABLE public.factures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can select factures" ON public.factures;
DROP POLICY IF EXISTS "Authenticated users can insert factures" ON public.factures;
DROP POLICY IF EXISTS "Authenticated users can update factures" ON public.factures;
DROP POLICY IF EXISTS "Authenticated users can delete factures" ON public.factures;
CREATE POLICY "Staff can select factures" ON public.factures FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can insert factures" ON public.factures FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can update factures" ON public.factures FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can delete factures" ON public.factures FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- formateur_documents
ALTER TABLE public.formateur_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can select formateur_documents" ON public.formateur_documents;
DROP POLICY IF EXISTS "Authenticated users can insert formateur_documents" ON public.formateur_documents;
DROP POLICY IF EXISTS "Authenticated users can update formateur_documents" ON public.formateur_documents;
DROP POLICY IF EXISTS "Authenticated users can delete formateur_documents" ON public.formateur_documents;
CREATE POLICY "Staff can select formateur_documents" ON public.formateur_documents FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can insert formateur_documents" ON public.formateur_documents FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can update formateur_documents" ON public.formateur_documents FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can delete formateur_documents" ON public.formateur_documents FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- formateur_factures
ALTER TABLE public.formateur_factures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can select formateur_factures" ON public.formateur_factures;
DROP POLICY IF EXISTS "Authenticated users can insert formateur_factures" ON public.formateur_factures;
DROP POLICY IF EXISTS "Authenticated users can update formateur_factures" ON public.formateur_factures;
DROP POLICY IF EXISTS "Authenticated users can delete formateur_factures" ON public.formateur_factures;
CREATE POLICY "Staff can select formateur_factures" ON public.formateur_factures FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can insert formateur_factures" ON public.formateur_factures FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can update formateur_factures" ON public.formateur_factures FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can delete formateur_factures" ON public.formateur_factures FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- formateurs
ALTER TABLE public.formateurs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can select formateurs" ON public.formateurs;
DROP POLICY IF EXISTS "Authenticated users can insert formateurs" ON public.formateurs;
DROP POLICY IF EXISTS "Authenticated users can update formateurs" ON public.formateurs;
DROP POLICY IF EXISTS "Authenticated users can delete formateurs" ON public.formateurs;
CREATE POLICY "Staff can select formateurs" ON public.formateurs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can insert formateurs" ON public.formateurs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can update formateurs" ON public.formateurs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can delete formateurs" ON public.formateurs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- paiements
ALTER TABLE public.paiements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can select paiements" ON public.paiements;
DROP POLICY IF EXISTS "Authenticated users can insert paiements" ON public.paiements;
DROP POLICY IF EXISTS "Authenticated users can update paiements" ON public.paiements;
DROP POLICY IF EXISTS "Authenticated users can delete paiements" ON public.paiements;
CREATE POLICY "Staff can select paiements" ON public.paiements FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can insert paiements" ON public.paiements FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can update paiements" ON public.paiements FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can delete paiements" ON public.paiements FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- session_inscriptions
ALTER TABLE public.session_inscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can select session_inscriptions" ON public.session_inscriptions;
DROP POLICY IF EXISTS "Authenticated users can insert session_inscriptions" ON public.session_inscriptions;
DROP POLICY IF EXISTS "Authenticated users can update session_inscriptions" ON public.session_inscriptions;
DROP POLICY IF EXISTS "Authenticated users can delete session_inscriptions" ON public.session_inscriptions;
CREATE POLICY "Staff can select session_inscriptions" ON public.session_inscriptions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can insert session_inscriptions" ON public.session_inscriptions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can update session_inscriptions" ON public.session_inscriptions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can delete session_inscriptions" ON public.session_inscriptions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- sessions
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can select sessions" ON public.sessions;
DROP POLICY IF EXISTS "Authenticated users can insert sessions" ON public.sessions;
DROP POLICY IF EXISTS "Authenticated users can update sessions" ON public.sessions;
DROP POLICY IF EXISTS "Authenticated users can delete sessions" ON public.sessions;
CREATE POLICY "Staff can select sessions" ON public.sessions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can insert sessions" ON public.sessions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can update sessions" ON public.sessions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can delete sessions" ON public.sessions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- signature_requests
ALTER TABLE public.signature_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can select signature_requests" ON public.signature_requests;
DROP POLICY IF EXISTS "Authenticated users can insert signature_requests" ON public.signature_requests;
DROP POLICY IF EXISTS "Authenticated users can update signature_requests" ON public.signature_requests;
DROP POLICY IF EXISTS "Authenticated users can delete signature_requests" ON public.signature_requests;
CREATE POLICY "Staff can select signature_requests" ON public.signature_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can insert signature_requests" ON public.signature_requests FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can update signature_requests" ON public.signature_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can delete signature_requests" ON public.signature_requests FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
