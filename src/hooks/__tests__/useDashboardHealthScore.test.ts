import { describe, it, expect, vi } from "vitest";

/**
 * Le taux de recouvrement pèse 30 points sur le score de santé. Numérateur et
 * dénominateur doivent porter sur la MÊME assiette : sommer tous les paiements
 * face aux seules factures comptées faisait dépasser 100 % et saturait le score.
 */

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({}) } }));

import { calculerRecouvrement } from "../useDashboardHealthScore";

describe("calculerRecouvrement", () => {
  it("ignore le versement rattaché à une facture hors assiette", () => {
    const taux = calculerRecouvrement(
      [{ id: "F1", montant_total: 1000, statut: "emise" }],
      [
        { facture_id: "F1", montant: 600 },
        // Versement sur un brouillon : absent du dénominateur, donc absent
        // du numérateur. Avant : (600 + 900) / 1000 = 150 %.
        { facture_id: "F2", montant: 900 },
      ],
    );

    expect(taux).toBe(60);
  });

  it("écarte le brouillon des deux côtés du rapport", () => {
    const taux = calculerRecouvrement(
      [
        { id: "F1", montant_total: 1000, statut: "emise" },
        { id: "F2", montant_total: 1000, statut: "brouillon" },
      ],
      [
        { facture_id: "F1", montant: 500 },
        { facture_id: "F2", montant: 1000 },
      ],
    );

    // Avant : (500 + 1000) / 2000 = 75 %.
    expect(taux).toBe(50);
  });

  it("ne peut plus dépasser 100 % quand tout est soldé", () => {
    expect(
      calculerRecouvrement(
        [{ id: "F1", montant_total: 1000, statut: "emise" }],
        [{ facture_id: "F1", montant: 1000 }],
      ),
    ).toBe(100);
  });

  it("vaut 100 % quand rien n'est facturé (aucune dette à recouvrer)", () => {
    expect(calculerRecouvrement([], [])).toBe(100);
  });

  it("ignore un versement sans facture de rattachement", () => {
    const taux = calculerRecouvrement(
      [{ id: "F1", montant_total: 1000, statut: "emise" }],
      [
        { facture_id: "F1", montant: 250 },
        { facture_id: null, montant: 750 },
      ],
    );

    expect(taux).toBe(25);
  });
});
