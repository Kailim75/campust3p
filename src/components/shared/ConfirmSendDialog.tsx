import type { ReactNode } from "react";
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

interface ConfirmSendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Destinataire mis en évidence (adresse email en général). */
  recipient?: string | null;
  /** Remplace le texte par défaut si besoin. */
  description?: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
}

/**
 * Confirmation avant un envoi d'email à un client / candidat.
 *
 * Audit du 13/08/2026 (UX P1) : plusieurs envois partaient au premier clic,
 * sans aperçu ni confirmation — un mauvais clic sur une ligne envoyait un
 * email réel, irréversible, au mauvais destinataire. Même filet que la
 * relance de paiement (PaiementsPage), généralisé.
 */
export function ConfirmSendDialog({
  open,
  onOpenChange,
  title,
  recipient,
  description,
  confirmLabel = "Envoyer",
  onConfirm,
}: ConfirmSendDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description ?? (
              <>
                Un email sera envoyé à{" "}
                <strong>{recipient || "un destinataire sans adresse renseignée"}</strong>. Vérifiez le
                destinataire avant de confirmer : l'envoi ne peut pas être annulé.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
