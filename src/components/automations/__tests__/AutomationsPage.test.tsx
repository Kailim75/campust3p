import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

/**
 * Deux garde-fous sur « Modèles & automatisations » :
 * — l'onglet IA a été retiré le 10/09/2026 : la page n'expose plus que 3
 *   onglets, et l'ancienne valeur « ia » ne doit plus ouvrir un onglet vide ;
 * — le deep-link d'onglet ne doit servir qu'une fois : `activeTab` vit dans
 *   l'état d'Index pour toute la session, donc sans remise à zéro la page
 *   rouvrirait indéfiniment l'onglet du dernier deep-link.
 */

const navigation = vi.fn();
const setActiveTab = vi.fn();

vi.mock("@/contexts/NavigationContext", () => ({
  useNavigation: () => navigation(),
}));

// Surfaces lourdes (Supabase, éditeur de modèles) hors périmètre de ce test.
vi.mock("@/components/template-studio/TemplateStudioPage", () => ({
  default: () => <div>Modèles de documents montés</div>,
}));
vi.mock("@/components/communications/CommunicationsPage", () => ({
  CommunicationsPage: () => <div>Modèles d'emails montés</div>,
}));
vi.mock("@/components/workflows/WorkflowsPage", () => ({
  WorkflowsPage: () => <div>Workflows montés</div>,
}));

import { AutomationsPage } from "../AutomationsPage";

function afficher(activeTab?: string) {
  navigation.mockReturnValue({
    activeSection: "automations",
    activeTab,
    setActiveTab,
    onNavigate: vi.fn(),
  });
  return render(<AutomationsPage />);
}

describe("AutomationsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("n'expose plus que les 3 onglets restants", () => {
    afficher();

    expect(screen.getAllByRole("tab")).toHaveLength(3);
    expect(screen.getByRole("tab", { name: /Modèles de documents/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Modèles d'emails/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Workflows/ })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /IA/ })).toBeNull();
  });

  it("ouvre les modèles de documents par défaut", () => {
    afficher();

    expect(screen.getByRole("tab", { name: /Modèles de documents/ })).toHaveAttribute("aria-selected", "true");
  });

  it("honore un deep-link d'onglet puis le consomme", () => {
    afficher("communications");

    expect(screen.getByRole("tab", { name: /Modèles d'emails/ })).toHaveAttribute("aria-selected", "true");
    expect(setActiveTab).toHaveBeenCalledWith(undefined);
  });

  it("retombe sur les modèles de documents pour un onglet inconnu, dont l'ancien « ia »", () => {
    afficher("ia");

    expect(screen.getByRole("tab", { name: /Modèles de documents/ })).toHaveAttribute("aria-selected", "true");
    expect(setActiveTab).toHaveBeenCalledWith(undefined);
  });
});
