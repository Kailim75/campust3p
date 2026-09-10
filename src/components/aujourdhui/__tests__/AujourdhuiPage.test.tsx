import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Deux garde-fous sur le hub :
 * — le bandeau « Par quoi commencer » ne doit pas se vider parce qu'un bloc a
 *   été mis en sommeil (les impayés échus y sont la seule entrée de rang 4) ;
 * — un rafraîchissement en échec ne doit pas démonter la page (le brouillon
 *   du composeur d'email vit dans un state local).
 */

const donneesMock = vi.fn();

vi.mock("../useAujourdhuiData", () => ({
  useAujourdhuiData: () => donneesMock(),
}));

vi.mock("@/components/layout/Header", () => ({
  Header: ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  ),
}));
vi.mock("@/components/apprenants/ApprenantDetailSheet", () => ({ ApprenantDetailSheet: () => null }));
vi.mock("@/components/prospects/ProspectDetailSheet", () => ({ ProspectDetailSheet: () => null }));
vi.mock("@/components/email/EmailComposerModal", () => ({
  EmailComposerModal: () => <div>Composeur monté</div>,
}));
// jsdom n'expose pas localStorage ici, dont la bulle d'astuce dépend.
vi.mock("@/components/shared/HintBubble", () => ({ HintBubble: () => null }));

import { AujourdhuiPage } from "../AujourdhuiPage";

const CRITIQUE = {
  id: "c1",
  prenom: "Doudou",
  nom: "MAHDI",
  reasons: ["Paiement en retard"],
  _isActive: true,
};

function donnees(surcharge: Record<string, unknown> = {}) {
  return {
    cmaItems: [], rdvToday: [], relances: [], critiques: [CRITIQUE], carteProItems: [],
    reprogramItems: [], resultatsAVerifier: [], convocationsAttendues: [], boitesMailAConsulter: [],
    sessionPrepItems: [], qualiopiSessions: [], crmQualityItems: [], crmQualitySummary: null,
    todayNotes: [], recentNotes: [], journalEntries: [], postponedKeys: [], totalActions: 0,
    ...surcharge,
  };
}

function afficher(query: Record<string, unknown>) {
  donneesMock.mockReturnValue({
    isLoading: false,
    isError: false,
    isFetching: false,
    dataUpdatedAt: new Date("2026-09-10T09:32:00").getTime(),
    refetch: vi.fn(),
    ...query,
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AujourdhuiPage />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AujourdhuiPage", () => {
  it("garde les apprenants critiques dans « Par quoi commencer » malgré le bloc en sommeil", () => {
    afficher({ data: donnees() });

    expect(screen.getByText("Par quoi commencer")).toBeInTheDocument();
    expect(screen.getByText("Doudou MAHDI")).toBeInTheDocument();
    expect(screen.getByText("Paiement en retard")).toBeInTheDocument();
    // Le bloc lui-même reste en sommeil.
    expect(screen.queryByText("Apprenants critiques")).not.toBeInTheDocument();
  });

  it("conserve la page et le composeur quand seul le rafraîchissement échoue", () => {
    afficher({ data: donnees(), isError: true });

    expect(screen.getByRole("alert")).toHaveTextContent("Impossible d'actualiser votre journée");
    expect(screen.getByRole("alert")).toHaveTextContent("09:32");
    expect(screen.getByText("Par quoi commencer")).toBeInTheDocument();
    expect(screen.getByText("Composeur monté")).toBeInTheDocument();
  });

  it("remplace la page par l'erreur quand rien n'a pu être chargé", () => {
    afficher({ data: undefined, isError: true });

    expect(screen.getByRole("alert")).toHaveTextContent("Impossible de charger votre journée");
    expect(screen.queryByText("Par quoi commencer")).not.toBeInTheDocument();
    expect(screen.queryByText("Composeur monté")).not.toBeInTheDocument();
  });
});
