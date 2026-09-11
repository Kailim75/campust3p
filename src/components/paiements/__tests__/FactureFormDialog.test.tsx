import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";

/**
 * Garde des factures émises, volet interface (11/09/2026) — FactureFormDialog.
 *
 * Panne 1 (banc PGlite) : en édition, le dialogue mettait à jour la facture,
 * statut compris, PUIS supprimait et réinsérait les lignes. Un brouillon passé
 * à « Émise » devenait émis avec ses anciennes lignes (montant HT figé faux),
 * puis la garde refusait la suppression des lignes : sauvegarde partielle.
 * Panne 3 : sur une facture émise, le dialogue renvoyait toutes les colonnes
 * (commentaires '' → NULL) et l'annulation était refusée.
 */

const { journal, etat } = vi.hoisted(() => ({
  journal: [] as { op: string; args: unknown }[],
  etat: {
    statutEnBase: "brouillon",
    annulationPermise: true,
    lignes: [] as Record<string, unknown>[],
  },
}));

vi.mock("@/components/ui/select", () => import("@/test/select-natif"));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("@/components/ui/contact-combobox", async () => {
  const React = await import("react");
  return {
    ContactCombobox: ({ value, disabled }: { value: string; disabled?: boolean }) =>
      React.createElement("input", { "aria-label": "Apprenant", value, disabled, readOnly: true }),
  };
});
vi.mock("@/hooks/useContacts", () => ({
  useContacts: () => ({ data: [{ id: "k1", prenom: "Jean", nom: "Dupont" }] }),
}));
vi.mock("@/hooks/usePartners", () => ({ usePartners: () => ({ data: [] }) }));
vi.mock("@/hooks/useCatalogueFormations", () => ({ useCatalogueFormations: () => ({ data: [] }) }));
vi.mock("@/hooks/useFactures", () => ({
  useCreateFacture: () => ({
    mutateAsync: async (args: unknown) => {
      journal.push({ op: "createFacture", args });
      return { id: "nouvelle" };
    },
  }),
  useUpdateFacture: () => ({
    mutateAsync: async (args: unknown) => {
      journal.push({ op: "updateFacture", args });
    },
  }),
  useGenerateNumeroFacture: () => ({ data: "FAC-2026-9999" }),
  useAnnulationManuellePermise: () => ({ data: etat.annulationPermise }),
  lireStatutFactureEnBase: async () => etat.statutEnBase,
}));
vi.mock("@/hooks/useFactureLignes", () => ({
  useFactureLignes: () => ({ data: etat.lignes, isLoading: false }),
  useCreateFactureLignes: () => ({
    mutateAsync: async (args: unknown) => {
      journal.push({ op: "createLignes", args });
    },
  }),
  useDeleteFactureLignesByFacture: () => ({
    mutateAsync: async (args: unknown) => {
      journal.push({ op: "deleteLignes", args });
    },
  }),
}));

import { toast } from "sonner";
import { FactureFormDialog } from "../FactureFormDialog";
import type { Facture } from "@/hooks/useFactures";

const base: Facture = {
  id: "f1",
  contact_id: "k1",
  client_partner_id: null,
  session_inscription_id: null,
  numero_facture: "FAC-2026-0518",
  montant_total: 1800,
  type_financement: "personnel",
  statut: "brouillon",
  date_emission: null,
  date_echeance: null,
  commentaires: "",
  created_at: "2026-09-01T10:00:00Z",
  updated_at: "2026-09-01T10:00:00Z",
};

function afficher(facture: Facture) {
  return render(<FactureFormDialog open onOpenChange={() => {}} facture={facture} />);
}

function selectStatut(): HTMLSelectElement {
  const trouve = screen
    .getAllByTestId("select-natif")
    .find((s) => within(s).queryByText("Payée"));
  if (!trouve) throw new Error("sélecteur de statut introuvable");
  return trouve as HTMLSelectElement;
}

describe("FactureFormDialog — brouillon en base (F1a)", () => {
  beforeEach(() => {
    journal.length = 0;
    vi.mocked(toast.error).mockClear();
    etat.statutEnBase = "brouillon";
    etat.annulationPermise = true;
    etat.lignes = [
      { id: "l1", facture_id: "f1", catalogue_formation_id: null, description: "Formation VTC", quantite: 1, prix_unitaire_ht: 1800, tva_percent: 0 },
    ];
  });

  it("émettre un brouillon écrit les lignes PUIS la facture avec son statut", async () => {
    afficher({ ...base });
    await screen.findByDisplayValue("Formation VTC");

    fireEvent.change(selectStatut(), { target: { value: "emise" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => expect(journal.map((j) => j.op)).toEqual(["deleteLignes", "createLignes", "updateFacture"]));
    expect(journal[2].args).toMatchObject({ id: "f1", statut: "emise", montant_total: 1800 });
  });

  it("facture émise ailleurs depuis l'ouverture : aucune écriture, message clair", async () => {
    etat.statutEnBase = "emise";
    afficher({ ...base });
    await screen.findByDisplayValue("Formation VTC");

    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/a été émise depuis l'ouverture/)));
    expect(journal).toEqual([]);
  });
});

describe("FactureFormDialog — facture émise en base (F1b, F1c)", () => {
  beforeEach(() => {
    journal.length = 0;
    etat.statutEnBase = "emise";
    etat.annulationPermise = true;
    etat.lignes = [
      { id: "l1", facture_id: "f1", catalogue_formation_id: null, description: "Formation VTC", quantite: 1, prix_unitaire_ht: 1800, tva_percent: 0 },
    ];
  });

  it("lecture seule : lignes et observations désactivées, pas d'option Brouillon", async () => {
    afficher({ ...base, statut: "emise" });
    expect(await screen.findByDisplayValue("Formation VTC")).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Ligne libre/ })).toBeNull();
    expect(within(selectStatut()).queryByText("Brouillon")).toBeNull();
    expect(selectStatut()).toBeEnabled();
  });

  it("n'envoie QUE { statut } et ne touche jamais aux lignes (commentaires '' en base)", async () => {
    afficher({ ...base, statut: "emise", commentaires: "" });
    await screen.findByDisplayValue("Formation VTC");

    fireEvent.change(selectStatut(), { target: { value: "payee" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer le statut" }));

    await waitFor(() => expect(journal).toHaveLength(1));
    expect(journal[0]).toEqual({ op: "updateFacture", args: { id: "f1", statut: "payee" } });
  });

  it("le passage à Annulée demande une confirmation explicite avant toute écriture", async () => {
    afficher({ ...base, statut: "emise" });
    await screen.findByDisplayValue("Formation VTC");

    fireEvent.change(selectStatut(), { target: { value: "annulee" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer le statut" }));

    expect(await screen.findByText("Annuler cette facture émise ?")).toBeInTheDocument();
    expect(screen.getByText(/garde son numéro/)).toBeInTheDocument();
    expect(screen.getByText(/Un avoir devra être émis/)).toBeInTheDocument();
    expect(journal).toEqual([]);

    fireEvent.click(screen.getByRole("button", { name: "Confirmer l'annulation" }));
    await waitFor(() => expect(journal).toEqual([{ op: "updateFacture", args: { id: "f1", statut: "annulee" } }]));
  });
});
