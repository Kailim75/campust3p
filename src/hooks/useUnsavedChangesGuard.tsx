import { useCallback, useState } from "react";
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

interface UnsavedChangesGuardOptions {
  /** Vrai dès que la saisie diffère de l'état initial du formulaire. */
  isDirty: boolean;
  /** La fermeture réelle du dialogue (le `onOpenChange` reçu en props). */
  onOpenChange: (open: boolean) => void;
}

/**
 * Garde anti-perte de saisie pour un dialogue de formulaire.
 *
 * Un formulaire à moitié rempli fermé par erreur perdait tout, sans le
 * moindre avertissement. Radix offre TROIS chemins de fermeture — la croix
 * (via `onOpenChange`), la touche Échap et le clic à l'extérieur — qu'il faut
 * intercepter tous les trois, sinon deux d'entre eux continuent de vider le
 * formulaire.
 *
 * Usage :
 *   const guard = useUnsavedChangesGuard({ isDirty: form.formState.isDirty, onOpenChange });
 *   <Dialog open={open} onOpenChange={guard.dialogProps.onOpenChange}>
 *     <DialogContent {...guard.contentProps}>…</DialogContent>
 *     {guard.confirmDialog}
 *   </Dialog>
 *
 * `requestClose` sert au bouton « Annuler » du formulaire. La fermeture qui
 * suit un enregistrement réussi doit passer directement par le `onOpenChange`
 * d'origine : elle ne doit jamais être retenue.
 */
export function useUnsavedChangesGuard({ isDirty, onOpenChange }: UnsavedChangesGuardOptions) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const close = useCallback(() => {
    setConfirmOpen(false);
    onOpenChange(false);
  }, [onOpenChange]);

  const requestClose = useCallback(() => {
    if (isDirty) setConfirmOpen(true);
    else close();
  }, [isDirty, close]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) onOpenChange(true);
      else requestClose();
    },
    [onOpenChange, requestClose],
  );

  // Échap et clic extérieur : Radix laisse la main avant de fermer, un
  // preventDefault suffit à retenir le dialogue.
  const interceptDismiss = useCallback(
    (event: Event) => {
      if (!isDirty) return;
      event.preventDefault();
      setConfirmOpen(true);
    },
    [isDirty],
  );

  const confirmDialog = (
    <AlertDialog open={confirmOpen} onOpenChange={(open) => { if (!open) setConfirmOpen(false); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Abandonner les modifications ?</AlertDialogTitle>
          <AlertDialogDescription>Les informations saisies seront perdues.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Continuer la saisie</AlertDialogCancel>
          <AlertDialogAction onClick={close}>Abandonner</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return {
    /** À poser sur `<Dialog>` : intercepte la croix. */
    dialogProps: { onOpenChange: handleOpenChange },
    /** À poser sur `<DialogContent>` : intercepte Échap et le clic extérieur. */
    contentProps: { onEscapeKeyDown: interceptDismiss, onPointerDownOutside: interceptDismiss },
    /** Pour le bouton « Annuler » du formulaire. */
    requestClose,
    /** À rendre dans `<Dialog>`, à côté de `<DialogContent>`. */
    confirmDialog,
  };
}
