import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  FileDown,
  ChevronLeft,
  ChevronRight,
  Users,
  Loader2,
  Eye,
  AlertCircle,
  FileCode,
  Sparkles,
  Upload,
  File,
  FileWarning,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  generateAttestationPDF,
  generateConventionPDF,
  generateConvocationPDF,
  type ContactInfo,
  type SessionInfo,
} from '@/lib/pdf-generator';
import type { DocumentType } from '@/hooks/useDocumentGenerator';
import { useDocumentTemplates, replaceVariables, DocumentTemplate } from '@/hooks/useDocumentTemplates';
import { useDocumentTemplateFiles, useDefaultTemplate, DocumentTemplateFile } from '@/hooks/useDocumentTemplateFiles';
import { useCentreFormation } from '@/hooks/useCentreFormation';
import { supabase } from '@/integrations/supabase/client';
import { jsPDF } from 'jspdf';
import DOMPurify from 'dompurify';
import { buildVariableData, createDocxPreviewPDF } from '@/lib/docx-processor';
import { fetchContactDocumentData } from '@/lib/documents/fetchContactDocumentData';
import { PDFViewer } from '@/components/ui/pdf-viewer';
import { centreToCompanyInfo } from '@/lib/centre-to-company';
import { usePublishedTemplate } from '@/hooks/usePublishedTemplate';
import { renderTemplateHtml, buildDocumentVariables, printHtmlDocument } from '@/lib/template-renderer';

interface Inscrit {
  id: string;
  contact_id: string;
  contact?: {
    id: string;
    nom: string;
    prenom: string;
    email?: string;
    civilite?: string;
    telephone?: string;
    rue?: string;
    code_postal?: string;
    ville?: string;
    date_naissance?: string;
    ville_naissance?: string;
  };
}

export interface TemplateSelection {
  type: 'default' | 'text' | 'file' | 'studio';
  templateId?: string;
}

interface BulkDocumentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: DocumentType;
  inscrits: Inscrit[];
  sessionInfo: SessionInfo;
  onConfirm: (selection?: TemplateSelection) => void;
}

const documentTypeLabels: Record<string, string> = {
  convocation: 'Convocation',
  convention: 'Convention',
  attestation: 'Attestation',
};

// Map document types to template types
const documentTypeToTemplateType: Record<string, string> = {
  convocation: 'convocation',
  convention: 'convention',
  attestation: 'attestation',
};

export function BulkDocumentPreviewDialog({
  open,
  onOpenChange,
  documentType,
  inscrits,
  sessionInfo,
  onConfirm,
}: BulkDocumentPreviewDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [templateTab, setTemplateTab] = useState<'default' | 'text' | 'file' | 'studio'>('default');
  const [selectedTextTemplateId, setSelectedTextTemplateId] = useState<string>('');
  const [selectedFileTemplateId, setSelectedFileTemplateId] = useState<string>('');
  const [studioPreviewHtml, setStudioPreviewHtml] = useState<string | null>(null);

  const { data: textTemplates = [] } = useDocumentTemplates();
  const { data: fileTemplates = [] } = useDocumentTemplateFiles();
  const { centreFormation } = useCentreFormation();
  
  // Get the default template for this document type and formation
  const templateType = documentTypeToTemplateType[documentType];
  const { data: defaultFileTemplate } = useDefaultTemplate(templateType, sessionInfo?.formation_type);
  
  // Check for published Template Studio template
  const { data: publishedStudioTemplate } = usePublishedTemplate(templateType);

  // Filter templates by document type
  const availableTextTemplates = useMemo(() => {
    return textTemplates.filter(t => t.type_document === templateType && t.actif);
  }, [textTemplates, templateType]);

  const availableFileTemplates = useMemo(() => {
    return fileTemplates.filter(t => t.actif && t.categorie === 'formation');
  }, [fileTemplates]);

  // Auto-select published Studio template first, then default file template
  useEffect(() => {
    if (open) {
      if (publishedStudioTemplate) {
        setTemplateTab('studio');
      } else if (defaultFileTemplate && templateTab === 'default') {
        setTemplateTab('file');
        setSelectedFileTemplateId(defaultFileTemplate.id);
      }
    }
  }, [open, defaultFileTemplate, publishedStudioTemplate]);

  const selectedTextTemplate = useMemo(() => {
    if (!selectedTextTemplateId) return null;
    return availableTextTemplates.find(t => t.id === selectedTextTemplateId) || null;
  }, [selectedTextTemplateId, availableTextTemplates]);

  const selectedFileTemplate = useMemo(() => {
    if (!selectedFileTemplateId) return null;
    return availableFileTemplates.find(t => t.id === selectedFileTemplateId) || null;
  }, [selectedFileTemplateId, availableFileTemplates]);

  const currentInscrit = inscrits[currentIndex];
  
  // Build contact info for current inscrit
  const contactInfo: ContactInfo | null = useMemo(() => {
    if (!currentInscrit?.contact) return null;
    const c = currentInscrit.contact;
    return {
      civilite: c.civilite || undefined,
      nom: c.nom || '',
      prenom: c.prenom || '',
      email: c.email || undefined,
      telephone: c.telephone || undefined,
      rue: c.rue || undefined,
      code_postal: c.code_postal || undefined,
      ville: c.ville || undefined,
      date_naissance: c.date_naissance || undefined,
      ville_naissance: c.ville_naissance || undefined,
    };
  }, [currentInscrit]);

  // Generate PDF from text template
  const generatePDFFromTextTemplate = (template: DocumentTemplate, contact: ContactInfo, session: SessionInfo): jsPDF => {
    const doc = new jsPDF();
    
    const content = replaceVariables(template.contenu, contact, session);
    const cleanContent = DOMPurify.sanitize(content, { ALLOWED_TAGS: [] });
    
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(template.nom, 20, 25);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    const lines = doc.splitTextToSize(cleanContent, 170);
    let y = 45;
    const lineHeight = 7;
    
    lines.forEach((line: string) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, 20, y);
      y += lineHeight;
    });
    
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`,
        20,
        285
      );
      doc.text(`Page ${i}/${pageCount}`, 180, 285, { align: 'right' });
    }
    
    return doc;
  };

  // Generate preview from file template with variable replacement visualization
  const generatePreviewFromFileTemplate = async (
    template: DocumentTemplateFile,
    contact: ContactInfo,
    session: SessionInfo
  ): Promise<string | null> => {
    try {
      let fullContact: any = contact;
      const contactId = (contact as any)?.id;
      if (contactId) {
        try {
          fullContact = { ...contact, ...(await fetchContactDocumentData(contactId)) };
        } catch (e) {
          console.warn('[DOCX preview] Contact partiel (fallback)', e);
        }
      }

      // Build variable data for preview
      const variableData = buildVariableData(
        {
          civilite: fullContact.civilite,
          nom: fullContact.nom,
          prenom: fullContact.prenom,
          email: fullContact.email,
          telephone: fullContact.telephone,
          rue: fullContact.rue,
          code_postal: fullContact.code_postal,
          ville: fullContact.ville,
          date_naissance: fullContact.date_naissance,
          ville_naissance: fullContact.ville_naissance,
          pays_naissance: fullContact.pays_naissance,
          numero_carte_professionnelle: fullContact.numero_carte_professionnelle,
          prefecture_carte: fullContact.prefecture_carte,
          date_expiration_carte: fullContact.date_expiration_carte,
        },
        {
          nom: session.nom,
          date_debut: session.date_debut,
          date_fin: session.date_fin,
          lieu: session.lieu,
          heure_debut: session.heure_debut,
          heure_fin: session.heure_fin,
          horaires: session.heure_debut && session.heure_fin 
            ? `${session.heure_debut} - ${session.heure_fin}` 
            : undefined,
          formation_type: session.formation_type,
          duree_heures: session.duree_heures,
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

      // For DOCX files, generate a PDF preview showing the variables that will be replaced
      if (template.type_fichier === 'docx') {
        const previewDoc = createDocxPreviewPDF(template.nom, variableData);
        const pdfBlob = previewDoc.output('blob');
        return URL.createObjectURL(pdfBlob);
      }
      
      // For PDF files, download and show directly
      const { data, error } = await supabase.storage
        .from('document-templates')
        .download(template.file_path);
      
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      return url;
    } catch (error) {
      console.error('Error loading file template:', error);
      return null;
    }
  };

  // Cleanup blob URLs on unmount only
  useEffect(() => {
    let currentUrl: string | null = null;
    
    return () => {
      if (currentUrl && currentUrl.startsWith('blob:')) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, []);

  // Track URL changes for cleanup
  useEffect(() => {
    const previousUrl = pdfDataUrl;
    return () => {
      // Revoke previous URL when a new one is set, with a delay to avoid race conditions
      if (previousUrl && previousUrl.startsWith('blob:')) {
        setTimeout(() => {
          URL.revokeObjectURL(previousUrl);
        }, 1000);
      }
    };
  }, [pdfDataUrl]);

  useEffect(() => {
    if (!open || !sessionInfo) {
      setPdfDataUrl(null);
      return;
    }

    // Check if we have valid contact info
    if (!contactInfo) {
      console.warn('BulkDocumentPreviewDialog: No contact info available for current inscrit', currentInscrit);
      setPdfDataUrl(null);
      return;
    }

    setIsGenerating(true);
    
    const generatePreview = async () => {
      try {
        let blobUrl: string | null = null;
        
        if (templateTab === 'studio' && publishedStudioTemplate && contactInfo) {
          // Use published Template Studio template — render HTML preview
          const contactId = currentInscrit?.contact_id || (currentInscrit?.contact as any)?.id;
          const vars = await buildDocumentVariables({
            contactId,
            sessionId: (sessionInfo as any)?.id,
            extra: {
              session_nom: sessionInfo?.nom || "",
              formation_type: sessionInfo?.formation_type || "",
            },
          });
          const html = renderTemplateHtml(publishedStudioTemplate.template_body, vars);
          setStudioPreviewHtml(html);
          setPdfDataUrl(null);
          setIsGenerating(false);
          return;
        } else if (templateTab === 'file' && selectedFileTemplate && contactInfo) {
          blobUrl = await generatePreviewFromFileTemplate(selectedFileTemplate, contactInfo, sessionInfo);
        } else if (templateTab === 'text' && selectedTextTemplate && contactInfo) {
          const doc = generatePDFFromTextTemplate(selectedTextTemplate, contactInfo, sessionInfo);
          const pdfBlob = doc.output('blob');
          blobUrl = URL.createObjectURL(pdfBlob);
        } else {
          const companyInfo = centreToCompanyInfo(centreFormation);
          let doc;
          switch (documentType) {
            case 'attestation':
              doc = generateAttestationPDF(contactInfo, sessionInfo, companyInfo);
              break;
            case 'convention':
              doc = generateConventionPDF(contactInfo, sessionInfo, companyInfo);
              break;
            case 'convocation':
              doc = generateConvocationPDF(contactInfo, sessionInfo, companyInfo);
              break;
            default:
              doc = null;
          }
          if (doc) {
            const pdfBlob = doc.output('blob');
            blobUrl = URL.createObjectURL(pdfBlob);
          }
        }

        setStudioPreviewHtml(null);
        setPdfDataUrl(blobUrl);
      } catch (error) {
        console.error('Error generating preview:', error);
        setPdfDataUrl(null);
        setStudioPreviewHtml(null);
      } finally {
        setIsGenerating(false);
      }
    };

    const timeout = setTimeout(generatePreview, 100);
    return () => clearTimeout(timeout);
  }, [open, contactInfo, sessionInfo, documentType, currentIndex, templateTab, selectedTextTemplate, selectedFileTemplate, currentInscrit, publishedStudioTemplate]);

  // Reset state when dialog opens (but don't reset template selection - let auto-select handle it)
  useEffect(() => {
    if (open) {
      setCurrentIndex(0);
      // Only reset if no default template will be auto-selected
      if (!defaultFileTemplate) {
        setTemplateTab('default');
        setSelectedTextTemplateId('');
        setSelectedFileTemplateId('');
      }
    }
  }, [open, defaultFileTemplate]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(inscrits.length - 1, prev + 1));
  };

  const handleConfirmGeneration = () => {
    let selection: TemplateSelection;
    
    if (templateTab === 'studio' && publishedStudioTemplate) {
      selection = { type: 'studio', templateId: publishedStudioTemplate.id };
    } else if (templateTab === 'text' && selectedTextTemplateId) {
      selection = { type: 'text', templateId: selectedTextTemplateId };
    } else if (templateTab === 'file' && selectedFileTemplateId) {
      selection = { type: 'file', templateId: selectedFileTemplateId };
    } else {
      selection = { type: 'default' };
    }
    
    onConfirm(selection);
    onOpenChange(false);
  };

  const getSelectedTemplateName = () => {
    if (templateTab === 'studio' && publishedStudioTemplate) {
      return `📐 ${publishedStudioTemplate.name} (Template Studio)`;
    }
    if (templateTab === 'text' && selectedTextTemplate) {
      return selectedTextTemplate.nom;
    }
    if (templateTab === 'file' && selectedFileTemplate) {
      return `${selectedFileTemplate.nom}.${selectedFileTemplate.type_fichier}`;
    }
    return 'Modèle par défaut';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Prévisualisation - {documentTypeLabels[documentType] || documentType}
          </DialogTitle>
          <DialogDescription>
            Choisissez un modèle et vérifiez l'aperçu avant de générer pour tous les stagiaires
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 gap-4">
          {/* Default template indicator */}
          {defaultFileTemplate && (
            <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm">
                Modèle par défaut détecté : <strong>{defaultFileTemplate.nom}</strong>
                {defaultFileTemplate.formation_type && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {defaultFileTemplate.formation_type}
                  </Badge>
                )}
              </span>
            </div>
          )}

          {/* Template selector with tabs */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <FileCode className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Source du modèle :</Label>
            </div>
            
            <Tabs value={templateTab} onValueChange={(v) => setTemplateTab(v as typeof templateTab)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="studio" className="text-xs relative">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Template Studio
                  {publishedStudioTemplate && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 bg-success rounded-full" />
                  )}
                </TabsTrigger>
                <TabsTrigger value="default" className="text-xs">
                  <FileText className="h-3 w-3 mr-1" />
                  Intégré
                </TabsTrigger>
                <TabsTrigger value="text" className="text-xs">
                  <FileText className="h-3 w-3 mr-1" />
                  Modèle texte
                </TabsTrigger>
                <TabsTrigger value="file" className="text-xs relative">
                  <Upload className="h-3 w-3 mr-1" />
                  Fichier importé
                  {defaultFileTemplate && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full" />
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="studio" className="mt-3">
                {publishedStudioTemplate ? (
                  <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/20 rounded-lg">
                    <Sparkles className="h-4 w-4 text-success" />
                    <div>
                      <p className="text-sm font-medium">
                        {publishedStudioTemplate.name}
                        <Badge variant="default" className="ml-2 text-xs bg-success">Publié v{publishedStudioTemplate.version}</Badge>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Template créé dans le Template Studio — les variables seront remplacées automatiquement.
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Aucun template publié pour "{documentTypeLabels[documentType]}".
                    <br />
                    Créez et publiez un template dans le Template & Compliance Studio.
                  </p>
                )}
              </TabsContent>

              <TabsContent value="default" className="mt-3">
                <p className="text-sm text-muted-foreground">
                  Utilise le modèle standard intégré au CRM avec mise en page automatique.
                </p>
              </TabsContent>

              <TabsContent value="text" className="mt-3">
                {availableTextTemplates.length > 0 ? (
                  <Select value={selectedTextTemplateId} onValueChange={setSelectedTextTemplateId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un modèle texte..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTextTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span>{template.nom}</span>
                            {template.variables && template.variables.length > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {template.variables.length} var.
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Aucun modèle texte disponible pour "{documentTypeLabels[documentType]}".
                    <br />
                    Créez-en un dans Paramètres → Modèles de documents.
                  </p>
                )}
              </TabsContent>

              <TabsContent value="file" className="mt-3">
                {availableFileTemplates.length > 0 ? (
                  <Select value={selectedFileTemplateId} onValueChange={setSelectedFileTemplateId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un fichier modèle..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFileTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex items-center gap-2">
                            {template.type_fichier === 'pdf' ? (
                              <FileText className="h-4 w-4 text-red-500" />
                            ) : (
                              <File className="h-4 w-4 text-blue-500" />
                            )}
                            <span>{template.nom}</span>
                            <Badge variant="outline" className="text-xs uppercase">
                              {template.type_fichier}
                            </Badge>
                            {template.variables && template.variables.length > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {template.variables.length} var.
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Aucun fichier modèle importé.
                    <br />
                    Importez un PDF ou DOCX dans Paramètres → Modèles de fichiers.
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Navigation between trainees */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Précédent
            </Button>

            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="font-mono">
                {currentIndex + 1} / {inscrits.length}
              </Badge>
              {currentInscrit?.contact && (
                <span className="text-sm font-medium">
                  {currentInscrit.contact.prenom} {currentInscrit.contact.nom}
                </span>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              disabled={currentIndex === inscrits.length - 1}
            >
              Suivant
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          {/* Preview */}
          <div className="flex-1 min-h-0 border rounded-lg bg-muted/50 overflow-hidden">
            {isGenerating ? (
              <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Génération de l'aperçu...</span>
                </div>
              </div>
            ) : studioPreviewHtml ? (
              <ScrollArea className="h-[400px]">
                <div
                  className="p-6 bg-white dark:bg-card prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: studioPreviewHtml }}
                />
              </ScrollArea>
            ) : pdfDataUrl ? (
              <PDFViewer 
                pdfData={pdfDataUrl} 
                className="w-full h-full min-h-[400px]"
              />
            ) : (
              <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <AlertCircle className="h-8 w-8" />
                  <span className="text-sm text-center max-w-xs">
                    {!contactInfo
                      ? 'Données du contact non disponibles pour cet inscrit'
                      : templateTab === 'studio' && !publishedStudioTemplate
                        ? 'Aucun template publié pour ce type de document'
                        : templateTab !== 'default' && !selectedTextTemplateId && !selectedFileTemplateId
                          ? 'Sélectionnez un modèle pour voir l\'aperçu'
                          : 'Impossible de générer l\'aperçu'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="p-3 bg-accent/50 rounded-lg">
            <div className="flex items-center justify-between text-sm flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Documents à générer :</span>
                <Badge variant="outline">{inscrits.length}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Modèle :</span>
                <span className="font-medium">{getSelectedTemplateName()}</span>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button 
            onClick={handleConfirmGeneration}
            disabled={
              (templateTab === 'text' && !selectedTextTemplateId) ||
              (templateTab === 'file' && !selectedFileTemplateId)
            }
          >
            <FileDown className="h-4 w-4 mr-2" />
            Générer {inscrits.length} document(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
