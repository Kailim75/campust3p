import { describe, it, expect } from "vitest";
import { startOfMonth, endOfMonth } from "date-fns";

/**
 * Pilier « Finance » de la page d'accueil. Le « CA confirmé ce mois » ne doit
 * pas compter les factures en brouillon : elles ne sont pas confirmées. Et
 * l'encaissé ne doit retenir que les versements rattachés à une facture comptée.
 *
 * Chaque cas ci-dessous ÉCHOUE sur le code d'avant.
 */

import { calculerFinanceMois } from "../strategic-finance";

const NOW = new Date("2026-09-15T12:00:00Z");
const DEBUT = startOfMonth(NOW);
const FIN = endOfMonth(NOW);

describe("calculerFinanceMois", () => {
  it("écarte le brouillon du CA confirmé et son versement de l'encaissé", () => {
    const { caConfirme, totalPaye } = calculerFinanceMois(
      [
        { id: "F1", montant_total: 1200, statut: "emise", date_emission: "2026-09-03" },
        { id: "F2", montant_total: 800, statut: "brouillon", date_emission: "2026-09-04" },
      ],
      [
        { facture_id: "F1", montant: 400, date_paiement: "2026-09-09" },
        { facture_id: "F2", montant: 800, date_paiement: "2026-09-09" },
      ],
      DEBUT,
      FIN,
    );

    // Avant : caConfirme = 2000, totalPaye = 1200.
    expect(caConfirme).toBe(1200);
    expect(totalPaye).toBe(400);
  });

  it("ne compte pas la facture émise un autre mois dans le CA du mois", () => {
    const { caConfirme } = calculerFinanceMois(
      [
        { id: "F1", montant_total: 1200, statut: "emise", date_emission: "2026-08-31" },
        { id: "F2", montant_total: 300, statut: "emise", date_emission: "2026-09-01" },
      ],
      [],
      DEBUT,
      FIN,
    );

    expect(caConfirme).toBe(300);
  });

  it("encaisse le versement du mois même si la facture date du mois précédent", () => {
    const { caConfirme, totalPaye } = calculerFinanceMois(
      [{ id: "F1", montant_total: 1200, statut: "emise", date_emission: "2026-08-20" }],
      [{ facture_id: "F1", montant: 500, date_paiement: "2026-09-05" }],
      DEBUT,
      FIN,
    );

    expect(caConfirme).toBe(0);
    expect(totalPaye).toBe(500);
  });

  it("ignore un versement rattaché à une facture absente de l'assiette", () => {
    const { totalPaye } = calculerFinanceMois(
      [{ id: "F1", montant_total: 1200, statut: "emise", date_emission: "2026-09-03" }],
      [
        { facture_id: "F1", montant: 200, date_paiement: "2026-09-06" },
        { facture_id: "FX", montant: 999, date_paiement: "2026-09-06" },
      ],
      DEBUT,
      FIN,
    );

    expect(totalPaye).toBe(200);
  });
});
