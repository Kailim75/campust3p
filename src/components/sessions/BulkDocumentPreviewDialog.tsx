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
import {
  FileText,
  FileDown,
  ChevronLeft,
  ChevronRight,
  Users,
  Loader2,
  Eye,
  AlertCircle,
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
  onConfirm: () => void;
}

const documentTypeLabels: Record<string, string> = {
  convocation: 'Convocation',
  convention: 'Convention',
  attestation: 'Attestation',
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

  // Generate PDF preview when current inscrit or document type changes
  useEffect(() => {
    if (!open || !contactInfo || !sessionInfo) {
      setPdfDataUrl(null);
      return;
    }

    setIsGenerating(true);
    
    // Use setTimeout to allow UI to update before heavy PDF generation
    const timeout = setTimeout(() => {
      try {
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
  }, [open, contactInfo, sessionInfo, documentType, currentIndex]);

  // Reset index when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentIndex(0);
    }
  }, [open]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(inscrits.length - 1, prev + 1));
  };

  const handleConfirmGeneration = () => {
    onConfirm();
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
            Vérifiez l'aperçu du document avant de générer pour tous les stagiaires
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 gap-4">
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
                <span className="text-muted-foreground">Session :</span>
                <span className="font-medium">{sessionInfo.nom}</span>
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
