import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

/**
 * F6 (11/09/2026) — tant que la PDP est simulée, la transmission est
 * désactivée et l'écran le dit : la simulation écrivait e_invoice_status
 * = 'envoye' pour une transmission fictive.
 */

const { submit } = vi.hoisted(() => ({ submit: vi.fn() }));

vi.mock("@/hooks/useEInvoicingSettings", () => ({
  useEInvoicingSettings: () => ({ settings: { einv_pdp_choice: "ppf" } }),
}));
vi.mock("@/hooks/usePdpTransmissions", () => ({
  usePdpTransmissions: () => ({
    data: [],
    isLoading: false,
    generateFacturX: { mutateAsync: vi.fn(), isPending: false },
    submitPdp: { mutate: submit, isPending: false },
  }),
}));

import { PdpTransmissionPanel } from "../PdpTransmissionPanel";

describe("PdpTransmissionPanel", () => {
  it("facture émise, PDP choisie : bouton désactivé et message « aucune facture n'est transmise »", () => {
    render(
      <PdpTransmissionPanel
        factureId="f1"
        factureStatut="emise"
        facturxGeneratedAt={null}
        einvoiceStatus={null}
        numeroFacture="FAC-2026-0502"
      />,
    );
    const bouton = screen.getByRole("button", { name: "Transmettre via la PDP" });
    expect(bouton).toBeDisabled();
    expect(screen.getByText(/Aucune facture n'est transmise/)).toBeInTheDocument();
    fireEvent.click(bouton);
    expect(submit).not.toHaveBeenCalled();
  });
});
