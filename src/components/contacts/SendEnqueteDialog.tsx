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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, Copy, Star, AlertCircle, Check } from "lucide-react";
import { useEnqueteTokens, type EnqueteType } from "@/hooks/useEnqueteTokens";
import { toast } from "sonner";

interface SendEnqueteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: {
    id: string;
    nom: string;
    prenom: string;
    email?: string | null;
  };
  sessionId?: string;
  sessionName?: string;
}

export function SendEnqueteDialog({
  open,
  onOpenChange,
  contact,
  sessionId,
  sessionName,
}: SendEnqueteDialogProps) {
  const [type, setType] = useState<EnqueteType>("satisfaction");
  const [sendMethod, setSendMethod] = useState<"email" | "link">(contact.email ? "email" : "link");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { sendEnqueteEmail, copyEnqueteLink, isSendingEmail, isCreatingToken } = useEnqueteTokens();

  const handleSendEmail = async () => {
    if (!contact.email) {
      toast.error("Ce contact n'a pas d'email");
      return;
    }

    await sendEnqueteEmail.mutateAsync({
      contact_id: contact.id,
      contact_email: contact.email,
      contact_name: `${contact.prenom} ${contact.nom}`,
      session_id: sessionId,
      session_name: sessionName,
      type,
    });

    onOpenChange(false);
  };

  const handleCopyLink = async () => {
    const link = await copyEnqueteLink({
      contact_id: contact.id,
      session_id: sessionId,
      type,
    });
    setGeneratedLink(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyAgain = async () => {
    if (generatedLink) {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Lien copié");
    }
  };

  const isLoading = isSendingEmail || isCreatingToken;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Envoyer un formulaire</DialogTitle>
          <DialogDescription>
            Envoyer un formulaire à {contact.prenom} {contact.nom}
            {sessionName && (
              <Badge variant="secondary" className="ml-2">
                {sessionName}
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Type de formulaire */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Type de formulaire</Label>
            <RadioGroup value={type} onValueChange={(v) => setType(v as EnqueteType)}>
              <div className="flex items-center space-x-2 p-3 rounded-lg border cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="satisfaction" id="satisfaction" />
                <Label htmlFor="satisfaction" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium">Enquête de satisfaction</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Questionnaire post-formation avec notes et NPS
                  </p>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-lg border cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="reclamation" id="reclamation" />
                <Label htmlFor="reclamation" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="font-medium">Formulaire de réclamation</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Permet au candidat de soumettre une réclamation
                  </p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Méthode d'envoi */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Mode d'envoi</Label>
            <RadioGroup value={sendMethod} onValueChange={(v) => setSendMethod(v as "email" | "link")}>
              <div className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 ${!contact.email ? 'opacity-50' : ''}`}>
                <RadioGroupItem value="email" id="email" disabled={!contact.email} />
                <Label htmlFor="email" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span className="font-medium">Envoyer par email</span>
                  </div>
                  {contact.email ? (
                    <p className="text-sm text-muted-foreground mt-1">{contact.email}</p>
                  ) : (
                    <p className="text-sm text-destructive mt-1">Pas d'email configuré</p>
                  )}
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-lg border cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="link" id="link" />
                <Label htmlFor="link" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Copy className="h-4 w-4" />
                    <span className="font-medium">Copier le lien</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Pour partager via WhatsApp, SMS, etc.
                  </p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Lien généré */}
          {generatedLink && (
            <div className="space-y-2">
              <Label>Lien généré</Label>
              <div className="flex gap-2">
                <Input value={generatedLink} readOnly className="text-xs" />
                <Button variant="outline" size="icon" onClick={handleCopyAgain}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Ce lien est valable 30 jours et ne peut être utilisé qu'une seule fois.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          {sendMethod === "email" ? (
            <Button onClick={handleSendEmail} disabled={isLoading || !contact.email}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Envoyer
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleCopyLink} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Génération...
                </>
              ) : copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copié !
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Générer et copier
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
