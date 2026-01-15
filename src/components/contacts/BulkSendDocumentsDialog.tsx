import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, FileText, Mail, CheckCircle2 } from "lucide-react";
import type { Contact } from "@/hooks/useContacts";
import { useBulkCreateDocumentEnvois } from "@/hooks/useDocumentEnvois";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BulkSendDocumentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedContacts: Contact[];
  onSuccess?: () => void;
}

const documentTypes = [
  { id: "convocation", label: "Convocation", description: "Convocation à la formation" },
  { id: "convention", label: "Convention de formation", description: "Convention tripartite" },
  { id: "attestation", label: "Attestation de formation", description: "Attestation de suivi" },
  { id: "reglement", label: "Règlement intérieur", description: "Règlement du centre" },
  { id: "programme", label: "Programme de formation", description: "Programme détaillé" },
  { id: "facture", label: "Facture", description: "Facture de formation" },
  { id: "autre", label: "Autre document", description: "Document personnalisé" },
];

export function BulkSendDocumentsDialog({
  open,
  onOpenChange,
  selectedContacts,
  onSuccess,
}: BulkSendDocumentsDialogProps) {
  const [selectedDocTypes, setSelectedDocTypes] = useState<string[]>([]);
  const [sendEmail, setSendEmail] = useState(true);
  const [customMessage, setCustomMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{
    success: number;
    errors: number;
  } | null>(null);

  const bulkCreateEnvois = useBulkCreateDocumentEnvois();

  const handleDocTypeToggle = (docTypeId: string) => {
    setSelectedDocTypes((prev) =>
      prev.includes(docTypeId)
        ? prev.filter((id) => id !== docTypeId)
        : [...prev, docTypeId]
    );
  };

  const handleSend = async () => {
    if (selectedDocTypes.length === 0) {
      toast.error("Veuillez sélectionner au moins un type de document");
      return;
    }

    setIsSending(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Create document envoi records
      const envois = selectedContacts.flatMap((contact) =>
        selectedDocTypes.map((docType) => ({
          contact_id: contact.id,
          document_type: docType,
          document_name: documentTypes.find((d) => d.id === docType)?.label || docType,
          envoi_type: sendEmail ? "email" : "manuel",
          statut: "envoyé",
          metadata: customMessage ? { message: customMessage } : null,
        }))
      );

      await bulkCreateEnvois.mutateAsync(envois);

      // Send emails if enabled
      if (sendEmail) {
        const contactsWithEmail = selectedContacts.filter((c) => c.email);
        
        for (const contact of contactsWithEmail) {
          try {
            const { error } = await supabase.functions.invoke("send-automated-emails", {
              body: {
                type: "document_envoi",
                recipientEmail: contact.email,
                recipientName: `${contact.prenom} ${contact.nom}`,
                documentTypes: selectedDocTypes.map(
                  (dt) => documentTypes.find((d) => d.id === dt)?.label || dt
                ),
                customMessage,
              },
            });

            if (error) {
              console.error("Erreur envoi email:", error);
              errorCount++;
            } else {
              successCount++;
            }
          } catch (err) {
            console.error("Erreur envoi email:", err);
            errorCount++;
          }
        }
      } else {
        successCount = selectedContacts.length * selectedDocTypes.length;
      }

      setSendResult({ success: successCount, errors: errorCount });

      if (successCount > 0) {
        toast.success(`${successCount} envoi(s) enregistré(s)`);
      }
      if (errorCount > 0) {
        toast.warning(`${errorCount} email(s) non envoyé(s)`);
      }
    } catch (error) {
      console.error("Erreur envoi documents:", error);
      toast.error("Erreur lors de l'envoi des documents");
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setSelectedDocTypes([]);
    setSendEmail(true);
    setCustomMessage("");
    setSendResult(null);
    onOpenChange(false);
    if (sendResult?.success) {
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Envoi groupé de documents
          </DialogTitle>
          <DialogDescription>
            Envoyer des documents à {selectedContacts.length} contact(s)
          </DialogDescription>
        </DialogHeader>

        {!sendResult ? (
          <>
            <div className="space-y-4">
              {/* Selected contacts preview */}
              <div className="space-y-2">
                <Label>Destinataires</Label>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-2 bg-muted/50 rounded-md">
                  {selectedContacts.map((contact) => (
                    <Badge key={contact.id} variant="secondary" className="text-xs">
                      {contact.prenom} {contact.nom}
                      {contact.email && (
                        <Mail className="h-3 w-3 ml-1 text-muted-foreground" />
                      )}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Document types selection */}
              <div className="space-y-2">
                <Label>Types de documents à envoyer</Label>
                <ScrollArea className="h-48 border rounded-md p-3">
                  <div className="space-y-3">
                    {documentTypes.map((docType) => (
                      <div
                        key={docType.id}
                        className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                        onClick={() => handleDocTypeToggle(docType.id)}
                      >
                        <Checkbox
                          id={docType.id}
                          checked={selectedDocTypes.includes(docType.id)}
                          onCheckedChange={() => handleDocTypeToggle(docType.id)}
                        />
                        <div className="flex-1">
                          <Label
                            htmlFor={docType.id}
                            className="cursor-pointer font-medium"
                          >
                            {docType.label}
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {docType.description}
                          </p>
                        </div>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Email notification */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="sendEmail"
                  checked={sendEmail}
                  onCheckedChange={(checked) => setSendEmail(checked as boolean)}
                />
                <Label htmlFor="sendEmail" className="cursor-pointer">
                  Envoyer une notification par email
                </Label>
              </div>

              {sendEmail && (
                <>
                  {selectedContacts.filter((c) => !c.email).length > 0 && (
                    <Alert>
                      <AlertDescription>
                        {selectedContacts.filter((c) => !c.email).length} contact(s) sans
                        adresse email ne recevront pas de notification.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="message">Message personnalisé (optionnel)</Label>
                    <Textarea
                      id="message"
                      placeholder="Ajouter un message personnalisé à l'email..."
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      rows={3}
                    />
                  </div>
                </>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Annuler
              </Button>
              <Button
                onClick={handleSend}
                disabled={selectedDocTypes.length === 0 || isSending}
              >
                {isSending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Envoyer {selectedDocTypes.length} document(s)
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            {/* Results view */}
            <div className="py-6 text-center space-y-4">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-success" />
                </div>
              </div>
              <div>
                <p className="text-lg font-medium">Envoi terminé</p>
                <p className="text-muted-foreground">
                  {sendResult.success} envoi(s) réussi(s)
                  {sendResult.errors > 0 && `, ${sendResult.errors} erreur(s)`}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                L'historique des envois est consultable dans la fiche de chaque contact.
              </p>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Fermer</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
