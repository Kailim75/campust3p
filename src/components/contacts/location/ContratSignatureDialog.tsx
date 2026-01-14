import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SignatureCanvas } from "@/components/signatures/SignatureCanvas";
import { 
  FileSignature, 
  Calendar, 
  Euro, 
  Car, 
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { 
  useSignContratLocation,
  contratTypeLabels,
  type ContratLocation 
} from "@/hooks/useContratsLocation";

interface ContratSignatureDialogProps {
  contrat: ContratLocation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContratSignatureDialog({
  contrat,
  open,
  onOpenChange,
}: ContratSignatureDialogProps) {
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [acceptConditions, setAcceptConditions] = useState(false);

  const signContrat = useSignContratLocation();

  const handleSign = async () => {
    if (!signatureData) {
      toast.error("Veuillez apposer votre signature");
      return;
    }

    if (!acceptConditions) {
      toast.error("Veuillez accepter les conditions du contrat");
      return;
    }

    try {
      await signContrat.mutateAsync({
        id: contrat.id,
        contactId: contrat.contact_id,
        signatureData,
        ipAddress: undefined, // Will be fetched server-side in production
        userAgent: navigator.userAgent,
      });

      onOpenChange(false);
      setSignatureData(null);
      setAcceptConditions(false);
    } catch (error) {
      console.error("Error signing contract:", error);
    }
  };

  const isPending = signContrat.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-primary" />
            <DialogTitle>Signature du contrat</DialogTitle>
          </div>
          <DialogDescription>
            Signez électroniquement le contrat {contrat.numero_contrat}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Contract summary */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <FileSignature className="h-4 w-4" />
                Récapitulatif du contrat
              </h4>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">N° Contrat:</span>
                  <p className="font-medium">{contrat.numero_contrat}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <p className="font-medium">{contratTypeLabels[contrat.type_contrat]}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Objet:</span>
                  <p className="font-medium">{contrat.objet_location}</p>
                </div>
                {contrat.vehicules && (
                  <div>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Car className="h-3 w-3" />
                      Véhicule:
                    </span>
                    <p className="font-medium">
                      {contrat.vehicules.marque} {contrat.vehicules.modele} - {contrat.vehicules.immatriculation}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Période:
                  </span>
                  <p className="font-medium">
                    Du {format(new Date(contrat.date_debut), "dd/MM/yyyy", { locale: fr })} au {format(new Date(contrat.date_fin), "dd/MM/yyyy", { locale: fr })}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Euro className="h-3 w-3" />
                    Montant mensuel:
                  </span>
                  <p className="font-medium">{contrat.montant_mensuel.toFixed(2)} €</p>
                </div>
                {contrat.montant_caution && (
                  <div>
                    <span className="text-muted-foreground">Caution:</span>
                    <p className="font-medium">{contrat.montant_caution.toFixed(2)} €</p>
                  </div>
                )}
              </div>

              {contrat.conditions_particulieres && (
                <div className="pt-2">
                  <span className="text-muted-foreground text-sm">Conditions particulières:</span>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{contrat.conditions_particulieres}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Acceptance checkbox */}
            <div className="flex items-start space-x-3 p-4 border rounded-lg bg-warning/5 border-warning/20">
              <Checkbox
                id="accept-conditions"
                checked={acceptConditions}
                onCheckedChange={(checked) => setAcceptConditions(checked === true)}
              />
              <div className="space-y-1">
                <Label htmlFor="accept-conditions" className="font-medium cursor-pointer">
                  J'accepte les conditions du contrat
                </Label>
                <p className="text-xs text-muted-foreground">
                  En cochant cette case, je reconnais avoir pris connaissance des termes du contrat 
                  et j'accepte de m'y conformer.
                </p>
              </div>
            </div>

            {/* Signature area */}
            <div className="space-y-3">
              <h4 className="font-semibold">Votre signature</h4>
              <SignatureCanvas onSignatureChange={setSignatureData} />
            </div>

            {/* Legal notice */}
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>
                En signant ce document, vous certifiez que les informations fournies sont exactes 
                et que vous acceptez les termes du contrat. Cette signature électronique a la 
                même valeur légale qu'une signature manuscrite conformément aux articles 1366 et 
                suivants du Code civil.
              </p>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button 
            onClick={handleSign} 
            disabled={isPending || !signatureData || !acceptConditions}
            className="gap-2"
          >
            {isPending ? (
              "Signature en cours..."
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Signer le contrat
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
