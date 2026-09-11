import { describe, it, expect, vi } from "vitest";

/**
 * Les totaux du tableau de bord doivent dire la même chose que la fiche
 * apprenant : un BROUILLON n'est pas encore dû (il ne compte pas dans le CA),
 * et un versement encaissé sur un brouillon ou une annulée n'est pas du chiffre
 * d'affaires encaissé (il ne compte pas dans le « payé »).
 *
 * Chaque cas ci-dessous ÉCHOUE sur le code d'avant : les jeux de données
 * contiennent tous soit un brouillon, soit un paiement non rattaché.
 */

// Le module charge le client Supabase à l'import : neutralisé pour ne
// tester que les fonctions pures.
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({}) } }));

import {
  buildMonthlyCA,
  caParFormation,
  caParSource,
  resumeFinancier,
} from "../useDashboardStats";

const NOW = new Date("2026-09-15T12:00:00Z");

describe("buildMonthlyCA", () => {
  it("écarte le brouillon du CA émis ET son versement du payé", () => {
    const mois = buildMonthlyCA(
      [
        { id: "F1", montant_total: 1000, statut: "emise", date_emission: "2026-09-05" },
        { id: "F2", montant_total: 500, statut: "brouillon", date_emission: "2026-09-05" },
      ],
      [
        { facture_id: "F1", montant: 300, date_paiement: "2026-09-10" },
        { facture_id: "F2", montant: 500, date_paiement: "2026-09-10" },
      ],
      NOW,
    );

    const septembre = mois[mois.length - 1];
    expect(septembre.mois).toBe("2026-09");
    // Avant : ca = 1500 (brouillon compté), paye = 800 (versement du brouillon compté).
    expect(septembre.ca).toBe(1000);
    expect(septembre.paye).toBe(300);
  });

  it("écarte le versement rattaché à une facture annulée", () => {
    const mois = buildMonthlyCA(
      [{ id: "F1", montant_total: 1000, statut: "emise", date_emission: "2026-09-05" }],
      [
        { facture_id: "F1", montant: 400, date_paiement: "2026-09-10" },
        { facture_id: "FX", montant: 900, date_paiement: "2026-09-10" },
      ],
      NOW,
    );

    // FX n'est pas dans l'assiette comptée : son versement ne peut pas
    // faire passer le « payé » (400) au-dessus du « facturé » (1000).
    expect(mois[mois.length - 1].paye).toBe(400);
  });

  it("compte le versement dans le mois où il est reçu, pas dans celui de la facture", () => {
    const mois = buildMonthlyCA(
      [{ id: "F1", montant_total: 1000, statut: "emise", date_emission: "2026-08-20" }],
      [{ facture_id: "F1", montant: 600, date_paiement: "2026-09-12" }],
      NOW,
    );

    const aout = mois[mois.length - 2];
    const septembre = mois[mois.length - 1];
    expect(aout.ca).toBe(1000);
    expect(aout.paye).toBe(0);
    expect(septembre.ca).toBe(0);
    expect(septembre.paye).toBe(600);
  });
});

describe("resumeFinancier", () => {
  it("n'encaisse que les versements rattachés aux factures comptées", () => {
    const r = resumeFinancier(
      [
        { id: "F1", montant_total: 1000, statut: "emise" },
        { id: "F2", montant_total: 500, statut: "brouillon" },
      ],
      [
        { facture_id: "F1", montant: 300 },
        { facture_id: "F2", montant: 500 },
      ],
    );

    // Avant : totalFacture = 1500, totalPaye = 800, taux = 53 %.
    expect(r.totalFacture).toBe(1000);
    expect(r.totalPaye).toBe(300);
    expect(r.totalImpaye).toBe(700);
    expect(r.tauxRecouvrement).toBe(30);
  });

  it("un trop-perçu sur une facture ne masque pas l'impayé d'une autre", () => {
    const r = resumeFinancier(
      [
        { id: "F1", montant_total: 990, statut: "emise" },
        { id: "F2", montant_total: 1000, statut: "emise" },
      ],
      [
        { facture_id: "F1", montant: 1240 },
        { facture_id: "F2", montant: 800 },
      ],
    );

    // Avant (clamp global) : max(0, 1990 − 2040) = 0 € restant dû.
    expect(r.totalImpaye).toBe(200);
  });

  it("garde « en attente » sur l'état émise/partielle, sans les payées ni les impayées", () => {
    const r = resumeFinancier(
      [
        { id: "F1", montant_total: 100, statut: "emise" },
        { id: "F2", montant_total: 200, statut: "partiel" },
        { id: "F3", montant_total: 400, statut: "payee" },
        { id: "F4", montant_total: 800, statut: "impayee" },
      ],
      [],
    );

    expect(r.enAttente).toBe(300);
  });
});

describe("caParFormation", () => {
  it("écarte le brouillon du CA de la formation", () => {
    const ca = caParFormation([
      {
        montant_total: 1000,
        statut: "emise",
        session_inscription: { sessions: { formation_type: "VTC" } },
      },
      {
        montant_total: 500,
        statut: "brouillon",
        session_inscription: { sessions: { formation_type: "VTC" } },
      },
      {
        montant_total: 700,
        statut: "emise",
        session_inscription: { sessions: { formation_type: "Taxi" } },
      },
    ]);

    // Avant : VTC = 1500.
    expect(ca).toEqual({ VTC: 1000, Taxi: 700 });
  });

  it("tolère une relation absente ou renvoyée en tableau", () => {
    const ca = caParFormation([
      { montant_total: 300, statut: "emise" },
      {
        montant_total: 200,
        statut: "emise",
        session_inscription: [{ sessions: [{ formation_type: "VTC" }] }],
      },
    ]);

    expect(ca).toEqual({ Autre: 300, VTC: 200 });
  });
});

describe("caParSource", () => {
  it("compte le CA et le nombre de factures sur la MÊME assiette", () => {
    const lignes = caParSource([
      { montant_total: 1000, statut: "emise", contact: { source: "Google" } },
      { montant_total: 500, statut: "brouillon", contact: { source: "Google" } },
      { montant_total: 200, statut: "emise", contact: null },
    ]);

    // Avant : Google = 1500 € sur 2 factures.
    expect(lignes).toEqual([
      { source: "Google", ca: 1000, count: 1 },
      { source: "Non défini", ca: 200, count: 1 },
    ]);
  });
});
