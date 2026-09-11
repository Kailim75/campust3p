import { describe, it, expect, vi } from "vitest";

/**
 * Comparaison de deux périodes (CA émis et argent encaissé).
 *
 * Deux défauts corrigés, vérifiés ici sur les DEUX bornes :
 *  - un BROUILLON entrait dans le chiffre d'affaires alors qu'il n'est pas
 *    encore dû ;
 *  - l'encaissé sommait TOUS les versements de la période sans les rattacher
 *    aux factures comptées, donc l'argent reçu sur un brouillon ou sur une
 *    facture hors assiette gonflait le « payé ».
 *
 * Chaque cas ÉCHOUE sur le code d'avant, et le cas « les deux bornes » échoue
 * aussi sur une correction qui n'aurait traité que la période courante.
 */

// Le module charge le client Supabase à l'import : neutralisé pour ne
// tester que les fonctions pures.
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({}) } }));

import { comparerFinancesPeriodes, type BornesPeriodes } from "../usePeriodComparison";

const BORNES: BornesPeriodes = {
  currentStart: "2026-09-01",
  currentEnd: "2026-09-30",
  previousStart: "2026-08-01",
  previousEnd: "2026-08-31",
};

describe("comparerFinancesPeriodes", () => {
  it("écarte les brouillons du CA et les versements non rattachés de l'encaissé", () => {
    const r = comparerFinancesPeriodes(
      [
        { id: "F1", montant_total: 1000, statut: "emise", date_emission: "2026-09-05" },
        { id: "F2", montant_total: 500, statut: "brouillon", date_emission: "2026-09-10" },
        { id: "F3", montant_total: 800, statut: "emise", date_emission: "2026-08-10" },
        { id: "F4", montant_total: 300, statut: "brouillon", date_emission: "2026-08-12" },
      ],
      [
        { facture_id: "F1", montant: 300, date_paiement: "2026-09-15" },
        { facture_id: "F2", montant: 500, date_paiement: "2026-09-16" },
        // Versement rattaché à une facture hors assiette (annulée, supprimée…) :
        // il ne doit pas pouvoir gonfler l'encaissé.
        { facture_id: "FX", montant: 900, date_paiement: "2026-09-20" },
        { facture_id: "F3", montant: 400, date_paiement: "2026-08-15" },
        { facture_id: "F4", montant: 300, date_paiement: "2026-08-20" },
      ],
      BORNES,
    );

    // Avant : caCurrent = 1500, caPrevious = 1100,
    //         encaisseCurrent = 1700, encaissePrevious = 700.
    expect(r.caCurrent).toBe(1000);
    expect(r.caPrevious).toBe(800);
    expect(r.encaisseCurrent).toBe(300);
    expect(r.encaissePrevious).toBe(400);
  });

  it("écarte le brouillon de la période PRÉCÉDENTE aussi (sinon la comparaison ment)", () => {
    // Une correction qui n'aurait nettoyé que la période courante laisserait
    // caPrevious à 1100 et afficherait une chute du CA qui n'a pas eu lieu.
    const r = comparerFinancesPeriodes(
      [
        { id: "F1", montant_total: 1000, statut: "emise", date_emission: "2026-09-05" },
        { id: "F3", montant_total: 800, statut: "emise", date_emission: "2026-08-10" },
        { id: "F4", montant_total: 300, statut: "brouillon", date_emission: "2026-08-12" },
      ],
      [],
      BORNES,
    );

    expect(r.caPrevious).toBe(800);
    // Les deux bornes sont nettoyées de la même façon : l'évolution reste juste.
    expect(r.caCurrent).toBe(1000);
  });

  it("compte le versement dans la période où il est reçu, pas dans celle de la facture", () => {
    const r = comparerFinancesPeriodes(
      [{ id: "F1", montant_total: 1000, statut: "emise", date_emission: "2026-08-20" }],
      [{ facture_id: "F1", montant: 600, date_paiement: "2026-09-12" }],
      BORNES,
    );

    expect(r.caPrevious).toBe(1000);
    expect(r.caCurrent).toBe(0);
    expect(r.encaissePrevious).toBe(0);
    // Le rattachement porte sur toutes les factures comptées, pas seulement
    // celles émises dans la période.
    expect(r.encaisseCurrent).toBe(600);
  });

  it("ignore ce qui tombe hors des deux périodes", () => {
    const r = comparerFinancesPeriodes(
      [{ id: "F1", montant_total: 1000, statut: "emise", date_emission: "2026-07-15" }],
      [{ facture_id: "F1", montant: 1000, date_paiement: "2026-07-20" }],
      BORNES,
    );

    expect(r).toEqual({
      caCurrent: 0,
      caPrevious: 0,
      encaisseCurrent: 0,
      encaissePrevious: 0,
    });
  });
});
