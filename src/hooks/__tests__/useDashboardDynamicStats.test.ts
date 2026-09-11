import { describe, it, expect, vi } from "vitest";

/**
 * Bloc « Finances » dynamique du tableau de bord (CA et payé, période courante
 * contre période précédente).
 *
 * Mêmes deux défauts que partout ailleurs : les brouillons entraient dans le
 * CA, et le « payé » sommait tous les versements sans les rattacher aux
 * factures comptées — il pouvait donc dépasser le CA affiché juste à côté.
 *
 * Les bornes sont construites en heure LOCALE (`new Date(2026, 8, 1)`), comme
 * `useDashboardPeriod.getStartDate()` qui renvoie un `startOfDay` local : des
 * bornes UTC feraient basculer les factures du 1er du mois dans la période
 * précédente selon le fuseau de la machine.
 */

// Le module charge le client Supabase à l'import : neutralisé pour ne
// tester que les fonctions pures.
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({}) } }));

import { calculerFinancesDynamiques } from "../useDashboardDynamicStats";

const CURRENT_START = new Date(2026, 8, 1); // 1er septembre 2026, local
const PREVIOUS_START = new Date(2026, 7, 1); // 1er août 2026, local

describe("calculerFinancesDynamiques", () => {
  it("écarte les brouillons du CA et les versements non rattachés du payé", () => {
    const r = calculerFinancesDynamiques(
      [
        { id: "F1", montant_total: 1000, statut: "emise", date_emission: "2026-09-05" },
        { id: "F2", montant_total: 500, statut: "brouillon", date_emission: "2026-09-10" },
        { id: "F3", montant_total: 800, statut: "emise", date_emission: "2026-08-10" },
        { id: "F4", montant_total: 300, statut: "brouillon", date_emission: "2026-08-12" },
      ],
      [
        { facture_id: "F1", montant: 300, date_paiement: "2026-09-15" },
        { facture_id: "F2", montant: 500, date_paiement: "2026-09-16" },
        { facture_id: "FX", montant: 900, date_paiement: "2026-09-20" },
        { facture_id: "F3", montant: 400, date_paiement: "2026-08-15" },
        { facture_id: "F4", montant: 300, date_paiement: "2026-08-20" },
      ],
      CURRENT_START,
      PREVIOUS_START,
    );

    // Avant : caThisPeriod = 1500, caPreviousPeriod = 1100,
    //         payeThisPeriod = 1700, payePreviousPeriod = 700.
    expect(r.caThisPeriod).toBe(1000);
    expect(r.caPreviousPeriod).toBe(800);
    expect(r.payeThisPeriod).toBe(300);
    expect(r.payePreviousPeriod).toBe(400);
  });

  it("nettoie la période précédente comme la courante (l'évolution reste juste)", () => {
    const r = calculerFinancesDynamiques(
      [
        { id: "F1", montant_total: 1000, statut: "emise", date_emission: "2026-09-05" },
        { id: "F3", montant_total: 800, statut: "emise", date_emission: "2026-08-10" },
        { id: "F4", montant_total: 300, statut: "brouillon", date_emission: "2026-08-12" },
      ],
      [],
      CURRENT_START,
      PREVIOUS_START,
    );

    // Une correction limitée à la période courante laisserait 1100 ici et
    // afficherait −9 % au lieu de +25 %.
    expect(r.caPreviousPeriod).toBe(800);
    expect(r.caThisPeriod).toBe(1000);
  });

  it("le payé ne peut pas dépasser le facturé de la période", () => {
    const r = calculerFinancesDynamiques(
      [{ id: "F1", montant_total: 1000, statut: "emise", date_emission: "2026-09-05" }],
      [
        { facture_id: "F1", montant: 600, date_paiement: "2026-09-15" },
        // Acompte encaissé sur un devis resté en brouillon : hors assiette.
        { facture_id: "F9", montant: 2000, date_paiement: "2026-09-18" },
      ],
      CURRENT_START,
      PREVIOUS_START,
    );

    // Avant : payé = 2600 pour 1000 € facturés.
    expect(r.payeThisPeriod).toBe(600);
    expect(r.payeThisPeriod).toBeLessThanOrEqual(r.caThisPeriod);
  });

  it("range chaque montant dans sa période, sans recouvrement", () => {
    const r = calculerFinancesDynamiques(
      [{ id: "F1", montant_total: 1000, statut: "emise", date_emission: "2026-08-20" }],
      [{ facture_id: "F1", montant: 600, date_paiement: "2026-09-12" }],
      CURRENT_START,
      PREVIOUS_START,
    );

    expect(r.caPreviousPeriod).toBe(1000);
    expect(r.caThisPeriod).toBe(0);
    expect(r.payePreviousPeriod).toBe(0);
    expect(r.payeThisPeriod).toBe(600);
  });
});
