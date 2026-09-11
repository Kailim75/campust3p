import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";

/**
 * Une « facture libre » naît directement « emise ». Le déclencheur
 * `snapshot_facture_on_emission` étant un BEFORE **UPDATE**, elle ne reçoit
 * aucune coordonnée figée de la base : sans le bloc posé dans l'INSERT, le PDF
 * d'une facture libre à une entreprise change de raison sociale et de SIRET dès
 * qu'on renomme le partenaire (D2 du 11/09/2026).
 */

const { journal, fiches } = vi.hoisted(() => ({
  journal: [] as { op: string; args: unknown }[],
  fiches: {
    partners: {
      company_name: "ACME SARL",
      email: "contact@acme.fr",
      email_facturation: "factures@acme.fr",
      address: "3 rue B",
      code_postal: "31000",
      ville: "Toulouse",
      siret: "99988877700022",
      tva_intracom: "FR70999888777",
    } as Record<string, unknown> | null,
    contacts: { prenom: "Jean", nom: "Dupont", email: "jean@example.fr", rue: "1 rue A", code_postal: "75001", ville: "Paris" } as Record<string, unknown> | null,
  },
}));

vi.mock("@/components/ui/select", () => import("@/test/select-natif"));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: table === "partners" ? fiches.partners : fiches.contacts,
            error: null,
          }),
        }),
      }),
    }),
  },
}));
vi.mock("@/components/ui/contact-combobox", async () => {
  const React = await import("react");
  return {
    ContactCombobox: ({ value, onValueChange }: { value: string; onValueChange: (v: string) => void }) =>
      React.createElement("input", {
        "aria-label": "Client",
        value,
        onChange: (e: { target: { value: string } }) => onValueChange(e.target.value),
      }),
  };
});
vi.mock("@/hooks/useContacts", () => ({
  useContacts: () => ({ data: [{ id: "c1", prenom: "Jean", nom: "Dupont" }] }),
  useCreateContact: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/hooks/usePartners", () => ({
  usePartners: () => ({ data: [{ id: "p1", company_name: "ACME SARL", category: "client", is_active: true }] }),
  useCreatePartner: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/hooks/useProduitsServices", () => ({
  useProduitsServices: () => ({ data: [] }),
  PRODUIT_TYPE_LABELS: {},
}));
vi.mock("@/hooks/useFactures", () => ({
  useCreateFacture: () => ({
    mutateAsync: async (args: unknown) => {
      journal.push({ op: "createFacture", args });
      return { id: "nouvelle" };
    },
  }),
  useGenerateNumeroFacture: () => ({ data: "FAC-2026-0700" }),
}));
vi.mock("@/hooks/useFactureLignes", () => ({
  useCreateFactureLignes: () => ({
    mutateAsync: async (args: unknown) => {
      journal.push({ op: "createLignes", args });
    },
  }),
}));

import { FactureLibreDialog } from "../FactureLibreDialog";

function remplirLaLigne() {
  fireEvent.change(screen.getByPlaceholderText("Ex: Location salle de formation – journée"), {
    target: { value: "Location de salle" },
  });
  fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "1000" } });
}

function soumettre() {
  fireEvent.submit(document.querySelector("form") as HTMLFormElement);
}

describe("FactureLibreDialog — facture née émise", () => {
  beforeEach(() => {
    journal.length = 0;
  });

  it("particulier : coordonnées figées de l'apprenant et montants dans l'INSERT", async () => {
    render(<FactureLibreDialog open onOpenChange={() => {}} defaultContactId="c1" />);
    remplirLaLigne();
    soumettre();

    await waitFor(() => expect(journal.map((j) => j.op)).toEqual(["createFacture", "createLignes"]));
    expect(journal[0].args).toMatchObject({
      statut: "emise",
      buyer_type: "b2c",
      buyer_name_snapshot: "Jean Dupont",
      buyer_address_snapshot: { line1: "1 rue A", postal_code: "75001", city: "Paris", country: "FR" },
      montant_ht: 1000,
      montant_tva: 200,
    });
  });

  it("entreprise : raison sociale, SIRET et TVA intracom figés dans l'INSERT", async () => {
    render(<FactureLibreDialog open onOpenChange={() => {}} />);
    const onglet = screen.getByRole("tab", { name: /Entreprise/ });
    fireEvent.mouseDown(onglet);
    fireEvent.click(onglet);
    const selectEntreprise = await waitFor(() => {
      const trouve = screen.getAllByTestId("select-natif").find((s) => within(s).queryByText("ACME SARL"));
      if (!trouve) throw new Error("sélecteur d'entreprise introuvable");
      return trouve as HTMLSelectElement;
    });
    fireEvent.change(selectEntreprise, { target: { value: "p1" } });
    remplirLaLigne();
    soumettre();

    await waitFor(() => expect(journal.map((j) => j.op)).toEqual(["createFacture", "createLignes"]));
    expect(journal[0].args).toMatchObject({
      statut: "emise",
      buyer_type: "b2b",
      buyer_name_snapshot: "ACME SARL",
      buyer_siret: "99988877700022",
      buyer_tva_intracom: "FR70999888777",
      buyer_email_facturation: "factures@acme.fr",
    });
  });
});
