import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfirmSendDialog } from "../ConfirmSendDialog";

/**
 * Le bouton de confirmation reste monté et cliquable pendant l'animation de
 * sortie Radix (~200 ms) : sans verrou, un double clic partait en deux envois
 * réels (deux emails au client, cf. lien Alma / devis / facture).
 */
describe("ConfirmSendDialog", () => {
  it("déclenche l'envoi au premier clic", () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmSendDialog
        open
        onOpenChange={() => {}}
        title="Envoyer le lien de paiement ?"
        recipient="client@exemple.fr"
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("verrouille les deux boutons pendant l'envoi", () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmSendDialog
        open
        onOpenChange={() => {}}
        title="Envoyer le lien de paiement ?"
        recipient="client@exemple.fr"
        pending
        onConfirm={onConfirm}
      />,
    );

    const envoyer = screen.getByRole("button", { name: /Envoi/ });
    expect(envoyer).toBeDisabled();
    expect(screen.getByRole("button", { name: "Annuler" })).toBeDisabled();

    fireEvent.click(envoyer);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("n'envoie qu'une fois sur un double clic", () => {
    const envoi = vi.fn();

    function Consommateur() {
      const [envoiEnCours, setEnvoiEnCours] = useState(false);
      return (
        <ConfirmSendDialog
          open
          onOpenChange={() => {}}
          title="Envoyer le lien de paiement ?"
          recipient="client@exemple.fr"
          pending={envoiEnCours}
          onConfirm={() => {
            if (envoiEnCours) return;
            setEnvoiEnCours(true);
            envoi();
          }}
        />
      );
    }

    render(<Consommateur />);
    const envoyer = screen.getByRole("button", { name: "Envoyer" });
    fireEvent.click(envoyer);
    fireEvent.click(envoyer);

    expect(envoi).toHaveBeenCalledTimes(1);
  });
});
