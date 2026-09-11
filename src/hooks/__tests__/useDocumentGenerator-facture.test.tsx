import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

/**
 * 5ᵉ point d'entrée d'un PDF de facture (F5). `useDocumentGenerator`, case
 * "facture", recevait son ContactInfo de l'appelant — donc la FICHE — et ne
 * passait jamais par `clientImprimeFacture`. La branche est aujourd'hui
 * injoignable depuis les menus, mais le type "facture" existe toujours : le
 * jour où quelqu'un la rebranche, le PDF repartirait de la fiche du jour.
 */

const { generateFacturePDF } = vi.hoisted(() => ({
  generateFacturePDF: vi.fn((..._args: unknown[]) => ({ save: () => {}, output: () => "" })),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));
vi.mock("@/hooks/useCentreFormation", () => ({ useCentreFormation: () => ({ centreFormation: { nom: "Centre" } }) }));
vi.mock("@/lib/documents/companyInfo", () => ({ buildCompanyInfo: () => ({ name: "Centre", siret: "12345678900011" }) }));
vi.mock("@/lib/pdf-generator", () => ({
  generateFacturePDF,
  generateConventionPDF: vi.fn(),
  generateContratFormationPDF: vi.fn(),
  generateConvocationPDF: vi.fn(),
  generateProgrammePDF: vi.fn(),
  generateAttestationPresencePDF: vi.fn(),
  downloadPDF: vi.fn(),
  preloadCompanyImages: vi.fn(async () => {}),
}));

import { useDocumentGenerator } from "../useDocumentGenerator";

const ficheVivante = {
  nom: "Nouveau-Nom",
  prenom: "Jean",
  email: "nouveau@exemple.fr",
  rue: "50 rue Déménagée",
  code_postal: "13001",
  ville: "Marseille",
};

describe("useDocumentGenerator — PDF de facture", () => {
  beforeEach(() => generateFacturePDF.mockClear());

  it("une facture émise imprime l'acheteur figé, pas la fiche du jour", async () => {
    const { result } = renderHook(() => useDocumentGenerator());

    await result.current.generateDocument("facture", ficheVivante as never, undefined, {
      numero_facture: "FAC-2026-0502",
      montant_total: 1800,
      total_paye: 0,
      statut: "emise",
      type_financement: "personnel",
      buyer_type: "b2c",
      buyer_name_snapshot: "Jean Ancien-Nom",
      buyer_address_snapshot: { line1: "2 rue B", postal_code: "92120", city: "Montrouge", country: "FR" },
      buyer_email_facturation: "fige@exemple.fr",
    } as never);

    expect(generateFacturePDF).toHaveBeenCalled();
    expect(generateFacturePDF.mock.calls[0][1]).toMatchObject({
      prenom: "Jean Ancien-Nom",
      nom: "",
      rue: "2 rue B",
      ville: "Montrouge",
      email: "fige@exemple.fr",
    });
  });

  it("un brouillon, lui, imprime bien la fiche", async () => {
    const { result } = renderHook(() => useDocumentGenerator());

    await result.current.generateDocument("facture", ficheVivante as never, undefined, {
      numero_facture: "FAC-2026-0503",
      montant_total: 1800,
      total_paye: 0,
      statut: "brouillon",
      type_financement: "personnel",
    } as never);

    expect(generateFacturePDF.mock.calls[0][1]).toMatchObject({ nom: "Nouveau-Nom", prenom: "Jean" });
  });
});
