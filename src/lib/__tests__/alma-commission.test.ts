import { describe, it, expect } from "vitest";
import {
  TAUX_ALMA_TTC,
  extraireNbFois,
  commissionAlma,
  commissionPourPaiement,
  totalCommissionsAlma,
  libelleTaux,
} from "../alma-commission";

/**
 * Les montants attendus ici sont ceux relevés sur les ventes réelles du
 * dashboard Alma le 12/08/2026 — si un taux change dans TAUX_ALMA_TTC,
 * ces tests doivent être réalignés en conscience.
 */

describe("extraireNbFois", () => {
  it("lit le commentaire du webhook", () => {
    expect(extraireNbFois("Paiement Alma 3x validé automatiquement")).toBe(3);
  });

  it("lit le commentaire de la réconciliation cron", () => {
    expect(extraireNbFois("Réconciliation auto (cron) Alma — 4x — état paid")).toBe(4);
  });

  it("lit une saisie manuelle « Alma 2X »", () => {
    expect(extraireNbFois("Alma 2X, accord téléphonique")).toBe(2);
  });

  it("refuse un nombre hors grille et l'absence de motif", () => {
    expect(extraireNbFois("Paiement Alma 12x")).toBeNull();
    expect(extraireNbFois("réglé par carte")).toBeNull();
    expect(extraireNbFois(null)).toBeNull();
    expect(extraireNbFois("")).toBeNull();
  });
});

describe("commissionAlma — chiffres relevés sur le dashboard", () => {
  it("P1X : 150 € → 1,62 €", () => {
    expect(commissionAlma(150, 1).commission).toBe(1.62);
    expect(commissionAlma(150, 1).net).toBe(148.38);
  });

  it("P2X : 250 € → 10,80 €", () => {
    expect(commissionAlma(250, 2).commission).toBe(10.8);
    expect(commissionAlma(250, 2).net).toBe(239.2);
  });

  it("P3X : 740 € → 33,74 €", () => {
    expect(commissionAlma(740, 3).commission).toBe(33.74);
    expect(commissionAlma(740, 3).net).toBe(706.26);
  });

  it("P4X : 990 € → 57,02 € et 800 € → 46,08 €", () => {
    expect(commissionAlma(990, 4).commission).toBe(57.02);
    expect(commissionAlma(990, 4).net).toBe(932.98);
    expect(commissionAlma(800, 4).commission).toBe(46.08);
  });

  it("replie sur le taux 4x pour un nombre inconnu", () => {
    expect(commissionAlma(100, 7).taux).toBe(TAUX_ALMA_TTC[4]);
  });
});

describe("commissionPourPaiement", () => {
  it("ignore les paiements non-Alma", () => {
    expect(commissionPourPaiement({ mode_paiement: "cb", montant: 990 })).toBeNull();
    expect(commissionPourPaiement({ mode_paiement: "especes", montant: 250 })).toBeNull();
  });

  it("utilise le nombre de fois du commentaire", () => {
    const c = commissionPourPaiement({
      mode_paiement: "alma",
      montant: 990,
      commentaires: "Paiement Alma 4x validé automatiquement",
    });
    expect(c).toMatchObject({ nbFois: 4, commission: 57.02, net: 932.98, estime: false });
  });

  it("estime en 4x quand le commentaire est muet (décision du 12/08/2026)", () => {
    const c = commissionPourPaiement({ mode_paiement: "alma", montant: 500, commentaires: "solde" });
    expect(c).toMatchObject({ nbFois: 4, estime: true });
    expect(c!.commission).toBe(28.8);
  });
});

describe("totalCommissionsAlma", () => {
  it("somme uniquement les paiements Alma et compte les estimations", () => {
    const { total, nbPaiementsAlma, nbEstimes } = totalCommissionsAlma([
      { mode_paiement: "alma", montant: 990, commentaires: "Paiement Alma 4x validé automatiquement" },
      { mode_paiement: "alma", montant: 250, commentaires: "Alma 2x" },
      { mode_paiement: "alma", montant: 500, commentaires: null },
      { mode_paiement: "cb", montant: 990 },
      { mode_paiement: "virement", montant: 740 },
    ]);
    // 57,02 + 10,80 + 28,80 (estimé 4x)
    expect(total).toBe(96.62);
    expect(nbPaiementsAlma).toBe(3);
    expect(nbEstimes).toBe(1);
  });

  it("retourne zéro sur un lot sans Alma", () => {
    expect(totalCommissionsAlma([{ mode_paiement: "cb", montant: 100 }])).toEqual({
      total: 0,
      nbPaiementsAlma: 0,
      nbEstimes: 0,
    });
  });
});

describe("libelleTaux", () => {
  it("formate le taux à la française", () => {
    expect(libelleTaux(3)).toBe("4,56 % (3x)");
    expect(libelleTaux(9)).toBe("");
  });
});
