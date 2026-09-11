import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

/**
 * Liste des factures (11/09/2026) — une invitation qui ne mène nulle part.
 *
 * Le badge « Non définie » de la colonne Échéance n'apparaît que pour une
 * facture « emise » ou « partiel », et il appelait handleEdit → FactureFormDialog.
 * Depuis F1(b), ce dialogue s'ouvre en LECTURE SEULE sur une facture émise et le
 * champ « Date d'échéance » est désactivé : le clic menait à un cul-de-sac. Le
 * badge constate désormais, il n'appelle plus à agir.
 */

const { etat, ouvertures } = vi.hoisted(() => ({
  etat: { factures: [] as Record<string, unknown>[] },
  ouvertures: [] as unknown[],
}));

vi.mock("@/components/layout/Header", () => ({ Header: () => null }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() } }));
vi.mock("@/hooks/useFactures", () => ({
  useFactures: () => ({ data: etat.factures, isLoading: false, isError: false, refetch: vi.fn() }),
  useFacturesStats: () => ({ data: undefined }),
  useBulkEmitFactures: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/lib/relance-paiement", () => ({ envoyerRelancePaiement: vi.fn() }));
vi.mock("../FactureFormDialog", () => ({
  FactureFormDialog: (props: { facture?: unknown; open?: boolean }) => {
    if (props.open) ouvertures.push(props.facture);
    return null;
  },
}));
vi.mock("../FactureDetailSheet", () => ({ FactureDetailSheet: () => null }));
vi.mock("../PaiementFormDialog", () => ({ PaiementFormDialog: () => null }));
vi.mock("../ExportFECDialog", () => ({ ExportFECDialog: () => null }));
vi.mock("../FactureLibreDialog", () => ({ FactureLibreDialog: () => null }));
vi.mock("../BulkEmitConfirmDialog", () => ({ BulkEmitConfirmDialog: () => null }));
vi.mock("@/components/facturation/InvoiceComplianceBadge", () => ({ InvoiceComplianceBadge: () => null }));
vi.mock("@/components/facturation/InvoiceComplianceDrawer", () => ({ InvoiceComplianceDrawer: () => null }));

import { PaiementsPage } from "../PaiementsPage";

const factureEmiseSansEcheance = {
  id: "f1",
  numero_facture: "FAC-2026-0490",
  montant_total: 990,
  total_paye: 0,
  statut: "emise",
  type_financement: "personnel",
  date_emission: "2026-09-01",
  date_echeance: null,
  commentaires: null,
  contact_id: "k1",
  client_partner_id: null,
  session_inscription_id: null,
  contact: { id: "k1", nom: "Dupont", prenom: "Jean", email: "jean@exemple.fr", telephone: null },
  client_partner: null,
  session_inscription: null,
  created_at: "2026-09-01T10:00:00Z",
  updated_at: "2026-09-01T10:00:00Z",
};

describe("PaiementsPage — échéance figée d'une facture émise", () => {
  beforeEach(() => {
    ouvertures.length = 0;
    etat.factures = [factureEmiseSansEcheance];
  });

  it("le badge dit que l'échéance est figée et ne propose plus de la saisir", () => {
    render(<PaiementsPage />);

    const badge = screen.getByText(/figée depuis l'émission/i);
    expect(badge).toBeInTheDocument();
    // Aucun gestionnaire de clic : cliquer n'ouvre aucun formulaire verrouillé.
    expect(screen.queryByText("Non définie")).toBeNull();
    expect(ouvertures).toEqual([]);
  });
});
