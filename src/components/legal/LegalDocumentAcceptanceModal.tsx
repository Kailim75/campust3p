import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, FileText, Loader2 } from "lucide-react";
import { useLegalDocuments } from "@/hooks/useLegalDocuments";
import { toast } from "sonner";

interface LegalDocumentAcceptanceModalProps {
  open: boolean;
}

export function LegalDocumentAcceptanceModal({ open }: LegalDocumentAcceptanceModalProps) {
  const [accepted, setAccepted] = useState(false);
  const { currentDocument, acceptDocument, isAccepting, pendingDocuments } = useLegalDocuments();

  if (!currentDocument) return null;

  const isPrivacyPolicy = currentDocument.document_type === 'privacy_policy';
  const remainingCount = (pendingDocuments?.length || 1) - 1;

  const handleAccept = async () => {
    if (!accepted) {
      toast.error("Veuillez cocher la case pour accepter");
      return;
    }

    try {
      await acceptDocument(currentDocument.id);
      setAccepted(false); // Reset for next document
      toast.success(
        isPrivacyPolicy 
          ? "Politique de confidentialité acceptée" 
          : "Charte de sécurité acceptée"
      );
    } catch (error) {
      toast.error("Erreur lors de l'acceptation");
    }
  };

  const Icon = isPrivacyPolicy ? FileText : Shield;
  const iconColor = isPrivacyPolicy ? "text-blue-600" : "text-primary";
  const bgColor = isPrivacyPolicy ? "bg-blue-100" : "bg-primary/10";

  return (
    <Dialog open={open} modal>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] flex flex-col"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${bgColor}`}>
              <Icon className={`h-6 w-6 ${iconColor}`} />
            </div>
            <div>
              <DialogTitle className="text-xl">{currentDocument.titre}</DialogTitle>
              <DialogDescription>
                Version {currentDocument.version}
                {remainingCount > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({remainingCount} autre{remainingCount > 1 ? 's' : ''} document{remainingCount > 1 ? 's' : ''} à accepter)
                  </span>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 my-4 border rounded-lg p-4 bg-muted/30">
          <div className="prose prose-sm max-w-none dark:prose-invert">
            {currentDocument.contenu.split('\n').map((line, i) => {
              if (line.startsWith('# ')) {
                return <h1 key={i} className="text-xl font-bold mt-4 mb-2">{line.slice(2)}</h1>;
              }
              if (line.startsWith('## ')) {
                return <h2 key={i} className="text-lg font-semibold mt-4 mb-2">{line.slice(3)}</h2>;
              }
              if (line.startsWith('### ')) {
                return <h3 key={i} className="text-base font-medium mt-3 mb-1">{line.slice(4)}</h3>;
              }
              if (line.startsWith('- ')) {
                return <li key={i} className="ml-4">{line.slice(2)}</li>;
              }
              if (line.startsWith('---')) {
                return <hr key={i} className="my-4" />;
              }
              if (line.startsWith('|')) {
                // Simple table rendering
                const cells = line.split('|').filter(Boolean).map(c => c.trim());
                return (
                  <div key={i} className="flex gap-4 py-1 text-sm">
                    {cells.map((cell, j) => (
                      <span key={j} className="flex-1">{cell}</span>
                    ))}
                  </div>
                );
              }
              if (line.trim()) {
                // Handle bold text
                const parts = line.split(/(\*\*[^*]+\*\*)/g);
                return (
                  <p key={i} className="mb-2">
                    {parts.map((part, j) => {
                      if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={j}>{part.slice(2, -2)}</strong>;
                      }
                      return part;
                    })}
                  </p>
                );
              }
              return null;
            })}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-shrink-0 flex-col sm:flex-col gap-4">
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <Checkbox
              id="accept-document"
              checked={accepted}
              onCheckedChange={(checked) => setAccepted(checked === true)}
              className="mt-0.5"
            />
            <label 
              htmlFor="accept-document" 
              className="text-sm cursor-pointer select-none"
            >
              {isPrivacyPolicy 
                ? "J'ai lu et j'accepte la politique de confidentialité. Je comprends comment mes données personnelles sont collectées, utilisées et protégées."
                : "J'ai lu et j'accepte la charte de sécurité. Je m'engage à respecter l'ensemble des règles énoncées ci-dessus."
              }
            </label>
          </div>
          
          <Button
            onClick={handleAccept}
            disabled={!accepted || isAccepting}
            className="w-full"
            size="lg"
          >
            {isAccepting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Validation en cours...
              </>
            ) : (
              <>
                <Icon className="mr-2 h-4 w-4" />
                Accepter et continuer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
