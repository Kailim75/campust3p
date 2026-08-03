import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { Rappel } from "@/lib/rappels";

/**
 * Test de montage réel de la page. `tsc`, la suite unitaire et `vite build`
 * étaient tous verts le 21/07/2026 quand « Aujourd'hui » a planté en
 * production (React #310) : seul un rendu effectif le prouve.
 */

const reporter = vi.fn();
const cloturer = vi.fn();
const rappelsMock = vi.fn();

vi.mock("@/hooks/useRappels", () => ({
  useRappels: () => rappelsMock(),
  useReporterRappel: () => ({ mutate: reporter, mutateAsync: reporter, isPending: false }),
  useCloturerRappelLibre: () => ({ mutate: cloturer, mutateAsync: cloturer, isPending: false }),
  useCreerRappelLibre: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
}));

// Surfaces lourdes (Supabase, Radix Sheet) hors périmètre de ce test.
vi.mock("@/components/layout/Header", () => ({
  Header: ({ title }: { title: string }) => <h1>{title}</h1>,
}));
vi.mock("@/components/apprenants/ApprenantDetailSheet", () => ({
  ApprenantDetailSheet: () => null,
}));
vi.mock("@/components/paiements/PaiementFormDialog", () => ({
  PaiementFormDialog: ({ factureId }: { factureId: string }) => <div>Encaissement {factureId}</div>,
}));
vi.mock("./../NouveauRappelDialog", () => ({
  NouveauRappelDialog: ({ open }: { open: boolean }) => (open ? <div>Nouveau rappel ouvert</div> : null),
}));

import { RappelsPage } from "../RappelsPage";

const RAPPELS: Rappel[] = [
  {
    id: "rp:paiement:f1",
    source: "paiement",
    dateEcheance: "2026-04-14",
    titre: "Doudou MAHDI",
    detail: "990 € en retard depuis 111 j",
    joursDeRetard: 111,
    montant: 990,
    contactId: "c1",
    contactNom: "Doudou MAHDI",
    contactEmail: "d@x.fr",
    factureId: "f1",
    numeroFacture: "F-1",
  },
  {
    id: "rp:libre:h1",
    source: "libre",
    dateEcheance: "2026-08-03",
    titre: "Sofia KARAI",
    detail: "Rappeler pour le solde",
    joursDeRetard: 0,
    contactId: "c2",
    contactNom: "Sofia KARAI",
    historiqueId: "h1",
  },
  {
    id: "rp:session:s1",
    source: "session",
    dateEcheance: "2026-08-20",
    titre: "Taxi Août",
    detail: "Sans formateur — démarre dans 17 j",
    joursDeRetard: -10,
    sessionId: "s1",
  },
];

function afficher(rappels: Rappel[] = RAPPELS, isLoading = false) {
  rappelsMock.mockReturnValue({ rappels, isLoading });
  return render(
    <MemoryRouter>
      <RappelsPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("RappelsPage", () => {
  it("se monte et affiche les compteurs par échéance", () => {
    afficher();
    expect(screen.getByRole("heading", { name: "Rappels" })).toBeInTheDocument();
    expect(screen.getByText("En retard").closest("button")).toHaveTextContent("(1)");
    expect(screen.getByText("Aujourd'hui").closest("button")).toHaveTextContent("(1)");
    expect(screen.getByText("Tout").closest("button")).toHaveTextContent("(3)");
  });

  it("totalise les impayés en retard", () => {
    afficher();
    expect(screen.getByText("990 €")).toBeInTheDocument();
    expect(screen.getByText("impayés en retard")).toBeInTheDocument();
  });

  it("ouvre sur les retards et bascule de filtre", () => {
    afficher();
    // Filtre par défaut : « En retard ».
    expect(screen.getByText("Doudou MAHDI")).toBeInTheDocument();
    expect(screen.queryByText("Sofia KARAI")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Tout"));
    expect(screen.getByText("Sofia KARAI")).toBeInTheDocument();
    expect(screen.getByText("Taxi Août")).toBeInTheDocument();
  });

  it("propose les bonnes actions selon la source", () => {
    afficher();
    // Paiement : relancer + encaisser.
    expect(screen.getByRole("button", { name: "Relancer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Encaisser" })).toBeInTheDocument();

    fireEvent.click(screen.getByText("Tout"));
    // Rappel perso : clôturable ; session : ouvrable.
    expect(screen.getByRole("button", { name: /Fait/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ouvrir la session" })).toBeInTheDocument();
  });

  it("clôture un rappel perso via la note d'historique", () => {
    afficher();
    fireEvent.click(screen.getByText("Tout"));
    fireEvent.click(screen.getByRole("button", { name: /Fait/ }));
    expect(cloturer).toHaveBeenCalledWith("h1");
  });

  it("filtre sur la recherche", () => {
    afficher();
    fireEvent.click(screen.getByText("Tout"));
    fireEvent.change(screen.getByPlaceholderText("Rechercher un nom…"), { target: { value: "karai" } });
    expect(screen.getByText("Sofia KARAI")).toBeInTheDocument();
    expect(screen.queryByText("Doudou MAHDI")).not.toBeInTheDocument();
  });

  it("affiche un état vide quand il n'y a aucun retard", () => {
    afficher([]);
    expect(screen.getByText("Aucun retard")).toBeInTheDocument();
  });
});
