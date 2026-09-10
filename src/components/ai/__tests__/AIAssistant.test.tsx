import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

/**
 * Chargé paresseusement, l'assistant n'existe pas encore quand FocusScope
 * (Radix) pose le focus initial du dialogue : celui-ci tombait alors sur la
 * croix de fermeture. L'assistant doit reprendre le focus à son montage.
 */

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "u1" }, session: null, loading: false, isAuthenticated: true }),
}));

// ScrollArea (Radix) observe ses dimensions ; jsdom n'a pas ResizeObserver.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

import { AIAssistant } from "../AIAssistant";

describe("AIAssistant", () => {
  it("place le focus sur le champ de saisie dès son montage", () => {
    render(<AIAssistant />);

    const champ = screen.getByPlaceholderText("Ex: Créer un contact Jean Dupont");
    expect(document.activeElement).toBe(champ);
  });
});
