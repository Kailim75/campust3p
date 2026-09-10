import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";

/**
 * Le bouton flottant est monté sur toutes les pages : l'assistant doit rester
 * chargé paresseusement, mais son garde de montage ne doit pas vider le
 * dialogue pendant l'animation de sortie de Radix (cadre blanc à la fermeture).
 */

const { chargerAssistant } = vi.hoisted(() => ({ chargerAssistant: vi.fn() }));

vi.mock("../AIAssistant", () => {
  chargerAssistant();
  return { AIAssistant: () => <div data-testid="assistant">Assistant IA</div> };
});

import { AIAssistantFloatingButton } from "../AIAssistantFloatingButton";

// jsdom ne calcule aucune animation : Presence (Radix) démonterait donc le
// contenu immédiatement. On simule l'animation CSS de dialog.tsx en dérivant
// `animationName` de `data-state`, sinon la fermeture animée n'est pas testable.
const getComputedStyleReel = window.getComputedStyle.bind(window);

beforeEach(() => {
  chargerAssistant.mockClear();
  window.getComputedStyle = ((element: Element, pseudo?: string | null) => {
    const styles = getComputedStyleReel(element, pseudo ?? undefined);
    if (!element.hasAttribute?.("data-state")) return styles;
    return new Proxy(styles, {
      get(cible, prop, _recepteur) {
        if (prop === "animationName") {
          return element.getAttribute("data-state") === "closed" ? "sortie" : "entree";
        }
        const valeur = Reflect.get(cible, prop, cible);
        return typeof valeur === "function" ? valeur.bind(cible) : valeur;
      },
    });
  }) as typeof window.getComputedStyle;
});

afterEach(() => {
  cleanup();
  window.getComputedStyle = getComputedStyleReel;
});

describe("AIAssistantFloatingButton", () => {
  it("ne charge pas l'assistant tant que le dialogue n'a jamais été ouvert", () => {
    render(<AIAssistantFloatingButton />);

    expect(chargerAssistant).not.toHaveBeenCalled();
    expect(screen.queryByTestId("assistant")).toBeNull();
  });

  it("monte l'assistant à la première ouverture", async () => {
    render(<AIAssistantFloatingButton />);
    fireEvent.click(screen.getByLabelText("Ouvrir l'assistant IA"));

    expect(await screen.findByTestId("assistant")).toBeInTheDocument();
    expect(chargerAssistant).toHaveBeenCalledTimes(1);
  });

  it("garde l'assistant affiché pendant l'animation de fermeture", async () => {
    render(<AIAssistantFloatingButton />);
    fireEvent.click(screen.getByLabelText("Ouvrir l'assistant IA"));
    await screen.findByTestId("assistant");

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toHaveAttribute("data-state", "closed");
    });
    expect(screen.getByTestId("assistant")).toBeInTheDocument();
  });
});
