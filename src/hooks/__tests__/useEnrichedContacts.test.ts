import { describe, it, expect, vi } from "vitest";

/**
 * Le statut de paiement de la LISTE des apprenants : il doit dire la même
 * chose que la fiche, qui calcule facture par facture. Sur l'agrégat, un
 * apprenant en trop-perçu sur une facture et impayé sur une autre passait
 * pour « à jour » — et sortait du filtre « en retard ».
 */

// Le module charge le client Supabase à l'import : neutralisé pour ne
// tester que la fonction pure.
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({}) } }));

import { computePaymentStatus } from "../useEnrichedContacts";

const HIER = "2000-01-01";
const DEMAIN = "2999-12-31";

describe("computePaymentStatus", () => {
  it("sans rien de facturé, l'apprenant est en attente", () => {
    expect(computePaymentStatus(0, 0, 0, null)).toBe("attente");
  });

  it("solde nul = payé", () => {
    expect(computePaymentStatus(990, 990, 0, null)).toBe("paye");
    expect(computePaymentStatus(990, 990, 0, HIER)).toBe("paye");
  });

  it("un trop-perçu sur une facture ne solde pas l'impayé d'une autre", () => {
    // 1 190 € facturés, 1 240 € encaissés, mais 200 € restent dus sur F2 :
    // l'agrégat (payé >= facturé) concluait « payé ».
    expect(computePaymentStatus(1190, 1240, 200, null)).toBe("partiel");
    expect(computePaymentStatus(1190, 1240, 200, HIER)).toBe("retard");
  });

  it("versement partiel : en retard seulement après l'échéance", () => {
    expect(computePaymentStatus(990, 250, 740, DEMAIN)).toBe("partiel");
    expect(computePaymentStatus(990, 250, 740, HIER)).toBe("retard");
  });

  it("rien versé : en attente avant l'échéance, en retard après", () => {
    expect(computePaymentStatus(990, 0, 990, null)).toBe("attente");
    expect(computePaymentStatus(990, 0, 990, DEMAIN)).toBe("attente");
    expect(computePaymentStatus(990, 0, 990, HIER)).toBe("retard");
  });
});
