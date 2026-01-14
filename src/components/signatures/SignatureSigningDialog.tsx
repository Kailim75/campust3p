import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SignatureCanvas } from "./SignatureCanvas";
import { useSignDocument, useRefuseSignature, SignatureRequest } from "@/hooks/useSignatures";
import { toast } from "sonner";
import { 
  FileSignature, 
  Check, 
  X, 
  AlertTriangle,
  FileText,
  User,
  Calendar
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

interface SignatureSigningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signatureRequest: SignatureRequest | null;
}

export function SignatureSigningDialog({
  open,
  onOpenChange,
  signatureRequest,
}: SignatureSigningDialogProps) {
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showRefuse, setShowRefuse] = useState(false);
  const [refuseReason, setRefuseReason] = useState("");

  const signDocument = useSignDocument();
  const refuseSignature = useRefuseSignature();

  const handleSign = async () => {
    if (!signatureData) {
      toast.error("Veuillez signer dans le cadre prévu");
      return;
    }

    if (!acceptedTerms) {
      toast.error("Veuillez accepter les conditions");
      return;
    }

    if (!signatureRequest) return;

    try {
      await signDocument.mutateAsync({
        id: signatureRequest.id,
        signatureData,
        userAgent: navigator.userAgent,
      });
      toast.success("Document signé avec succès");
      onOpenChange(false);
      resetState();
    } catch (error) {
      toast.error("Erreur lors de la signature");
    }
  };

  const handleRefuse = async () => {
    if (!signatureRequest) return;

    try {
      await refuseSignature.mutateAsync({
        id: signatureRequest.id,
        commentaires: refuseReason || "Refusé par le signataire",
      });
      toast.success("Signature refusée");
      onOpenChange(false);
      resetState();
    } catch (error) {
      toast.error("Erreur lors du refus");
    }
  };

  const resetState = () => {
    setSignatureData(null);
    setAcceptedTerms(false);
    setShowRefuse(false);
    setRefuseReason("");
  };

  if (!signatureRequest) return null;

  const contact = signatureRequest.contact as any;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-primary" />
            Signature de document
          </DialogTitle>
          <DialogDescription>
            Veuillez lire attentivement le document avant de signer
          </DialogDescription>
        </DialogHeader>

        {!showRefuse ? (
          <div className="space-y-6">
            {/* Document Info */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="font-semibold">{signatureRequest.titre}</span>
              </div>

              {signatureRequest.description && (
                <p className="text-sm text-muted-foreground">
                  {signatureRequest.description}
                </p>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {contact?.prenom} {contact?.nom}
                  </span>
                </div>
                {signatureRequest.date_expiration && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      Expire le{" "}
                      {format(parseISO(signatureRequest.date_expiration), "d MMMM yyyy", {
                        locale: fr,
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Signature Canvas */}
            <div className="space-y-2">
              <Label className="text-base font-medium">Votre signature</Label>
              <SignatureCanvas onSignatureChange={setSignatureData} />
            </div>

            {/* Terms */}
            <div className="flex items-start space-x-3 rounded-lg border p-4 bg-muted/20">
              <Checkbox
                id="terms"
                checked={acceptedTerms}
                onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
              />
              <div className="space-y-1">
                <Label htmlFor="terms" className="text-sm font-medium cursor-pointer">
                  J'ai lu et j'accepte les conditions
                </Label>
                <p className="text-xs text-muted-foreground">
                  En signant ce document, je reconnais avoir pris connaissance de son contenu
                  et j'accepte les termes et conditions qui y sont décrits. Cette signature
                  électronique a la même valeur qu'une signature manuscrite.
                </p>
              </div>
            </div>

            {/* Legal notice */}
            <div className="rounded-lg bg-info/10 border border-info/20 p-3 text-xs text-info-foreground">
              <p className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Cette signature électronique est horodatée et enregistrée avec votre adresse IP
                  pour garantir son authenticité conformément à la réglementation en vigueur.
                </span>
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-2">
              <Button
                variant="outline"
                onClick={() => setShowRefuse(true)}
                className="text-destructive hover:text-destructive"
              >
                <X className="h-4 w-4 mr-2" />
                Refuser
              </Button>
              <Button
                onClick={handleSign}
                disabled={!signatureData || !acceptedTerms || signDocument.isPending}
                className="gap-2"
              >
                {signDocument.isPending ? (
                  "Signature en cours..."
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Signer le document
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Refuse Form */}
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
              <p className="text-sm text-destructive font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Vous êtes sur le point de refuser ce document
              </p>
            </div>

            <div className="space-y-2">
              <Label>Motif du refus (optionnel)</Label>
              <Textarea
                value={refuseReason}
                onChange={(e) => setRefuseReason(e.target.value)}
                placeholder="Expliquez pourquoi vous refusez de signer ce document..."
                rows={4}
              />
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setShowRefuse(false)}>
                Retour
              </Button>
              <Button
                variant="destructive"
                onClick={handleRefuse}
                disabled={refuseSignature.isPending}
              >
                {refuseSignature.isPending ? "Refus en cours..." : "Confirmer le refus"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
