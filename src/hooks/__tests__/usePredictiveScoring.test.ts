import { describe, it, expect, vi } from "vitest";

/**
 * Scoring prédictif : CA réalisé du mois (sous-score S1) et encours réel
 * (sous-score S4, alertes et recommandations d'encaissement).
 *
 * Deux défauts corrigés :
 *  - le CA réalisé ne retenait que les statuts `payee` et `emise` : une facture
 *    réglée en partie passe à `partiel` et sortait du réalisé — encaisser un
 *    acompte faisait BAISSER le CA comparé à l'objectif de budget ;
 *  - les versements étaient chargés puis jamais utilisés : l'encours annonçait
 *    le montant FACTURÉ et non ce qu'il reste à encaisser.
 */

// Le module charge le client Supabase à l'import : neutralisé pour ne
// tester que les fonctions pures.
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({}) } }));

import { analyserEncaissement, calculerCaConfirme } from "../usePredictiveScoring";

const NOW = new Date("2026-09-30T12:00:00Z");

describe("calculerCaConfirme", () => {
  it("compte la facture partiellement réglée, que l'ancien filtre faisait disparaître", () => {
    const ca = calculerCaConfirme(
      [
        { id: "F1", montant_total: 1000, statut: "emise", date_emission: "2026-09-05" },
        { id: "F2", montant_total: 800, statut: "partiel", date_emission: "2026-09-06" },
        { id: "F3", montant_total: 700, statut: "impayee", date_emission: "2026-09-07" },
        { id: "F4", montant_total: 400, statut: "payee", date_emission: "2026-09-09" },
      ],
      "2026-09-01",
    );

    // Avant : 1400 (seuls `emise` et `payee`) — un acompte encaissé sur F2
    // effaçait 800 € du CA du mois et faisait chuter le score S1.
    expect(ca).toBe(2900);
  });

  it("n'admet pas le brouillon dans le CA réalisé", () => {
    const ca = calculerCaConfirme(
      [
        { id: "F1", montant_total: 1000, statut: "emise", date_emission: "2026-09-05" },
        { id: "F2", montant_total: 5000, statut: "brouillon", date_emission: "2026-09-06" },
      ],
      "2026-09-01",
    );

    // Un devis non émis ne doit pas faire croire l'objectif de budget atteint.
    expect(ca).toBe(1000);
  });

  it("ignore les factures émises avant le début du mois", () => {
    const ca = calculerCaConfirme(
      [
        { id: "F1", montant_total: 1000, statut: "emise", date_emission: "2026-08-25" },
        { id: "F2", montant_total: 600, statut: "emise", date_emission: "2026-09-02" },
      ],
      "2026-09-01",
    );

    expect(ca).toBe(600);
  });
});

describe("analyserEncaissement", () => {
  it("annonce le RESTE dû, pas le montant facturé", () => {
    const a = analyserEncaissement(
      [
        // Quasi soldée : 50 € restent dus, pas 1 200 €.
        { id: "F1", montant_total: 1200, statut: "emise", date_echeance: "2026-09-25" },
        { id: "F2", montant_total: 1000, statut: "impayee", date_echeance: "2026-09-10" },
      ],
      [{ facture_id: "F1", montant: 1150 }],
      NOW,
    );

    expect(a.nombre).toBe(2);
    // Avant : 2200 € annoncés « en attente ».
    expect(a.resteTotal).toBe(1050);
    expect(a.enAttente.map((f) => f.reste)).toEqual([50, 1000]);
  });

  it("fait sortir du seuil d'alerte une facture presque soldée", () => {
    const a = analyserEncaissement(
      [{ id: "F1", montant_total: 1200, statut: "emise", date_echeance: "2026-09-10" }],
      [{ facture_id: "F1", montant: 1150 }],
      NOW,
    );

    const f = a.enAttente[0];
    // L'écran alerte au-delà de 10 jours de retard ET 500 € : le retard est
    // bien là (20 jours), mais 50 € ne justifient plus une alerte critique.
    expect(f.joursDeRetard).toBe(20);
    expect(f.reste).toBe(50);
    // Avant, le seuil portait sur montant_total (1200 €) : alerte déclenchée.
    expect(f.reste > 500).toBe(false);
  });

  it("ne descend jamais sous zéro sur un trop-perçu", () => {
    const a = analyserEncaissement(
      [{ id: "F1", montant_total: 1000, statut: "emise", date_echeance: "2026-09-20" }],
      [{ facture_id: "F1", montant: 1200 }],
      NOW,
    );

    expect(a.resteTotal).toBe(0);
  });

  it("garde la liste blanche d'ÉTAT : ni payée, ni brouillon, ni annulée", () => {
    const a = analyserEncaissement(
      [
        { id: "F1", montant_total: 100, statut: "emise", date_echeance: "2026-09-20" },
        { id: "F2", montant_total: 200, statut: "partiel", date_echeance: "2026-09-20" },
        { id: "F3", montant_total: 400, statut: "impayee", date_echeance: "2026-09-20" },
        { id: "F4", montant_total: 800, statut: "payee", date_echeance: "2026-09-20" },
        { id: "F5", montant_total: 900, statut: "brouillon", date_echeance: "2026-09-20" },
        { id: "F6", montant_total: 600, statut: "annulee", date_echeance: "2026-09-20" },
      ],
      [],
      NOW,
    );

    // Une facture soldée n'est pas un risque d'impayé, une facture jamais
    // émise non plus.
    expect(a.enAttente.map((f) => f.facture.id)).toEqual(["F1", "F2", "F3"]);
    expect(a.resteTotal).toBe(700);
  });

  it("ignore un versement rattaché à une facture absente de l'assiette", () => {
    const a = analyserEncaissement(
      [{ id: "F1", montant_total: 1000, statut: "emise", date_echeance: "2026-09-20" }],
      [
        { facture_id: "F1", montant: 400 },
        { facture_id: "FX", montant: 5000 },
      ],
      NOW,
    );

    expect(a.resteTotal).toBe(600);
  });

  it("prend l'échéance, ou à défaut l'émission, et ne compte pas d'âge négatif", () => {
    const a = analyserEncaissement(
      [
        { id: "F1", montant_total: 100, statut: "emise", date_echeance: "2026-09-10" },
        { id: "F2", montant_total: 100, statut: "emise", date_emission: "2026-09-20" },
        // Échéance à venir : pas de retard, donc pas d'âge négatif.
        { id: "F3", montant_total: 100, statut: "emise", date_echeance: "2026-10-15" },
      ],
      [],
      NOW,
    );

    expect(a.enAttente.map((f) => f.joursDeRetard)).toEqual([20, 10, 0]);
    expect(a.ageMoyen).toBe(10);
  });
});
