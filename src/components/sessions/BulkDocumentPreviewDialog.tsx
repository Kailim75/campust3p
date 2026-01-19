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
import { useDocumentTemplateFiles, DocumentTemplateFile } from '@/hooks/useDocumentTemplateFiles';
import { supabase } from '@/integrations/supabase/client';
import { jsPDF } from 'jspdf';
import DOMPurify from 'dompurify';

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
  type: 'default' | 'text' | 'file';
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
  const [templateTab, setTemplateTab] = useState<'default' | 'text' | 'file'>('default');
  const [selectedTextTemplateId, setSelectedTextTemplateId] = useState<string>('');
  const [selectedFileTemplateId, setSelectedFileTemplateId] = useState<string>('');

  const { data: textTemplates = [] } = useDocumentTemplates();
  const { data: fileTemplates = [] } = useDocumentTemplateFiles();

  // Filter templates by document type
  const availableTextTemplates = useMemo(() => {
    const templateType = documentTypeToTemplateType[documentType];
    return textTemplates.filter(t => t.type_document === templateType && t.actif);
  }, [textTemplates, documentType]);

  const availableFileTemplates = useMemo(() => {
    // File templates with matching category (formation includes convocation, convention, attestation)
    return fileTemplates.filter(t => t.actif && t.categorie === 'formation');
  }, [fileTemplates]);

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

  // Generate preview from file template (shows the original file for preview)
  const generatePreviewFromFileTemplate = async (template: DocumentTemplateFile): Promise<string | null> => {
    try {
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

  // Generate PDF preview when current inscrit or document type changes
  useEffect(() => {
    // Revoke previous blob URL to prevent memory leaks
    return () => {
      if (pdfDataUrl && pdfDataUrl.startsWith('blob:')) {
        URL.revokeObjectURL(pdfDataUrl);
      }
    };
  }, [pdfDataUrl]);

  useEffect(() => {
    if (!open || !contactInfo || !sessionInfo) {
      setPdfDataUrl(null);
      return;
    }

    setIsGenerating(true);
    
    const generatePreview = async () => {
      try {
        let blobUrl: string | null = null;
        
        if (templateTab === 'file' && selectedFileTemplate) {
          // Use file template - show original file for preview
          blobUrl = await generatePreviewFromFileTemplate(selectedFileTemplate);
        } else if (templateTab === 'text' && selectedTextTemplate) {
          // Use text template
          const doc = generatePDFFromTextTemplate(selectedTextTemplate, contactInfo, sessionInfo);
          // Use blob URL instead of data URI for better browser compatibility
          const pdfBlob = doc.output('blob');
          blobUrl = URL.createObjectURL(pdfBlob);
        } else {
          // Use default generation
          let doc;
          switch (documentType) {
            case 'attestation':
              doc = generateAttestationPDF(contactInfo, sessionInfo);
              break;
            case 'convention':
              doc = generateConventionPDF(contactInfo, sessionInfo);
              break;
            case 'convocation':
              doc = generateConvocationPDF(contactInfo, sessionInfo);
              break;
            default:
              doc = null;
          }
          if (doc) {
            // Use blob URL instead of data URI for better browser compatibility
            const pdfBlob = doc.output('blob');
            blobUrl = URL.createObjectURL(pdfBlob);
          }
        }

        setPdfDataUrl(blobUrl);
      } catch (error) {
        console.error('Error generating preview:', error);
        setPdfDataUrl(null);
      } finally {
        setIsGenerating(false);
      }
    };

    const timeout = setTimeout(generatePreview, 100);
    return () => clearTimeout(timeout);
  }, [open, contactInfo, sessionInfo, documentType, currentIndex, templateTab, selectedTextTemplate, selectedFileTemplate]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentIndex(0);
      setTemplateTab('default');
      setSelectedTextTemplateId('');
      setSelectedFileTemplateId('');
    }
  }, [open]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(inscrits.length - 1, prev + 1));
  };

  const handleConfirmGeneration = () => {
    let selection: TemplateSelection;
    
    if (templateTab === 'text' && selectedTextTemplateId) {
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
          {/* Template selector with tabs */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <FileCode className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Source du modèle :</Label>
            </div>
            
            <Tabs value={templateTab} onValueChange={(v) => setTemplateTab(v as typeof templateTab)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="default" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Par défaut
                </TabsTrigger>
                <TabsTrigger value="text" className="text-xs">
                  <FileText className="h-3 w-3 mr-1" />
                  Modèle texte
                </TabsTrigger>
                <TabsTrigger value="file" className="text-xs">
                  <Upload className="h-3 w-3 mr-1" />
                  Fichier importé
                </TabsTrigger>
              </TabsList>

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

          {/* PDF Preview */}
          <div className="flex-1 min-h-0 border rounded-lg bg-muted/50 overflow-hidden">
            {isGenerating ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Génération de l'aperçu...</span>
                </div>
              </div>
            ) : pdfDataUrl ? (
              <iframe
                src={pdfDataUrl}
                className="w-full h-full min-h-[400px]"
                title="Aperçu du document"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <AlertCircle className="h-8 w-8" />
                  <span className="text-sm">
                    {templateTab !== 'default' && !selectedTextTemplateId && !selectedFileTemplateId
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
