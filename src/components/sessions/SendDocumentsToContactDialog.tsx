import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, 
  Mail, 
  FileText, 
  Send, 
  Award,
  BookOpen,
  ScrollText,
  FileCheck,
  Upload,
  File,
  FileSignature
} from 'lucide-react';
import { useDocumentGenerator, type DocumentType } from '@/hooks/useDocumentGenerator';
import {
  generateConventionPDF,
  generateContratFormationPDF,
  type ContactInfo as PdfContactInfo,
  type SessionInfo as PdfSessionInfo,
  type CompanyInfo,
  type AgrementsAutre,
} from '@/lib/pdf-generator';
import { generateReglementInterieurPDF, generateCGVPDF, type ConventionCompanyInfo } from '@/lib/convention-pdf-generator';
import { useCreateDocumentEnvoi } from '@/hooks/useDocumentEnvois';
import { useDocumentTemplateFiles, downloadTemplateFile } from '@/hooks/useDocumentTemplateFiles';
import { useDocumentTemplates, replaceVariables } from '@/hooks/useDocumentTemplates';
import { useCentreFormation } from '@/hooks/useCentreFormation';
import { useCreateSignatureRequest } from '@/hooks/useSignatures';
import { useSendSignatureEmail } from '@/hooks/useSendSignatureEmail';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { buildVariableData, processDocxWithVariables } from '@/lib/docx-processor';
import { fetchContactDocumentData } from '@/lib/documents/fetchContactDocumentData';

interface Contact {
  id: string;
  nom: string;
  prenom: string;
  email?: string | null;
  telephone?: string | null;
  civilite?: string | null;
  rue?: string | null;
  code_postal?: string | null;
  ville?: string | null;
  date_naissance?: string | null;
  ville_naissance?: string | null;
  pays_naissance?: string | null;
  numero_permis?: string | null;
  prefecture_permis?: string | null;
  date_delivrance_permis?: string | null;
  numero_carte_professionnelle?: string | null;
  prefecture_carte?: string | null;
  date_expiration_carte?: string | null;
  formation?: string | null;
}

interface SessionInfo {
  id: string;
  nom: string;
  formation_type: string;
  date_debut: string;
  date_fin: string;
  lieu?: string | null;
  adresse_rue?: string | null;
  adresse_code_postal?: string | null;
  adresse_ville?: string | null;
  duree_heures?: number;
  prix?: number;
  heure_debut?: string | null;
  heure_fin?: string | null;
  heure_debut_matin?: string | null;
  heure_fin_matin?: string | null;
  heure_debut_aprem?: string | null;
  heure_fin_aprem?: string | null;
  formateur?: string | null;
  objectifs?: string | null;
  prerequis?: string | null;
  places_totales?: number | null;
  tva_percent?: number | null;
}

interface SendDocumentsToContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact;
  sessionInfo: SessionInfo;
}

const DOCUMENT_OPTIONS = [
  { id: 'convocation', label: 'Convocation', icon: Send },
  { id: 'convention', label: 'Convention de formation', icon: FileText },
  { id: 'contrat', label: 'Contrat de formation', icon: FileCheck },
  { id: 'attestation', label: 'Attestation de formation', icon: Award },
  { id: 'programme', label: 'Programme de formation', icon: BookOpen },
  { id: 'reglement', label: 'Règlement intérieur', icon: ScrollText },
  { id: 'cgv', label: 'Conditions générales de vente', icon: FileCheck },
] as const;

export function SendDocumentsToContactDialog({
  open,
  onOpenChange,
  contact,
  sessionInfo,
}: SendDocumentsToContactDialogProps) {
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [selectedTemplateFiles, setSelectedTemplateFiles] = useState<string[]>([]);
  const [selectedTextTemplates, setSelectedTextTemplates] = useState<string[]>([]);
  const [sendEmail, setSendEmail] = useState(true);
  const [requestSignature, setRequestSignature] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('standard');

  const { generateDocument } = useDocumentGenerator();
  const createEnvoi = useCreateDocumentEnvoi();
  const { centreFormation } = useCentreFormation();
  const createSignatureRequest = useCreateSignatureRequest();
  const sendSignatureEmail = useSendSignatureEmail();
  
  // Fetch custom templates
  const { data: templateFiles = [] } = useDocumentTemplateFiles();
  const { data: textTemplates = [] } = useDocumentTemplates();

  // Filter active templates
  const activeTemplateFiles = useMemo(
    () => templateFiles.filter(t => t.actif),
    [templateFiles]
  );
  
  const activeTextTemplates = useMemo(
    () => textTemplates.filter(t => t.actif),
    [textTemplates]
  );

  const hasEmail = !!contact.email;

  const toggleDocument = (docId: string) => {
    setSelectedDocuments(prev =>
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const toggleTemplateFile = (id: string) => {
    setSelectedTemplateFiles(prev =>
      prev.includes(id)
        ? prev.filter(tid => tid !== id)
        : [...prev, id]
    );
  };

  const toggleTextTemplate = (id: string) => {
    setSelectedTextTemplates(prev =>
      prev.includes(id)
        ? prev.filter(tid => tid !== id)
        : [...prev, id]
    );
  };

  // Build contact data for variable replacement
  const contactData = useMemo(() => ({
    civilite: contact.civilite || '',
    nom: contact.nom,
    prenom: contact.prenom,
    email: contact.email || '',
    telephone: contact.telephone || '',
    rue: contact.rue || '',
    code_postal: contact.code_postal || '',
    ville: contact.ville || '',
    date_naissance: contact.date_naissance || '',
    ville_naissance: contact.ville_naissance || '',
    pays_naissance: contact.pays_naissance || '',
    numero_permis: contact.numero_permis || '',
    prefecture_permis: contact.prefecture_permis || '',
    date_delivrance_permis: contact.date_delivrance_permis || '',
    numero_carte_professionnelle: contact.numero_carte_professionnelle || '',
    prefecture_carte: contact.prefecture_carte || '',
    date_expiration_carte: contact.date_expiration_carte || '',
    formation: contact.formation || sessionInfo.formation_type || '',
  }), [contact, sessionInfo.formation_type]);

  // Build session data for variable replacement
  const sessionData = useMemo(() => ({
    nom: sessionInfo.nom,
    numero_session: sessionInfo.id.slice(0, 8).toUpperCase(),
    date_debut: sessionInfo.date_debut,
    date_fin: sessionInfo.date_fin,
    heure_debut: sessionInfo.heure_debut || '',
    heure_fin: sessionInfo.heure_fin || '',
    lieu: sessionInfo.lieu || '',
    adresse_rue: sessionInfo.adresse_rue || '',
    adresse_code_postal: sessionInfo.adresse_code_postal || '',
    adresse_ville: sessionInfo.adresse_ville || '',
    formateur: sessionInfo.formateur || '',
    prix_ht: sessionInfo.prix?.toString() || '',
    tva_percent: sessionInfo.tva_percent?.toString() || '0',
    duree_heures: sessionInfo.duree_heures?.toString() || '',
    places_totales: sessionInfo.places_totales?.toString() || '',
    objectifs: sessionInfo.objectifs || '',
    prerequis: sessionInfo.prerequis || '',
  }), [sessionInfo]);

  // Generate PDF from text template
  const generatePdfFromTextTemplate = (template: { nom: string; contenu: string }) => {
    const processedContent = replaceVariables(template.contenu, contactData, sessionData);
    
    // Create PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;
    
    doc.setFontSize(16);
    doc.text(template.nom, pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(processedContent.replace(/<[^>]*>/g, ''), maxWidth);
    doc.text(lines, margin, 35);
    
    return doc;
  };

  const handleSend = async () => {
    const totalSelected = selectedDocuments.length + selectedTemplateFiles.length + selectedTextTemplates.length;
    
    if (totalSelected === 0) {
      toast.error('Sélectionnez au moins un document');
      return;
    }

    setIsSending(true);

    try {
      // 1. Generate standard documents
      for (const docType of selectedDocuments) {
        const contactInfo = {
          id: contact.id, // Nécessaire pour générer le numéro de certificat
          civilite: contact.civilite || undefined,
          nom: contact.nom,
          prenom: contact.prenom,
          email: contact.email || undefined,
          telephone: contact.telephone || undefined,
          rue: contact.rue || undefined,
          code_postal: contact.code_postal || undefined,
          ville: contact.ville || undefined,
          date_naissance: contact.date_naissance || undefined,
          ville_naissance: contact.ville_naissance || undefined,
          pays_naissance: contact.pays_naissance || undefined,
          numero_carte_professionnelle: contact.numero_carte_professionnelle || undefined,
          prefecture_carte: contact.prefecture_carte || undefined,
          date_expiration_carte: contact.date_expiration_carte || undefined,
          numero_permis: contact.numero_permis || undefined,
          prefecture_permis: contact.prefecture_permis || undefined,
          date_delivrance_permis: contact.date_delivrance_permis || undefined,
          formation: contact.formation || undefined,
        };

        const sessionDataForDoc = {
          id: sessionInfo.id,
          nom: sessionInfo.nom,
          formation_type: sessionInfo.formation_type,
          date_debut: sessionInfo.date_debut,
          date_fin: sessionInfo.date_fin,
          lieu: sessionInfo.lieu || undefined,
          duree_heures: sessionInfo.duree_heures || 35,
          prix: sessionInfo.prix,
          heure_debut: sessionInfo.heure_debut || undefined,
          heure_fin: sessionInfo.heure_fin || undefined,
          heure_debut_matin: sessionInfo.heure_debut_matin || undefined,
          heure_fin_matin: sessionInfo.heure_fin_matin || undefined,
          heure_debut_aprem: sessionInfo.heure_debut_aprem || undefined,
          heure_fin_aprem: sessionInfo.heure_fin_aprem || undefined,
          formateur: sessionInfo.formateur || undefined,
        };

        if (['convocation', 'convention', 'contrat', 'attestation', 'programme'].includes(docType)) {
          generateDocument(docType as DocumentType, contactInfo, sessionDataForDoc);
        }

        await createEnvoi.mutateAsync({
          contact_id: contact.id,
          session_id: sessionInfo.id,
          document_type: docType,
          document_name: `${DOCUMENT_OPTIONS.find(d => d.id === docType)?.label} - ${contact.prenom} ${contact.nom}`,
          statut: sendEmail && hasEmail ? 'envoyé' : 'généré',
        });
      }

      // 2. Generate text template documents
      for (const templateId of selectedTextTemplates) {
        const template = activeTextTemplates.find(t => t.id === templateId);
        if (!template) continue;

        const doc = generatePdfFromTextTemplate(template);
        doc.save(`${template.nom}-${contact.nom}-${contact.prenom}.pdf`);

        await createEnvoi.mutateAsync({
          contact_id: contact.id,
          session_id: sessionInfo.id,
          document_type: 'template_texte',
          document_name: `${template.nom} - ${contact.prenom} ${contact.nom}`,
          statut: sendEmail && hasEmail ? 'envoyé' : 'généré',
          metadata: { template_id: templateId, template_type: 'text' },
        });
      }

      // 3. Download file templates (with DOCX variable replacement)
      for (const templateId of selectedTemplateFiles) {
        const template = activeTemplateFiles.find(t => t.id === templateId);
        if (!template) continue;

        // For DOCX files, process with variable replacement
        if (template.type_fichier === 'docx') {
          try {
            let fullContact: any = contact;
            try {
              fullContact = await fetchContactDocumentData(contact.id, sessionInfo.formation_type);
            } catch (e) {
              console.warn('[DOCX] Contact partiel (fallback)', e);
            }

            // Download the template file
            const { data: templateBlob, error: downloadError } = await supabase.storage
              .from('document-templates')
              .download(template.file_path);

            if (downloadError || !templateBlob) {
              console.error('Erreur téléchargement template:', downloadError);
              toast.error(`Erreur téléchargement ${template.nom}`);
              continue;
            }

            // Build variable data for DOCX processing
            const variableData = buildVariableData(
              {
                civilite: fullContact.civilite || undefined,
                nom: fullContact.nom ?? contact.nom,
                prenom: fullContact.prenom ?? contact.prenom,
                email: fullContact.email || undefined,
                telephone: fullContact.telephone || undefined,
                rue: fullContact.rue || undefined,
                code_postal: fullContact.code_postal || undefined,
                ville: fullContact.ville || undefined,
                date_naissance: fullContact.date_naissance || undefined,
                ville_naissance: fullContact.ville_naissance || undefined,
                pays_naissance: fullContact.pays_naissance || undefined,
                numero_permis: fullContact.numero_permis || undefined,
                prefecture_permis: fullContact.prefecture_permis || undefined,
                date_delivrance_permis: fullContact.date_delivrance_permis || undefined,
                numero_carte_professionnelle: fullContact.numero_carte_professionnelle || undefined,
                prefecture_carte: fullContact.prefecture_carte || undefined,
                date_expiration_carte: fullContact.date_expiration_carte || undefined,
                formation:
                  fullContact.formation || contact.formation || sessionInfo.formation_type || undefined,
              },
              {
                nom: sessionInfo.nom,
                date_debut: sessionInfo.date_debut,
                date_fin: sessionInfo.date_fin,
                lieu: sessionInfo.lieu || undefined,
                heure_debut: sessionInfo.heure_debut || undefined,
                heure_fin: sessionInfo.heure_fin || undefined,
                formation_type: sessionInfo.formation_type,
                duree_heures: sessionInfo.duree_heures,
                formateur: sessionInfo.formateur || undefined,
              },
              centreFormation ? {
                nom: centreFormation.nom_commercial || centreFormation.nom_legal,
                adresse: centreFormation.adresse_complete,
                telephone: centreFormation.telephone,
                email: centreFormation.email,
                siret: centreFormation.siret,
                nda: centreFormation.nda,
              } : undefined
            );

            // Process the DOCX with variable replacement
            const processedBlob = await processDocxWithVariables(templateBlob, variableData);
            
            // Download the processed file
            const url = URL.createObjectURL(processedBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${template.nom}-${contact.nom}-${contact.prenom}.docx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          } catch (error) {
            console.error('Erreur traitement DOCX:', error);
            toast.error(`Erreur traitement ${template.nom}`);
            continue;
          }
        } else {
          // For non-DOCX files (PDF), download directly
          await downloadTemplateFile(
            template.file_path, 
            `${template.nom}-${contact.nom}-${contact.prenom}.${template.type_fichier}`
          );
        }

        await createEnvoi.mutateAsync({
          contact_id: contact.id,
          session_id: sessionInfo.id,
          document_type: 'template_fichier',
          document_name: `${template.nom} - ${contact.prenom} ${contact.nom}`,
          statut: sendEmail && hasEmail ? 'envoyé' : 'généré',
          metadata: { template_id: templateId, template_type: 'file' },
        });
      }

      // 4. Send email if requested
      if (sendEmail && hasEmail) {
        const { error } = await supabase.functions.invoke('send-automated-emails', {
          body: {
            type: 'bulk_document',
            recipients: [{
              email: contact.email,
              name: `${contact.prenom} ${contact.nom}`,
              contactId: contact.id,
            }],
            documentTypes: [
              ...selectedDocuments,
              ...selectedTextTemplates.map(id => `template:${id}`),
              ...selectedTemplateFiles.map(id => `file:${id}`),
            ],
            sessionName: sessionInfo.nom,
            sessionInfo: {
              formation_type: sessionInfo.formation_type,
              date_debut: sessionInfo.date_debut,
              date_fin: sessionInfo.date_fin,
              lieu: sessionInfo.lieu,
              heure_debut: sessionInfo.heure_debut,
              heure_fin: sessionInfo.heure_fin,
              heure_debut_matin: sessionInfo.heure_debut_matin,
              heure_fin_matin: sessionInfo.heure_fin_matin,
              heure_debut_aprem: sessionInfo.heure_debut_aprem,
              heure_fin_aprem: sessionInfo.heure_fin_aprem,
              duree_heures: sessionInfo.duree_heures,
              formateur: sessionInfo.formateur || undefined,
            },
            customMessage: customMessage || undefined,
          },
        });

        if (error) {
          console.error('Erreur envoi email:', error);
          toast.warning('Documents générés mais erreur lors de l\'envoi par email');
        } else {
          toast.success(`${totalSelected} document(s) envoyé(s) à ${contact.prenom} ${contact.nom}`);
        }
      } else {
        toast.success(`${totalSelected} document(s) généré(s) pour ${contact.prenom} ${contact.nom}`);
      }

      // 5. Create signature requests if requested
      if (requestSignature && hasEmail) {
        const signableDocTypes = selectedDocuments.filter(d => 
          ['contrat', 'convention', 'reglement', 'cgv'].includes(d)
        );
        
        const docLabels: Record<string, string> = {
          contrat: 'Contrat de formation',
          convention: 'Convention de formation', 
          reglement: 'Règlement intérieur',
          cgv: 'Conditions générales de vente',
        };

        // Build company info for PDF generation
        let companyInfo: CompanyInfo | undefined;
        if (centreFormation) {
          let agrements_autres: AgrementsAutre[] = [];
          const rawAgrements = centreFormation.agrements_autres as unknown;
          if (Array.isArray(rawAgrements)) {
            agrements_autres = rawAgrements
              .filter((a: any): a is AgrementsAutre => !!a && typeof a === "object")
              .map((a: any) => ({
                nom: String(a.nom ?? ""),
                numero: String(a.numero ?? ""),
                date_obtention: a.date_obtention ?? undefined,
                date_expiration: a.date_expiration ?? undefined,
              }))
              .filter((a) => a.nom.trim() !== "" && a.numero.trim() !== "");
          }
          companyInfo = {
            name: centreFormation.nom_commercial || centreFormation.nom_legal,
            address: centreFormation.adresse_complete,
            phone: centreFormation.telephone,
            email: centreFormation.email,
            siret: centreFormation.siret,
            nda: centreFormation.nda,
            logo_url: centreFormation.logo_url || undefined,
            signature_cachet_url: centreFormation.signature_cachet_url || undefined,
            qualiopi_numero: centreFormation.qualiopi_numero || undefined,
            qualiopi_date_obtention: centreFormation.qualiopi_date_obtention || undefined,
            qualiopi_date_expiration: centreFormation.qualiopi_date_expiration || undefined,
            agrement_prefecture: centreFormation.agrement_prefecture || undefined,
            agrement_prefecture_date: centreFormation.agrement_prefecture_date || undefined,
            agrements_autres: agrements_autres.length > 0 ? agrements_autres : undefined,
          };
        }

        const pdfContact: PdfContactInfo = {
          nom: contact.nom,
          prenom: contact.prenom,
          email: contact.email || undefined,
          telephone: contact.telephone || undefined,
          rue: contact.rue || undefined,
          code_postal: contact.code_postal || undefined,
          ville: contact.ville || undefined,
          date_naissance: contact.date_naissance || undefined,
        };

        const pdfSession: PdfSessionInfo = {
          nom: sessionInfo.nom,
          formation_type: sessionInfo.formation_type,
          date_debut: sessionInfo.date_debut,
          date_fin: sessionInfo.date_fin,
          lieu: sessionInfo.lieu || undefined,
          duree_heures: sessionInfo.duree_heures || 35,
          prix: sessionInfo.prix,
          heure_debut: sessionInfo.heure_debut || undefined,
          heure_fin: sessionInfo.heure_fin || undefined,
          heure_debut_matin: sessionInfo.heure_debut_matin || undefined,
          heure_fin_matin: sessionInfo.heure_fin_matin || undefined,
          heure_debut_aprem: sessionInfo.heure_debut_aprem || undefined,
          heure_fin_aprem: sessionInfo.heure_fin_aprem || undefined,
        };

        let signaturesCreated = 0;
        for (const docType of signableDocTypes) {
          try {
            // Generate PDF for this document type
            let pdfDoc: jsPDF | null = null;
            try {
              if (docType === 'convention' && companyInfo) {
                pdfDoc = generateConventionPDF(pdfContact, pdfSession, companyInfo);
              } else if (docType === 'contrat' && companyInfo) {
                pdfDoc = generateContratFormationPDF(pdfContact, pdfSession, companyInfo);
              } else if (docType === 'reglement') {
                const convCompany: ConventionCompanyInfo | undefined = companyInfo ? {
                  name: companyInfo.name,
                  address: companyInfo.address,
                  phone: companyInfo.phone,
                  email: companyInfo.email,
                  siret: companyInfo.siret,
                  nda: companyInfo.nda,
                  qualiopi_numero: companyInfo.qualiopi_numero,
                  agrement_prefecture: companyInfo.agrement_prefecture,
                } : undefined;
                pdfDoc = generateReglementInterieurPDF(convCompany);
              } else if (docType === 'cgv') {
                const convCompany: ConventionCompanyInfo | undefined = companyInfo ? {
                  name: companyInfo.name,
                  address: companyInfo.address,
                  phone: companyInfo.phone,
                  email: companyInfo.email,
                  siret: companyInfo.siret,
                  nda: companyInfo.nda,
                  qualiopi_numero: companyInfo.qualiopi_numero,
                  agrement_prefecture: companyInfo.agrement_prefecture,
                } : undefined;
                pdfDoc = generateCGVPDF(convCompany);
              }
            } catch (pdfErr) {
              console.warn(`Erreur génération PDF pour ${docType}:`, pdfErr);
            }

            // Upload PDF to storage if generated
            let documentUrl: string | undefined;
            if (pdfDoc) {
              try {
                const pdfBlob = pdfDoc.output('blob');
                const filePath = `signatures/${contact.id}/${docType}-${Date.now()}.pdf`;
                const { error: uploadError } = await supabase.storage
                  .from('generated-documents')
                  .upload(filePath, pdfBlob, { contentType: 'application/pdf' });
                
                if (!uploadError) {
                  const { data: signedUrlData } = await supabase.storage
                    .from('generated-documents')
                    .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year
                  documentUrl = signedUrlData?.signedUrl || null;
                }
              } catch (uploadErr) {
                console.warn(`Erreur upload PDF pour ${docType}:`, uploadErr);
              }
            }

            const sigRequest = await createSignatureRequest.mutateAsync({
              contact_id: contact.id,
              type_document: docType,
              titre: `${docLabels[docType] || docType} - ${sessionInfo.nom}`,
              description: `Signature électronique demandée pour ${docLabels[docType] || docType} de la session ${sessionInfo.nom}`,
              date_expiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              document_url: documentUrl || null,
            } as any);

            // Send signature email
            if (sigRequest?.id) {
              await sendSignatureEmail.mutateAsync({
                signatureRequestId: sigRequest.id,
                type: 'signature_request',
              });
              signaturesCreated++;
            }
          } catch (err) {
            console.error(`Erreur création signature pour ${docType}:`, err);
          }
        }

        if (signaturesCreated > 0) {
          toast.success(`${signaturesCreated} demande(s) de signature envoyée(s)`);
        } else if (signableDocTypes.length === 0) {
          toast.info('Aucun document sélectionné ne nécessite de signature');
        }
      }

      // Reset and close
      setSelectedDocuments([]);
      setSelectedTemplateFiles([]);
      setSelectedTextTemplates([]);
      setCustomMessage('');
      setRequestSignature(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de l\'envoi des documents');
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    if (!isSending) {
      setSelectedDocuments([]);
      setSelectedTemplateFiles([]);
      setSelectedTextTemplates([]);
      setCustomMessage('');
      setRequestSignature(false);
      onOpenChange(false);
    }
  };

  const totalSelected = selectedDocuments.length + selectedTemplateFiles.length + selectedTextTemplates.length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Envoyer des documents
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Destinataire */}
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary">
                {`${contact.prenom?.[0] ?? ''}${contact.nom?.[0] ?? ''}`.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">{contact.prenom} {contact.nom}</p>
              {contact.email ? (
                <p className="text-sm text-muted-foreground">{contact.email}</p>
              ) : (
                <Badge variant="outline" className="text-xs text-warning">
                  Pas d'email
                </Badge>
              )}
            </div>
            {totalSelected > 0 && (
              <Badge>{totalSelected} sélectionné(s)</Badge>
            )}
          </div>

          {/* Tabs pour types de documents */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="standard" className="text-xs">
                <FileText className="h-3 w-3 mr-1" />
                Standard
              </TabsTrigger>
              <TabsTrigger value="templates" className="text-xs">
                <ScrollText className="h-3 w-3 mr-1" />
                Modèles texte
              </TabsTrigger>
              <TabsTrigger value="files" className="text-xs">
                <Upload className="h-3 w-3 mr-1" />
                Fichiers
              </TabsTrigger>
            </TabsList>

            {/* Standard documents */}
            <TabsContent value="standard" className="mt-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Documents standards</Label>
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                  {DOCUMENT_OPTIONS.map((doc) => {
                    const Icon = doc.icon;
                    const isSelected = selectedDocuments.includes(doc.id);
                    
                    return (
                      <div
                        key={doc.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:bg-muted/50'
                        }`}
                        onClick={() => toggleDocument(doc.id)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleDocument(doc.id)}
                        />
                        <Icon className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className="text-sm">{doc.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            {/* Text templates */}
            <TabsContent value="templates" className="mt-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Modèles personnalisés ({activeTextTemplates.length})
                </Label>
                {activeTextTemplates.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucun modèle texte disponible.
                    <br />
                    Créez-en dans Paramètres → Modèles de documents.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                    {activeTextTemplates.map((template) => {
                      const isSelected = selectedTextTemplates.includes(template.id);
                      
                      return (
                        <div
                          key={template.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            isSelected 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border hover:bg-muted/50'
                          }`}
                          onClick={() => toggleTextTemplate(template.id)}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleTextTemplate(template.id)}
                          />
                          <ScrollText className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm block truncate">{template.nom}</span>
                            <span className="text-xs text-muted-foreground">{template.type_document}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* File templates */}
            <TabsContent value="files" className="mt-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Fichiers uploadés ({activeTemplateFiles.length})
                </Label>
                {activeTemplateFiles.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucun fichier template disponible.
                    <br />
                    Uploadez-en dans Paramètres → Fichiers modèles.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                    {activeTemplateFiles.map((template) => {
                      const isSelected = selectedTemplateFiles.includes(template.id);
                      
                      return (
                        <div
                          key={template.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            isSelected 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border hover:bg-muted/50'
                          }`}
                          onClick={() => toggleTemplateFile(template.id)}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleTemplateFile(template.id)}
                          />
                          <File className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm block truncate">{template.nom}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {template.type_fichier.toUpperCase()}
                              </Badge>
                              <span className="text-xs text-muted-foreground">{template.categorie}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Option envoi email */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="send-email" className="text-sm cursor-pointer">
                Envoyer par email
              </Label>
            </div>
            <Switch
              id="send-email"
              checked={sendEmail}
              onCheckedChange={setSendEmail}
              disabled={!hasEmail}
            />
          </div>

          {/* Option signature électronique */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <FileSignature className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="request-signature" className="text-sm cursor-pointer">
                  Demander la signature électronique
                </Label>
                <p className="text-xs text-muted-foreground">
                  Contrat, convention, règlement, CGV
                </p>
              </div>
            </div>
            <Switch
              id="request-signature"
              checked={requestSignature}
              onCheckedChange={setRequestSignature}
              disabled={!hasEmail}
            />
          </div>

          {requestSignature && hasEmail && (
            <div className="flex items-center gap-2 p-2 bg-primary/5 border border-primary/20 rounded-lg">
              <FileSignature className="h-4 w-4 text-primary shrink-0" />
              <p className="text-xs text-primary">
                Un email de signature sera envoyé au contact pour chaque document signable sélectionné (contrat, convention, règlement, CGV).
              </p>
            </div>
          )}

          {!hasEmail && (requestSignature || sendEmail) && (
            <p className="text-xs text-warning">
              Ce contact n'a pas d'adresse email. Les documents seront uniquement générés.
            </p>
          )}

          {/* Message personnalisé */}
          {sendEmail && hasEmail && (
            <div className="space-y-2">
              <Label>Message personnalisé (optionnel)</Label>
              <Textarea
                placeholder="Ajoutez un message personnalisé à l'email..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSending}>
            Annuler
          </Button>
          <Button 
            onClick={handleSend}
            disabled={totalSelected === 0 || isSending}
          >
            {isSending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {sendEmail && hasEmail ? (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Envoyer ({totalSelected})
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Générer ({totalSelected})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
