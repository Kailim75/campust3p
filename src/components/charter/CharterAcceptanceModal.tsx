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
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Loader2 } from "lucide-react";
import { useSecurityCharter } from "@/hooks/useSecurityCharter";
import { toast } from "sonner";

interface CharterAcceptanceModalProps {
  open: boolean;
}

export function CharterAcceptanceModal({ open }: CharterAcceptanceModalProps) {
  const [accepted, setAccepted] = useState(false);
  const { activeCharter, acceptCharter, isAccepting } = useSecurityCharter();

  const handleAccept = async () => {
    if (!activeCharter?.id) return;

    try {
      await acceptCharter(activeCharter.id);
      toast.success("Charte de sécurité acceptée");
    } catch (error) {
      toast.error("Erreur lors de l'acceptation de la charte");
    }
  };

  // Render markdown-like content
  const renderContent = (content: string) => {
    return content.split("\n").map((line, index) => {
      if (line.startsWith("# ")) {
        return (
          <h1 key={index} className="text-xl font-bold mt-4 mb-2 text-foreground">
            {line.slice(2)}
          </h1>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <h2 key={index} className="text-lg font-semibold mt-4 mb-2 text-foreground">
            {line.slice(3)}
          </h2>
        );
      }
      if (line.startsWith("- ")) {
        return (
          <li key={index} className="ml-4 text-muted-foreground">
            {line.slice(2)}
          </li>
        );
      }
      if (line.trim() === "") {
        return <br key={index} />;
      }
      return (
        <p key={index} className="text-muted-foreground">
          {line}
        </p>
      );
    });
  };

  return (
    <Dialog open={open}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] flex flex-col"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <DialogTitle className="text-xl">
                {activeCharter?.titre || "Charte de Sécurité Interne"}
              </DialogTitle>
              <DialogDescription>
                Version {activeCharter?.version || 1} • Veuillez lire et accepter cette charte pour continuer
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[50vh] pr-4 border rounded-lg p-4 bg-muted/30">
          <div className="space-y-1">
            {activeCharter?.contenu ? (
              renderContent(activeCharter.contenu)
            ) : (
              <p className="text-muted-foreground">Chargement de la charte...</p>
            )}
          </div>
        </ScrollArea>

        <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg border">
          <Checkbox
            id="accept-charter"
            checked={accepted}
            onCheckedChange={(checked) => setAccepted(checked === true)}
            className="mt-0.5"
          />
          <Label htmlFor="accept-charter" className="text-sm leading-relaxed cursor-pointer">
            J'ai lu et j'accepte la Charte de Sécurité Interne. Je m'engage à respecter 
            l'ensemble des règles définies ci-dessus et comprends que tout manquement 
            peut entraîner des sanctions.
          </Label>
        </div>

        <DialogFooter>
          <Button
            onClick={handleAccept}
            disabled={!accepted || isAccepting || !activeCharter}
            className="w-full sm:w-auto"
          >
            {isAccepting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Accepter et continuer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
