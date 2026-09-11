import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

/**
 * Fiche facture (11/09/2026) :
 *  F2  « Supprimer la facture » n'est proposé que pour un brouillon ; une
 *      facture émise non annulée propose « Annuler la facture », confirmée.
 *  F3  après un REFUS de la base, la fiche n'annonce plus « Facture supprimée »
 *      et ne se ferme plus.
 *  F5  le PDF d'une facture émise imprime les coordonnées figées de l'acheteur.
 */

const { journal, etat, generateFacturePDF } = vi.hoisted(() => ({
  journal: [] as { op: string; args: unknown }[],
  etat: {
    facture: null as Record<string, unknown> | null,
    suppressionAcceptee: true,
    annulationPermise: true,
  },
  generateFacturePDF: vi.fn((..._args: unknown[]) => ({ output: () => "data:application/pdf;base64,XX" })),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("@/components/ui/drawer", async () => {
  const React = await import("react");
  const bloc = ({ children }: { children?: React.ReactNode }) => React.createElement("div", null, children);
  return {
    Drawer: ({ open, children }: { open: boolean; children?: React.ReactNode }) =>
      open ? React.createElement("div", null, children) : null,
    DrawerContent: bloc,
    DrawerHeader: bloc,
    DrawerTitle: bloc,
  };
});
vi.mock("@/components/ui/tabs", async () => {
  const React = await import("react");
  const bloc = ({ children }: { children?: React.ReactNode }) => React.createElement("div", null, children);
  return { Tabs: bloc, TabsList: bloc, TabsTrigger: bloc, TabsContent: bloc };
});
vi.mock("@/hooks/useFactures", () => ({
  useFacture: () => ({
    data: etat.facture,
    isLoading: false,
    refetch: async () => ({ data: etat.facture }),
  }),
  useDeleteFacture: () => ({
    mutateAsync: async (args: unknown) => {
      journal.push({ op: "delete", args });
      return etat.suppressionAcceptee;
    },
  }),
  useUpdateFacture: () => ({
    mutateAsync: async (args: unknown) => {
      journal.push({ op: "update", args });
    },
  }),
  useAnnulationManuellePermise: () => ({ data: etat.annulationPermise }),
}));
vi.mock("@/hooks/usePaiements", () => ({
  useFacturePaiements: () => ({ data: [] }),
  useDeletePaiement: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@/hooks/useDocumentGenerator", () => ({
  useDocumentGenerator: () => ({ getCompanyInfo: () => ({ name: "Centre" }) }),
}));
vi.mock("../PaiementFormDialog", () => ({ PaiementFormDialog: () => null }));
vi.mock("../AlmaPaymentSection", () => ({ AlmaPaymentSection: () => null }));
vi.mock("@/components/facturation/PdpTransmissionPanel", () => ({ PdpTransmissionPanel: () => null }));
vi.mock("@/lib/pdf-generator", () => ({
  generateFacturePDF,
  downloadPDF: vi.fn(),
  preloadCompanyImages: vi.fn(async () => {}),
}));
vi.mock("@/integrations/supabase/client", () => {
  const chaine: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order"]) chaine[m] = () => chaine;
  chaine.then = (resoudre: (v: unknown) => unknown) => resoudre({ data: [], error: null });
  return { supabase: { from: () => chaine, functions: { invoke: vi.fn() } } };
});

import { toast } from "sonner";
import { FactureDetailSheet } from "../FactureDetailSheet";

function facture(statut: string, extra: Record<string, unknown> = {}) {
  return {
    id: "f1",
    numero_facture: "FAC-2026-0502",
    montant_total: 1800,
    total_paye: 0,
    statut,
    type_financement: "personnel",
    date_emission: null,
    date_echeance: null,
    commentaires: null,
    contact_id: "k1",
    client_partner_id: null,
    session_inscription_id: null,
    contact: { id: "k1", nom: "Dupont", prenom: "Jean", email: "jean@exemple.fr", telephone: null },
    client_partner: null,
    session_inscription: null,
    ...extra,
  };
}

function afficher(onOpenChange = vi.fn()) {
  render(<FactureDetailSheet factureId="f1" open onOpenChange={onOpenChange} />);
  return onOpenChange;
}

describe("FactureDetailSheet — gestion", () => {
  beforeEach(() => {
    journal.length = 0;
    etat.suppressionAcceptee = true;
    etat.annulationPermise = true;
    vi.mocked(toast.success).mockClear();
    generateFacturePDF.mockClear();
  });

  it("brouillon : Supprimer proposé, Annuler absent", () => {
    etat.facture = facture("brouillon");
    afficher();
    expect(screen.getByRole("button", { name: "Supprimer la facture" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Annuler la facture" })).toBeNull();
  });

  it("suppression refusée par la base : ni « Facture supprimée » ni fermeture (F3)", async () => {
    etat.facture = facture("brouillon");
    etat.suppressionAcceptee = false;
    const onOpenChange = afficher();

    fireEvent.click(screen.getByRole("button", { name: "Supprimer la facture" }));
    fireEvent.click(await screen.findByRole("button", { name: "Supprimer" }));

    await waitFor(() => expect(journal).toEqual([{ op: "delete", args: "f1" }]));
    expect(toast.success).not.toHaveBeenCalledWith("Facture supprimée");
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("suppression acceptée : annonce et fermeture", async () => {
    etat.facture = facture("brouillon");
    const onOpenChange = afficher();

    fireEvent.click(screen.getByRole("button", { name: "Supprimer la facture" }));
    fireEvent.click(await screen.findByRole("button", { name: "Supprimer" }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(toast.success).toHaveBeenCalledWith("Facture supprimée");
  });

  it("émise : pas de Supprimer ; Annuler confirmé n'envoie que le statut (F2)", async () => {
    etat.facture = facture("emise");
    afficher();
    expect(screen.queryByRole("button", { name: "Supprimer la facture" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Annuler la facture" }));
    expect(await screen.findByText("Annuler cette facture émise ?")).toBeInTheDocument();
    expect(journal).toEqual([]);

    fireEvent.click(screen.getByRole("button", { name: "Confirmer l'annulation" }));
    await waitFor(() => expect(journal).toEqual([{ op: "update", args: { id: "f1", statut: "annulee" } }]));
  });

  it("annuler une facture déjà payée annonce les paiements encaissés (D7)", async () => {
    etat.facture = facture("payee", { total_paye: 1000 });
    afficher();

    fireEvent.click(screen.getByRole("button", { name: "Annuler la facture" }));

    expect(await screen.findByText(/de paiements/)).toBeInTheDocument();
    expect(screen.getByText(/resteront rattachés à la facture annulée/)).toBeInTheDocument();
  });

  it("émise, annulation manuelle close (avoirs livrés) : aucune action destructive", () => {
    etat.facture = facture("emise");
    etat.annulationPermise = false;
    afficher();
    expect(screen.queryByRole("button", { name: "Supprimer la facture" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Annuler la facture" })).toBeNull();
  });

  it("PDF d'une facture émise : client imprimé depuis les coordonnées figées (F5)", async () => {
    etat.facture = facture("emise", {
      buyer_type: "b2c",
      buyer_name_snapshot: "Jean-bis Dupont",
      buyer_address_snapshot: { line1: "2 rue B", postal_code: "92120", city: "Montrouge", country: "FR" },
      buyer_email_facturation: "jean-bis@exemple.fr",
    });
    afficher();

    fireEvent.click(screen.getByRole("button", { name: "Télécharger le PDF" }));

    await waitFor(() => expect(generateFacturePDF).toHaveBeenCalled());
    expect(generateFacturePDF.mock.calls[0][1]).toMatchObject({
      prenom: "Jean-bis Dupont",
      nom: "",
      rue: "2 rue B",
      code_postal: "92120",
      ville: "Montrouge",
      email: "jean-bis@exemple.fr",
    });
  });

  it("la facture envoyée par email porte le MÊME acheteur figé (F5)", async () => {
    // Chemin distinct du téléchargement (handleSendEmail reconstruit son PDF) :
    // il n'était retenu par aucune assertion, une mutation ciblée passait au
    // vert et la pièce jointe pouvait repartir sur la fiche du jour.
    etat.facture = facture("emise", {
      buyer_type: "b2c",
      buyer_name_snapshot: "Jean-bis Dupont",
      buyer_address_snapshot: { line1: "2 rue B", postal_code: "92120", city: "Montrouge", country: "FR" },
      buyer_email_facturation: "jean-bis@exemple.fr",
    });
    afficher();

    fireEvent.click(screen.getByRole("button", { name: "Envoyer par email" }));
    fireEvent.click(await screen.findByRole("button", { name: "Envoyer" }));

    await waitFor(() => expect(generateFacturePDF).toHaveBeenCalled());
    expect(generateFacturePDF.mock.calls[0][1]).toMatchObject({
      prenom: "Jean-bis Dupont",
      nom: "",
      rue: "2 rue B",
      email: "jean-bis@exemple.fr",
    });
  });
});
