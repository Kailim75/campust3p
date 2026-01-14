import { useMemo } from "react";
import DOMPurify from "dompurify";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Eye, FileDown, Printer } from "lucide-react";
import { DocumentTemplate, replaceVariables } from "@/hooks/useDocumentTemplates";

interface DocumentTemplatePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: DocumentTemplate | null;
}

// Exemple de données pour la prévisualisation
const exampleContact = {
  civilite: "Monsieur",
  nom: "DUPONT",
  prenom: "Jean",
  email: "jean.dupont@email.com",
  telephone: "06 12 34 56 78",
  rue: "123 rue de la Formation",
  code_postal: "75001",
  ville: "Paris",
  date_naissance: "15/03/1985",
  ville_naissance: "Lyon",
  pays_naissance: "France",
  numero_permis: "12AB34567",
  prefecture_permis: "Rhône",
  date_delivrance_permis: "01/06/2010",
  numero_carte_professionnelle: "T3P-75-2024-0001",
  prefecture_carte: "Paris",
  date_expiration_carte: "31/12/2025",
  formation: "VTC",
};

const exampleSession = {
  nom: "Formation VTC - Janvier 2026",
  date_debut: "20/01/2026",
  date_fin: "31/01/2026",
  lieu: "Paris - Centre de formation",
  formateur: "Marie MARTIN",
  prix: "1 500",
  duree_heures: "140",
  places_totales: "12",
};

export function DocumentTemplatePreviewDialog({
  open,
  onOpenChange,
  template,
}: DocumentTemplatePreviewDialogProps) {
  const previewContent = useMemo(() => {
    if (!template) return "";
    return replaceVariables(template.contenu, exampleContact, exampleSession);
  }, [template]);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      // Sanitize the content to prevent XSS attacks
      const sanitizedContent = DOMPurify.sanitize(previewContent.replace(/\n/g, "<br>"), {
        ALLOWED_TAGS: ['br', 'p', 'strong', 'em', 'u', 'b', 'i', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div'],
        ALLOWED_ATTR: []
      });
      
      // Sanitize the title as well
      const sanitizedTitle = DOMPurify.sanitize(template?.nom || "Document", {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: []
      });
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${sanitizedTitle}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              line-height: 1.6;
              white-space: pre-wrap;
            }
          </style>
        </head>
        <body>
          ${sanitizedContent}
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleDownload = () => {
    const blob = new Blob([previewContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${template?.nom || "document"}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Prévisualisation : {template.nom}
          </DialogTitle>
          <DialogDescription>
            Aperçu du document avec des données d'exemple
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{template.type_document}</Badge>
            <Badge variant="secondary">{template.categorie}</Badge>
            {template.variables && template.variables.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {template.variables.length} variable(s)
              </span>
            )}
          </div>

          <Separator />

          <ScrollArea className="h-[400px] border rounded-lg p-4">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
              {previewContent}
            </pre>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          <Button variant="outline" onClick={handleDownload}>
            <FileDown className="h-4 w-4 mr-2" />
            Télécharger
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
