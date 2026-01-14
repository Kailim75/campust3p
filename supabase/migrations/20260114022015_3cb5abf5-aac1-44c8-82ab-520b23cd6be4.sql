-- ============================================
-- FIX: PUBLIC_DATA_EXPOSURE & CLIENT_SIDE_AUTH
-- Restrict all tables to authenticated users only
-- ============================================

-- ============================================
-- 1. CONTACTS TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow public read access" ON public.contacts;
DROP POLICY IF EXISTS "Allow public insert access" ON public.contacts;
DROP POLICY IF EXISTS "Allow public update access" ON public.contacts;
DROP POLICY IF EXISTS "Allow public delete access" ON public.contacts;

CREATE POLICY "Authenticated users can select contacts"
ON public.contacts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert contacts"
ON public.contacts FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update contacts"
ON public.contacts FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete contacts"
ON public.contacts FOR DELETE TO authenticated USING (true);

-- ============================================
-- 2. CONTACT_DOCUMENTS TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow read access to documents" ON public.contact_documents;
DROP POLICY IF EXISTS "Allow insert access to documents" ON public.contact_documents;
DROP POLICY IF EXISTS "Allow update access to documents" ON public.contact_documents;
DROP POLICY IF EXISTS "Allow delete access to documents" ON public.contact_documents;

CREATE POLICY "Authenticated users can select contact_documents"
ON public.contact_documents FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert contact_documents"
ON public.contact_documents FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update contact_documents"
ON public.contact_documents FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete contact_documents"
ON public.contact_documents FOR DELETE TO authenticated USING (true);

-- ============================================
-- 3. CONTACT_HISTORIQUE TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow read access to historique" ON public.contact_historique;
DROP POLICY IF EXISTS "Allow insert access to historique" ON public.contact_historique;
DROP POLICY IF EXISTS "Allow update access to historique" ON public.contact_historique;
DROP POLICY IF EXISTS "Allow delete access to historique" ON public.contact_historique;

CREATE POLICY "Authenticated users can select contact_historique"
ON public.contact_historique FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert contact_historique"
ON public.contact_historique FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update contact_historique"
ON public.contact_historique FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete contact_historique"
ON public.contact_historique FOR DELETE TO authenticated USING (true);

-- ============================================
-- 4. CATALOGUE_FORMATIONS TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow read access to catalogue" ON public.catalogue_formations;
DROP POLICY IF EXISTS "Allow insert access to catalogue" ON public.catalogue_formations;
DROP POLICY IF EXISTS "Allow update access to catalogue" ON public.catalogue_formations;
DROP POLICY IF EXISTS "Allow delete access to catalogue" ON public.catalogue_formations;

CREATE POLICY "Authenticated users can select catalogue_formations"
ON public.catalogue_formations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert catalogue_formations"
ON public.catalogue_formations FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update catalogue_formations"
ON public.catalogue_formations FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete catalogue_formations"
ON public.catalogue_formations FOR DELETE TO authenticated USING (true);

-- ============================================
-- 5. DEVIS TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow read access to devis" ON public.devis;
DROP POLICY IF EXISTS "Allow insert access to devis" ON public.devis;
DROP POLICY IF EXISTS "Allow update access to devis" ON public.devis;
DROP POLICY IF EXISTS "Allow delete access to devis" ON public.devis;

CREATE POLICY "Authenticated users can select devis"
ON public.devis FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert devis"
ON public.devis FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update devis"
ON public.devis FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete devis"
ON public.devis FOR DELETE TO authenticated USING (true);

-- ============================================
-- 6. DEVIS_LIGNES TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow read access to devis_lignes" ON public.devis_lignes;
DROP POLICY IF EXISTS "Allow insert access to devis_lignes" ON public.devis_lignes;
DROP POLICY IF EXISTS "Allow update access to devis_lignes" ON public.devis_lignes;
DROP POLICY IF EXISTS "Allow delete access to devis_lignes" ON public.devis_lignes;

CREATE POLICY "Authenticated users can select devis_lignes"
ON public.devis_lignes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert devis_lignes"
ON public.devis_lignes FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update devis_lignes"
ON public.devis_lignes FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete devis_lignes"
ON public.devis_lignes FOR DELETE TO authenticated USING (true);

-- ============================================
-- 7. FACTURES TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow read access to factures" ON public.factures;
DROP POLICY IF EXISTS "Allow insert access to factures" ON public.factures;
DROP POLICY IF EXISTS "Allow update access to factures" ON public.factures;
DROP POLICY IF EXISTS "Allow delete access to factures" ON public.factures;

CREATE POLICY "Authenticated users can select factures"
ON public.factures FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert factures"
ON public.factures FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update factures"
ON public.factures FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete factures"
ON public.factures FOR DELETE TO authenticated USING (true);

-- ============================================
-- 8. FACTURE_LIGNES TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow read access to facture_lignes" ON public.facture_lignes;
DROP POLICY IF EXISTS "Allow insert access to facture_lignes" ON public.facture_lignes;
DROP POLICY IF EXISTS "Allow update access to facture_lignes" ON public.facture_lignes;
DROP POLICY IF EXISTS "Allow delete access to facture_lignes" ON public.facture_lignes;

CREATE POLICY "Authenticated users can select facture_lignes"
ON public.facture_lignes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert facture_lignes"
ON public.facture_lignes FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update facture_lignes"
ON public.facture_lignes FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete facture_lignes"
ON public.facture_lignes FOR DELETE TO authenticated USING (true);

-- ============================================
-- 9. PAIEMENTS TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow read access to paiements" ON public.paiements;
DROP POLICY IF EXISTS "Allow insert access to paiements" ON public.paiements;
DROP POLICY IF EXISTS "Allow update access to paiements" ON public.paiements;
DROP POLICY IF EXISTS "Allow delete access to paiements" ON public.paiements;

CREATE POLICY "Authenticated users can select paiements"
ON public.paiements FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert paiements"
ON public.paiements FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update paiements"
ON public.paiements FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete paiements"
ON public.paiements FOR DELETE TO authenticated USING (true);

-- ============================================
-- 10. FORMATEURS TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow read access to formateurs" ON public.formateurs;
DROP POLICY IF EXISTS "Allow insert access to formateurs" ON public.formateurs;
DROP POLICY IF EXISTS "Allow update access to formateurs" ON public.formateurs;
DROP POLICY IF EXISTS "Allow delete access to formateurs" ON public.formateurs;

CREATE POLICY "Authenticated users can select formateurs"
ON public.formateurs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert formateurs"
ON public.formateurs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update formateurs"
ON public.formateurs FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete formateurs"
ON public.formateurs FOR DELETE TO authenticated USING (true);

-- ============================================
-- 11. FORMATEUR_DOCUMENTS TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow read access to formateur_documents" ON public.formateur_documents;
DROP POLICY IF EXISTS "Allow insert access to formateur_documents" ON public.formateur_documents;
DROP POLICY IF EXISTS "Allow update access to formateur_documents" ON public.formateur_documents;
DROP POLICY IF EXISTS "Allow delete access to formateur_documents" ON public.formateur_documents;

CREATE POLICY "Authenticated users can select formateur_documents"
ON public.formateur_documents FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert formateur_documents"
ON public.formateur_documents FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update formateur_documents"
ON public.formateur_documents FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete formateur_documents"
ON public.formateur_documents FOR DELETE TO authenticated USING (true);

-- ============================================
-- 12. FORMATEUR_FACTURES TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow read access to formateur_factures" ON public.formateur_factures;
DROP POLICY IF EXISTS "Allow insert access to formateur_factures" ON public.formateur_factures;
DROP POLICY IF EXISTS "Allow update access to formateur_factures" ON public.formateur_factures;
DROP POLICY IF EXISTS "Allow delete access to formateur_factures" ON public.formateur_factures;

CREATE POLICY "Authenticated users can select formateur_factures"
ON public.formateur_factures FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert formateur_factures"
ON public.formateur_factures FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update formateur_factures"
ON public.formateur_factures FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete formateur_factures"
ON public.formateur_factures FOR DELETE TO authenticated USING (true);

-- ============================================
-- 13. DOCUMENT_TEMPLATES TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view document templates" ON public.document_templates;
DROP POLICY IF EXISTS "Users can create document templates" ON public.document_templates;
DROP POLICY IF EXISTS "Users can update document templates" ON public.document_templates;
DROP POLICY IF EXISTS "Users can delete document templates" ON public.document_templates;

CREATE POLICY "Authenticated users can select document_templates"
ON public.document_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert document_templates"
ON public.document_templates FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update document_templates"
ON public.document_templates FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete document_templates"
ON public.document_templates FOR DELETE TO authenticated USING (true);

-- ============================================
-- 14. EMAIL_TEMPLATES TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow read access to email_templates" ON public.email_templates;
DROP POLICY IF EXISTS "Allow insert access to email_templates" ON public.email_templates;
DROP POLICY IF EXISTS "Allow update access to email_templates" ON public.email_templates;
DROP POLICY IF EXISTS "Allow delete access to email_templates" ON public.email_templates;

CREATE POLICY "Authenticated users can select email_templates"
ON public.email_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert email_templates"
ON public.email_templates FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update email_templates"
ON public.email_templates FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete email_templates"
ON public.email_templates FOR DELETE TO authenticated USING (true);

-- ============================================
-- 15. SESSIONS TABLE
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can view sessions" ON public.sessions;
DROP POLICY IF EXISTS "Authenticated users can create sessions" ON public.sessions;
DROP POLICY IF EXISTS "Authenticated users can update sessions" ON public.sessions;
DROP POLICY IF EXISTS "Authenticated users can delete sessions" ON public.sessions;

CREATE POLICY "Authenticated users can select sessions"
ON public.sessions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert sessions"
ON public.sessions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update sessions"
ON public.sessions FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete sessions"
ON public.sessions FOR DELETE TO authenticated USING (true);

-- ============================================
-- 16. SESSION_INSCRIPTIONS TABLE
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can view inscriptions" ON public.session_inscriptions;
DROP POLICY IF EXISTS "Authenticated users can create inscriptions" ON public.session_inscriptions;
DROP POLICY IF EXISTS "Authenticated users can update inscriptions" ON public.session_inscriptions;
DROP POLICY IF EXISTS "Authenticated users can delete inscriptions" ON public.session_inscriptions;

CREATE POLICY "Authenticated users can select session_inscriptions"
ON public.session_inscriptions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert session_inscriptions"
ON public.session_inscriptions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update session_inscriptions"
ON public.session_inscriptions FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete session_inscriptions"
ON public.session_inscriptions FOR DELETE TO authenticated USING (true);

-- ============================================
-- 17. SIGNATURE_REQUESTS TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow read access to signature_requests" ON public.signature_requests;
DROP POLICY IF EXISTS "Allow insert access to signature_requests" ON public.signature_requests;
DROP POLICY IF EXISTS "Allow update access to signature_requests" ON public.signature_requests;
DROP POLICY IF EXISTS "Allow delete access to signature_requests" ON public.signature_requests;

CREATE POLICY "Authenticated users can select signature_requests"
ON public.signature_requests FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert signature_requests"
ON public.signature_requests FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update signature_requests"
ON public.signature_requests FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete signature_requests"
ON public.signature_requests FOR DELETE TO authenticated USING (true);