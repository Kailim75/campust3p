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
    echecCreationLignes: false,
  },
}));

vi.mock("@/components/ui/select", () => import("@/test/select-natif"));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { prenom: "Jean", nom: "Dupont", email: "jean@example.fr", rue: "1 rue A", code_postal: "75001", ville: "Paris" },
            error: null,
          }),
        }),
      }),
    }),
  },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() } }));
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
      return { id: "nouvelle", numero_facture: "FAC-2026-9999" };
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
      if (etat.echecCreationLignes) throw new Error("insertion refusée");
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

function afficher(facture: Facture & { total_paye?: number }) {
  return render(<FactureFormDialog open onOpenChange={() => {}} facture={facture} />);
}

function selectStatut(): HTMLSelectElement {
  // « Émise » est la seule option présente dans les DEUX états du sélecteur
  // (brouillon : Brouillon/Émise ; facture émise : les cinq statuts d'après
  // émission). « Payée » ne l'est plus pour un brouillon.
  const trouve = screen
    .getAllByTestId("select-natif")
    .find((s) => within(s).queryByText("Émise"));
  if (!trouve) throw new Error("sélecteur de statut introuvable");
  return trouve as HTMLSelectElement;
}

function optionsStatutAffichees(): string[] {
  return Array.from(selectStatut().querySelectorAll("option"))
    .map((o) => o.textContent || "")
    .filter(Boolean);
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

describe("FactureFormDialog — statuts proposés avant émission", () => {
  beforeEach(() => {
    journal.length = 0;
    etat.statutEnBase = "brouillon";
    etat.lignes = [
      { id: "l1", facture_id: "f1", catalogue_formation_id: null, description: "Formation VTC", quantite: 1, prix_unitaire_ht: 1800, tva_percent: 0 },
    ];
  });

  it("facture NEUVE : Brouillon ou Émise, jamais Annulée ni Payée", () => {
    // Née « Annulée », la facture est figée et indestructible aussitôt (banc :
    // INSERT accepté, puis « Mise à la corbeille refusée … Une facture émise ne
    // se supprime pas »), et actionsGestionFacture n'offre plus rien.
    render(<FactureFormDialog open onOpenChange={() => {}} defaultContactId="k1" />);
    expect(optionsStatutAffichees()).toEqual(["Brouillon", "Émise"]);
  });

  it("BROUILLON en édition : Brouillon ou Émise, jamais Payée ni Annulée", async () => {
    // Un brouillon passé directement à « payee » sort du brouillon SANS armer
    // snapshot_facture_on_emission (armé sur le seul statut 'emise') : buyer_*,
    // montant_ht et date_emission restent NULL et la garde gèle la facture.
    afficher({ ...base });
    await screen.findByDisplayValue("Formation VTC");
    expect(optionsStatutAffichees()).toEqual(["Brouillon", "Émise"]);
  });
});

describe("FactureFormDialog — création directement « Émise »", () => {
  beforeEach(() => {
    journal.length = 0;
    etat.lignes = [];
    etat.echecCreationLignes = false;
    vi.mocked(toast.warning).mockClear();
    vi.mocked(toast.success).mockClear();
  });

  it("fige les coordonnées de l'acheteur et le montant HT dans l'INSERT", async () => {
    // `snapshot_facture_on_emission` est un BEFORE UPDATE : il ne passera jamais
    // sur une facture née émise. Sans ce bloc, buyer_* et montant_ht restent
    // NULL, la garde les gèle, et le PDF suit la fiche contact vivante à vie.
    render(<FactureFormDialog open onOpenChange={() => {}} defaultContactId="k1" />);

    fireEvent.click(screen.getByRole("button", { name: /Ligne libre/ }));
    fireEvent.change(screen.getByPlaceholderText("Description"), { target: { value: "Formation VTC" } });
    const prix = document.querySelector('input[step="0.01"]') as HTMLInputElement;
    fireEvent.change(prix, { target: { value: "1800" } });
    fireEvent.change(selectStatut(), { target: { value: "emise" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer la facture" }));

    await waitFor(() => expect(journal.map((j) => j.op)).toEqual(["createFacture", "createLignes"]));
    expect(journal[0].args).toMatchObject({
      statut: "emise",
      buyer_type: "b2c",
      buyer_name_snapshot: "Jean Dupont",
      buyer_address_snapshot: { line1: "1 rue A", postal_code: "75001", city: "Paris", country: "FR" },
      buyer_email_facturation: "jean@example.fr",
      montant_ht: 1800,
      montant_tva: 0,
    });
  });

  it("date d'émission laissée vide : la facture naît avec la date DU JOUR et la mention de TVA", async () => {
    // Le champ est facultatif (zod `optional`) et le déclencheur est un BEFORE
    // UPDATE : sans ce défaut, date_emission reste NULL pour toujours
    // (compliance 89, anomalie INVOICE_DATE bloquante), et la garde refuse
    // ensuite toute réparation — « est figé (date d'émission) ». D5.
    render(<FactureFormDialog open onOpenChange={() => {}} defaultContactId="k1" />);

    fireEvent.click(screen.getByRole("button", { name: /Ligne libre/ }));
    fireEvent.change(screen.getByPlaceholderText("Description"), { target: { value: "Formation VTC" } });
    const prix = document.querySelector('input[step="0.01"]') as HTMLInputElement;
    fireEvent.change(prix, { target: { value: "1800" } });
    fireEvent.change(selectStatut(), { target: { value: "emise" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer la facture" }));

    await waitFor(() => expect(journal.map((j) => j.op)).toEqual(["createFacture", "createLignes"]));
    const args = journal[0].args as Record<string, unknown>;
    expect(args.date_emission).toBe(new Date().toISOString().slice(0, 10));
    expect(args.date_emission).not.toBeNull();
    expect(args.motif_exoneration_tva).toBe("TVA non applicable, art. 261-4-4°a du CGI");
  });

  it("lignes non enregistrées : le message dit de réessayer tout de suite", async () => {
    // La facture émise existe déjà, ses montants sont figés : la garde ne laisse
    // rattraper les lignes que dans les quinze minutes (banc : accepté à 5 min,
    // « Ajout de ligne refusé » à 20).
    etat.echecCreationLignes = true;
    render(<FactureFormDialog open onOpenChange={() => {}} defaultContactId="k1" />);

    fireEvent.click(screen.getByRole("button", { name: /Ligne libre/ }));
    fireEvent.change(screen.getByPlaceholderText("Description"), { target: { value: "Formation VTC" } });
    fireEvent.change(selectStatut(), { target: { value: "emise" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer la facture" }));

    await waitFor(() =>
      expect(toast.warning).toHaveBeenCalledWith(expect.stringMatching(/réessayez immédiatement/)),
    );
    expect(vi.mocked(toast.warning).mock.calls[0][0]).toMatch(/FAC-2026-9999/);
    expect(toast.success).not.toHaveBeenCalledWith("Facture créée");
  });

  it("un brouillon ne change pas : aucune coordonnée figée dans l'INSERT", async () => {
    render(<FactureFormDialog open onOpenChange={() => {}} defaultContactId="k1" />);

    fireEvent.click(screen.getByRole("button", { name: /Ligne libre/ }));
    fireEvent.change(screen.getByPlaceholderText("Description"), { target: { value: "Formation VTC" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer la facture" }));

    await waitFor(() => expect(journal.map((j) => j.op)).toEqual(["createFacture", "createLignes"]));
    expect(journal[0].args).not.toHaveProperty("buyer_name_snapshot");
    expect(journal[0].args).not.toHaveProperty("montant_ht");
  });
});

describe("FactureFormDialog — facture émise en base (F1b, F1c)", () => {
  beforeEach(() => {
    journal.length = 0;
    vi.mocked(toast.info).mockClear();
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

  it("la confirmation annonce l'argent déjà encaissé (D7)", async () => {
    // C'est le chemin d'annulation le plus emprunté (crayon « Modifier » de la
    // fiche session, qui passe un FactureWithDetails porteur de total_paye) :
    // il doit prévenir, comme la fiche facture, que les paiements restent
    // rattachés à la facture annulée — les remboursements sont reportés.
    afficher({ ...base, statut: "emise", total_paye: 990 });
    await screen.findByDisplayValue("Formation VTC");

    fireEvent.change(selectStatut(), { target: { value: "annulee" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer le statut" }));

    expect(await screen.findByText(/990,00 € de paiements/)).toBeInTheDocument();
  });

  it("statut non touché : aucune écriture, même si la facture a bougé en base", async () => {
    // Le sélecteur porte la valeur de la copie en CACHE (« emise ») ; en base,
    // un versement enregistré ailleurs l'a passée à « partiel ». Un clic sans
    // rien changer réécrivait « emise » par-dessus — accepté par la garde
    // (transitions emise/partiel/payee/impayee libres), donc silencieux.
    etat.statutEnBase = "partiel";
    afficher({ ...base, statut: "emise" });
    await screen.findByDisplayValue("Formation VTC");

    fireEvent.click(screen.getByRole("button", { name: "Enregistrer le statut" }));

    await waitFor(() => expect(toast.info).toHaveBeenCalledWith("Aucune modification à enregistrer"));
    expect(journal).toEqual([]);
  });
});
