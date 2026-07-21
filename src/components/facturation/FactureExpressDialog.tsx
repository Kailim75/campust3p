import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, FileText, Zap } from "lucide-react";
import { creerFactureExpress } from "@/lib/facture-express";

/**
 * Facturation express d'UN inscrit depuis le contexte session : tout est
 * pré-rempli (prix de la session, échéance au début de session), la facture
 * est émise en une validation. Remplace le grand formulaire générique comme
 * parcours par défaut (retour directeur du 22/07/2026 : « pas efficient,
 * ni UX ni UI ») — le formulaire détaillé reste accessible via le lien en
 * pied de dialogue pour les cas particuliers (partenaire, lignes multiples,
 * remise).
 */
interface FactureExpressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: { contactId: string; prenom: string; nom: string };
  sessionInscriptionId: string;
  sessionNom: string;
  /** Prix par défaut (prix de la session), modifiable avant validation. */
  prixDefaut: number | null;
  /** Échéance par défaut ISO (date de début de session). */
  dateEcheanceDefaut: string | null;
  /** Ouvre le formulaire détaillé (lignes, partenaire, remise). */
  onFactureDetaillee?: () => void;
  onCreated?: () => void;
}

type Financement = "personnel" | "entreprise" | "cpf" | "opco";

export function FactureExpressDialog({
  open,
  onOpenChange,
  contact,
  sessionInscriptionId,
  sessionNom,
  prixDefaut,
  dateEcheanceDefaut,
  onFactureDetaillee,
  onCreated,
}: FactureExpressDialogProps) {
  const queryClient = useQueryClient();
  const [montant, setMontant] = useState<string>("");
  const [echeance, setEcheance] = useState<string>("");
  const [financement, setFinancement] = useState<Financement>("personnel");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (open) {
      setMontant(prixDefaut != null ? String(prixDefaut) : "");
      setEcheance(dateEcheanceDefaut || new Date().toISOString().slice(0, 10));
      setFinancement("personnel");
    }
  }, [open, prixDefaut, dateEcheanceDefaut]);

  const creer = async () => {
    const montantNum = Number(montant);
    if (!montantNum || montantNum <= 0) {
      toast.error("Renseignez un montant valide");
      return;
    }
    setPending(true);
    try {
      const facture = await creerFactureExpress({
        contactId: contact.contactId,
        sessionInscriptionId,
        montant: montantNum,
        description: sessionNom,
        dateEcheance: echeance || null,
        financement,
      });
      queryClient.invalidateQueries({ queryKey: ["factures"] });
      queryClient.invalidateQueries({ queryKey: ["session-factures"] });
      queryClient.invalidateQueries({ queryKey: ["session-inscrits-sans-facture"] });
      toast.success(`Facture ${facture.numero_facture} émise`, {
        description: `${contact.prenom} ${contact.nom} — ${montantNum.toLocaleString("fr-FR")} €`,
      });
      onOpenChange(false);
      onCreated?.();
    } catch (err) {
      console.error("facture express:", err);
      toast.error("Erreur lors de la création de la facture: " + ((err as Error).message || "Erreur inconnue"));
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Facturer {contact.prenom} {contact.nom}
          </DialogTitle>
          <DialogDescription>
            {sessionNom} — facture émise immédiatement, TVA exonérée (art. 261.4.4°a CGI).
            Aucun email n'est envoyé : l'envoi se fait ensuite depuis la fiche.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="express-montant">Montant (€)</Label>
              <Input
                id="express-montant"
                type="number"
                min="0"
                step="0.01"
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="express-echeance">Échéance</Label>
              <Input
                id="express-echeance"
                type="date"
                value={echeance}
                onChange={(e) => setEcheance(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Financement</Label>
            <Select value={financement} onValueChange={(v) => setFinancement(v as Financement)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personnel">Personnel</SelectItem>
                <SelectItem value="entreprise">Entreprise</SelectItem>
                <SelectItem value="cpf">CPF</SelectItem>
                <SelectItem value="opco">OPCO</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row sm:justify-between gap-2">
          {onFactureDetaillee ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground justify-start px-2"
              disabled={pending}
              onClick={() => {
                onOpenChange(false);
                onFactureDetaillee();
              }}
            >
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              Facture détaillée…
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button disabled={pending} onClick={creer}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Création…
                </>
              ) : (
                "Émettre la facture"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
