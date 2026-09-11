import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Garde des factures émises, volet interface (11/09/2026) — EditFactureLibreDialog.
 *
 * Panne 2 (banc PGlite) : le dialogue écrivait la facture (statut compris) PUIS
 * la première ligne. Un brouillon émis en corrigeant le montant figeait une
 * facture fausse. Panne 3 : sur une facture émise, toutes les colonnes étaient
 * renvoyées et l'annulation refusée.
 */

const { journal, etat } = vi.hoisted(() => ({
  journal: [] as { op: string; args: unknown }[],
  etat: { statutEnBase: "brouillon", lignes: [] as Record<string, unknown>[] },
}));

vi.mock("@/components/ui/select", () => import("@/test/select-natif"));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("@/hooks/useFactures", () => ({
  useUpdateFacture: () => ({
    mutateAsync: async (args: unknown) => {
      journal.push({ op: "updateFacture", args });
    },
  }),
  useAnnulationManuellePermise: () => ({ data: true }),
  lireStatutFactureEnBase: async () => etat.statutEnBase,
}));
vi.mock("@/hooks/useFactureLignes", () => ({
  useFactureLignes: () => ({ data: etat.lignes, isLoading: false }),
  useUpdateFactureLigne: () => ({
    mutateAsync: async (args: unknown) => {
      journal.push({ op: "updateLigne", args });
    },
  }),
}));

import { toast } from "sonner";
import { EditFactureLibreDialog } from "../EditFactureLibreDialog";

type FactureLibre = {
  id: string;
  numero_facture?: string;
  montant_total: number;
  type_financement?: string;
  statut: string;
  commentaires?: string | null;
  total_paye?: number;
};

const base: FactureLibre = {
  id: "f2",
  numero_facture: "FAC-2026-0600",
  montant_total: 1000,
  type_financement: "personnel",
  statut: "brouillon",
  commentaires: "",
};

function afficher(facture: FactureLibre) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <EditFactureLibreDialog open onOpenChange={() => {}} facture={facture} contactId="k1" />
    </QueryClientProvider>,
  );
}

function selectStatut(): HTMLSelectElement {
  // « Émise » est la seule option commune aux deux états du sélecteur.
  const trouve = screen.getAllByTestId("select-natif").find((s) => within(s).queryByText("Émise"));
  if (!trouve) throw new Error("sélecteur de statut introuvable");
  return trouve as HTMLSelectElement;
}

function optionsStatutAffichees(): string[] {
  return Array.from(selectStatut().querySelectorAll("option"))
    .map((o) => o.textContent || "")
    .filter(Boolean);
}

describe("EditFactureLibreDialog", () => {
  beforeEach(() => {
    journal.length = 0;
    vi.mocked(toast.error).mockClear();
    vi.mocked(toast.info).mockClear();
    etat.statutEnBase = "brouillon";
    etat.lignes = [{ id: "l9", facture_id: "f2", description: "Forfait", quantite: 1, prix_unitaire_ht: 1000 }];
  });

  it("brouillon émis avec montant corrigé : première ligne PUIS facture (F1a)", async () => {
    afficher({ ...base });
    await screen.findByDisplayValue("Forfait");

    fireEvent.change(screen.getByDisplayValue("1000"), { target: { value: "900" } });
    fireEvent.change(selectStatut(), { target: { value: "emise" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => expect(journal.map((j) => j.op)).toEqual(["updateLigne", "updateFacture"]));
    expect(journal[0].args).toEqual({ id: "l9", factureId: "f2", description: "Forfait", prix_unitaire_ht: 900 });
    expect(journal[1].args).toEqual({
      id: "f2",
      montant_total: 900,
      type_financement: "personnel",
      statut: "emise",
      commentaires: null,
    });
  });

  it("facture émise ailleurs depuis l'ouverture : aucune écriture, message clair", async () => {
    // Le statut RELU en base décide, pas la copie portée par la prop : sans
    // cette relecture, un formulaire ouvert en brouillon réécrirait la ligne
    // d'une facture devenue figée (corruptrice tant que la garde n'est pas là).
    etat.statutEnBase = "emise";
    afficher({ ...base });
    await screen.findByDisplayValue("Forfait");

    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/a été émise depuis l'ouverture/)),
    );
    expect(journal).toEqual([]);
  });

  it("facture émise : lecture seule, confirmation puis { statut } seul (F1b, F1c)", async () => {
    etat.statutEnBase = "emise";
    afficher({ ...base, statut: "emise", commentaires: "" });
    expect(await screen.findByDisplayValue("Forfait")).toBeDisabled();
    expect(within(selectStatut()).queryByText("Brouillon")).toBeNull();

    fireEvent.change(selectStatut(), { target: { value: "annulee" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer le statut" }));

    expect(await screen.findByText("Annuler cette facture émise ?")).toBeInTheDocument();
    expect(journal).toEqual([]);

    fireEvent.click(screen.getByRole("button", { name: "Confirmer l'annulation" }));
    await waitFor(() => expect(journal).toEqual([{ op: "updateFacture", args: { id: "f2", statut: "annulee" } }]));
  });

  it("la confirmation annonce l'argent déjà encaissé (D7)", async () => {
    // Moitié des chemins d'annulation : depuis l'onglet Paiements d'un
    // apprenant. PaiementsTab a les paiements en main — la boîte ne doit pas
    // être muette sur l'argent qui restera rattaché à la facture annulée.
    etat.statutEnBase = "emise";
    afficher({ ...base, statut: "emise", total_paye: 900 });
    await screen.findByDisplayValue("Forfait");

    fireEvent.change(selectStatut(), { target: { value: "annulee" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer le statut" }));

    expect(await screen.findByText(/900,00 € de paiements/)).toBeInTheDocument();
  });

  it("brouillon : seuls « Brouillon » et « Émise » sont proposés", async () => {
    // Passer un brouillon directement à « Payée » le ferait sortir du brouillon
    // sans armer le déclencheur de snapshot : mesuré au banc, buyer_*,
    // montant_ht et montant_tva restent NULL et la garde gèle la facture.
    afficher({ ...base });
    await screen.findByDisplayValue("Forfait");
    expect(optionsStatutAffichees()).toEqual(["Brouillon", "Émise"]);
  });

  it("statut non touché : aucune écriture, même si la facture a bougé en base", async () => {
    etat.statutEnBase = "partiel";
    afficher({ ...base, statut: "emise" });
    await screen.findByDisplayValue("Forfait");

    fireEvent.click(screen.getByRole("button", { name: "Enregistrer le statut" }));

    await waitFor(() => expect(toast.info).toHaveBeenCalledWith("Aucune modification à enregistrer"));
    expect(journal).toEqual([]);
  });
});
