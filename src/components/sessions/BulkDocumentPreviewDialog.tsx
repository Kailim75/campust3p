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

interface BulkDocumentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: DocumentType;
  inscrits: Inscrit[];
  sessionInfo: SessionInfo;
  onConfirm: (templateId?: string) => void;
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
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('default');

  const { data: templates = [] } = useDocumentTemplates();

  // Filter templates by document type
  const availableTemplates = useMemo(() => {
    const templateType = documentTypeToTemplateType[documentType];
    return templates.filter(t => t.type_document === templateType && t.actif);
  }, [templates, documentType]);

  const selectedTemplate = useMemo(() => {
    if (selectedTemplateId === 'default') return null;
    return availableTemplates.find(t => t.id === selectedTemplateId) || null;
  }, [selectedTemplateId, availableTemplates]);

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

  // Generate PDF from template
  const generatePDFFromTemplate = (template: DocumentTemplate, contact: ContactInfo, session: SessionInfo): jsPDF => {
    const doc = new jsPDF();
    
    // Replace variables in template content
    const content = replaceVariables(template.contenu, contact, session);
    
    // Sanitize content
    const cleanContent = DOMPurify.sanitize(content, { ALLOWED_TAGS: [] });
    
    // Add title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(template.nom, 20, 25);
    
    // Add content with word wrapping
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
    
    // Add footer
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

  // Generate PDF preview when current inscrit or document type changes
  useEffect(() => {
    if (!open || !contactInfo || !sessionInfo) {
      setPdfDataUrl(null);
      return;
    }

    setIsGenerating(true);
    
    const timeout = setTimeout(() => {
      try {
        let doc;
        
        if (selectedTemplate) {
          // Use custom template
          doc = generatePDFFromTemplate(selectedTemplate, contactInfo, sessionInfo);
        } else {
          // Use default generation
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
        }

        if (doc) {
          const dataUrl = doc.output('datauristring');
          setPdfDataUrl(dataUrl);
        }
      } catch (error) {
        console.error('Error generating preview:', error);
        setPdfDataUrl(null);
      } finally {
        setIsGenerating(false);
      }
    }, 100);

    return () => clearTimeout(timeout);
  }, [open, contactInfo, sessionInfo, documentType, currentIndex, selectedTemplate]);

  // Reset index when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentIndex(0);
      setSelectedTemplateId('default');
    }
  }, [open]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(inscrits.length - 1, prev + 1));
  };

  const handleConfirmGeneration = () => {
    onConfirm(selectedTemplateId !== 'default' ? selectedTemplateId : undefined);
    onOpenChange(false);
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
          {/* Template selector */}
          <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <FileCode className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Modèle :</Label>
            </div>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Choisir un modèle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span>Modèle par défaut</span>
                  </div>
                </SelectItem>
                {availableTemplates.length > 0 && (
                  <>
                    <Separator className="my-1" />
                    {availableTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span>{template.nom}</span>
                          {template.variables && template.variables.length > 0 && (
                            <Badge variant="secondary" className="text-xs ml-1">
                              {template.variables.length} var.
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
            {availableTemplates.length === 0 && (
              <span className="text-xs text-muted-foreground">
                Aucun modèle personnalisé disponible pour ce type
              </span>
            )}
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
                  <span className="text-sm">Impossible de générer l'aperçu</span>
                </div>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="p-3 bg-accent/50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Documents à générer :</span>
                <Badge variant="outline">{inscrits.length}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {selectedTemplate ? `Modèle : ${selectedTemplate.nom}` : 'Modèle par défaut'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleConfirmGeneration}>
            <FileDown className="h-4 w-4 mr-2" />
            Générer {inscrits.length} document(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
