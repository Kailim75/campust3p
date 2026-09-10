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
 * Fermeture programmatique « pour aller ailleurs » (ouvrir une autre fiche,
 * enchaîner sur un autre écran…). L'utilisateur a un but légitime : la
 * confirmation doit nommer ce but et ce qu'il coûte, pas se contenter d'un
 * « Abandonner ? » qui ressemble à une erreur de manipulation.
 */
export interface CloseIntent {
  /** Titre de la confirmation. */
  title?: string;
  /** Ce qui est perdu, formulé pour l'intention réelle de l'utilisateur. */
  description?: string;
  /** Libellé du bouton qui poursuit l'action. */
  confirmLabel?: string;
  /** Exécuté APRÈS la fermeture effective (navigation, événement…). */
  onProceed?: () => void;
}

const TITRE_PAR_DEFAUT = "Abandonner les modifications ?";
const TEXTE_PAR_DEFAUT = "Les informations saisies seront perdues.";
const ACTION_PAR_DEFAUT = "Abandonner";

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
 * `requestClose` sert au bouton « Annuler » du formulaire, `requestCloseFor`
 * aux fermetures programmatiques qui emmènent l'utilisateur ailleurs (ouvrir
 * une autre fiche…) : elles passent par la même garde, avec un libellé qui
 * dit où l'on va. La fermeture qui suit un enregistrement réussi doit passer
 * directement par le `onOpenChange` d'origine : elle ne doit jamais être
 * retenue.
 */
export function useUnsavedChangesGuard({ isDirty, onOpenChange }: UnsavedChangesGuardOptions) {
  // `null` = aucune confirmation en cours. Sinon, l'intention à confirmer
  // (`{}` pour une simple fermeture, sans destination).
  const [pending, setPending] = useState<CloseIntent | null>(null);

  const close = useCallback(
    (intent?: CloseIntent | null) => {
      setPending(null);
      onOpenChange(false);
      // La destination n'est atteinte qu'une fois le formulaire refermé.
      intent?.onProceed?.();
    },
    [onOpenChange],
  );

  const requestCloseFor = useCallback(
    (intent: CloseIntent = {}) => {
      if (isDirty) setPending(intent);
      else close(intent);
    },
    [isDirty, close],
  );

  // Sans argument : ce callback est passé tel quel à `onClick`, il ne doit
  // pas prendre l'événement souris pour une intention de fermeture.
  const requestClose = useCallback(() => {
    requestCloseFor();
  }, [requestCloseFor]);

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
      setPending({});
    },
    [isDirty],
  );

  const confirmDialog = (
    <AlertDialog open={pending !== null} onOpenChange={(open) => { if (!open) setPending(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{pending?.title ?? TITRE_PAR_DEFAUT}</AlertDialogTitle>
          <AlertDialogDescription>{pending?.description ?? TEXTE_PAR_DEFAUT}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Continuer la saisie</AlertDialogCancel>
          <AlertDialogAction onClick={() => close(pending)}>
            {pending?.confirmLabel ?? ACTION_PAR_DEFAUT}
          </AlertDialogAction>
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
    /**
     * Pour une fermeture programmatique qui emmène ailleurs : même garde,
     * mais la confirmation nomme la destination et l'action se déclenche
     * une fois le formulaire refermé.
     */
    requestCloseFor,
    /** À rendre dans `<Dialog>`, à côté de `<DialogContent>`. */
    confirmDialog,
  };
}
