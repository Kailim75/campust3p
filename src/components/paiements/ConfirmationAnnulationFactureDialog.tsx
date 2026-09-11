import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TITRE_CONFIRMATION_ANNULATION, texteConfirmationAnnulation } from "@/lib/factures-emises";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  numeroFacture?: string | null;
  onConfirm: () => void;
  enCours?: boolean;
}

/**
 * Confirmation explicite avant de passer une facture émise au statut
 * « Annulée » (D6 du 11/09/2026) : elle garde son numéro, l'annulation est
 * tracée, un avoir devra être émis quand la fonction existera.
 */
export function ConfirmationAnnulationFactureDialog({ open, onOpenChange, numeroFacture, onConfirm, enCours }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{TITRE_CONFIRMATION_ANNULATION}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              {texteConfirmationAnnulation(numeroFacture).map((phrase) => (
                <p key={phrase}>{phrase}</p>
              ))}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={enCours}>Ne pas annuler</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={enCours}>
            Confirmer l'annulation
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
