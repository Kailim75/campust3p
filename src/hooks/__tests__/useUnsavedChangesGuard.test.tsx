import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useUnsavedChangesGuard } from "../useUnsavedChangesGuard";

/**
 * Fermer par erreur un formulaire à moitié rempli perdait toute la saisie.
 * Le garde ne doit se déclencher QUE sur une saisie modifiée : un faux positif
 * qui bloquerait chaque fermeture serait pire que le mal.
 */
function FormulaireTest({
  onOpenChange,
  dirtyInitial = false,
}: {
  onOpenChange: (open: boolean) => void;
  dirtyInitial?: boolean;
}) {
  const [dirty, setDirty] = useState(dirtyInitial);
  const guard = useUnsavedChangesGuard({ isDirty: dirty, onOpenChange });

  return (
    <Dialog open onOpenChange={guard.dialogProps.onOpenChange}>
      <DialogContent {...guard.contentProps}>
        <DialogTitle>Fiche apprenant</DialogTitle>
        <button onClick={() => setDirty(true)}>Saisir</button>
        <button onClick={() => setDirty(false)}>Enregistrer</button>
        <button onClick={guard.requestClose}>Annuler</button>
      </DialogContent>
      {guard.confirmDialog}
    </Dialog>
  );
}

const CONFIRMATION = "Abandonner les modifications ?";

describe("useUnsavedChangesGuard", () => {
  it("ferme directement un formulaire resté intact", () => {
    const onOpenChange = vi.fn();
    render(<FormulaireTest onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));

    expect(screen.queryByText(CONFIRMATION)).toBeNull();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("demande confirmation quand la saisie a été modifiée", () => {
    const onOpenChange = vi.fn();
    render(<FormulaireTest onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Saisir" }));
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));

    expect(screen.getByText(CONFIRMATION)).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Abandonner" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("garde le formulaire ouvert sur « Continuer la saisie »", () => {
    const onOpenChange = vi.fn();
    render(<FormulaireTest onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Saisir" }));
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuer la saisie" }));

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByText("Fiche apprenant")).toBeInTheDocument();
  });

  it("ferme directement après un enregistrement réussi", () => {
    const onOpenChange = vi.fn();
    render(<FormulaireTest onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Saisir" }));
    // La mutation réussie remet le formulaire au propre.
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));

    expect(screen.queryByText(CONFIRMATION)).toBeNull();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("intercepte aussi la croix et la touche Échap", () => {
    const onOpenChange = vi.fn();
    render(<FormulaireTest onOpenChange={onOpenChange} dirtyInitial />);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByText(CONFIRMATION)).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Continuer la saisie" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.getByText(CONFIRMATION)).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
