import { describe, it, expect } from "vitest";
import {
  STATUTS_FACTURE_EXCLUS,
  calculerResteAEncaisser,
  estFactureComptee,
  parseMontantSaisi,
  resteAEncaisserParFacture,
  sommeFactures,
  sommeMontants,
  sommePaiementsFactures,
  tropPercu,
} from "../montants";

describe("calculerResteAEncaisser", () => {
  it("retourne le solde dû quand la facture n'est pas soldée", () => {
    expect(calculerResteAEncaisser(990, 250)).toBe(740);
  });

  it("vaut 0 quand la facture est soldée", () => {
    expect(calculerResteAEncaisser(990, 990)).toBe(0);
  });

  it("ne devient JAMAIS négatif en cas de trop-perçu (cas KARAI : 990 facturés, 1240 versés)", () => {
    expect(calculerResteAEncaisser(990, 1240)).toBe(0);
  });

  it("tolère les montants en chaîne, nuls ou absents", () => {
    expect(calculerResteAEncaisser("300", null)).toBe(300);
    expect(calculerResteAEncaisser(undefined, 50)).toBe(0);
    expect(calculerResteAEncaisser("abc", 10)).toBe(0);
  });
});

describe("statuts de facture exclus", () => {
  it("exclut le brouillon et l'annulée, et elles seules", () => {
    expect([...STATUTS_FACTURE_EXCLUS]).toEqual(["brouillon", "annulee"]);
  });

  it("compte les statuts qui représentent une créance réelle", () => {
    expect(estFactureComptee({ statut: "emise" })).toBe(true);
    expect(estFactureComptee({ statut: "partiel" })).toBe(true);
    expect(estFactureComptee({ statut: "impayee" })).toBe(true);
    expect(estFactureComptee({ statut: "payee" })).toBe(true);
  });

  it("écarte brouillon et annulée", () => {
    expect(estFactureComptee({ statut: "brouillon" })).toBe(false);
    expect(estFactureComptee({ statut: "annulee" })).toBe(false);
  });

  it("compte une facture dont le statut n'a pas été chargé", () => {
    expect(estFactureComptee({})).toBe(true);
    expect(estFactureComptee({ statut: null })).toBe(true);
  });
});

describe("sommeMontants / sommeFactures", () => {
  it("additionne en ignorant les valeurs manquantes ou non numériques", () => {
    expect(sommeMontants([{ montant: 250 }, { montant: "740" }, { montant: null }, {}])).toBe(990);
    expect(sommeFactures([{ montant_total: 990 }, { montant_total: "250.5" }, { montant_total: undefined }])).toBe(1240.5);
  });

  it("vaut 0 sur une liste vide", () => {
    expect(sommeMontants([])).toBe(0);
    expect(sommeFactures([])).toBe(0);
  });

  it("ne facture ni les brouillons ni les annulées", () => {
    expect(
      sommeFactures([
        { montant_total: 990, statut: "emise" },
        { montant_total: 500, statut: "brouillon" },
        { montant_total: 300, statut: "annulee" },
      ]),
    ).toBe(990);
  });
});

describe("resteAEncaisserParFacture / tropPercu", () => {
  // Cas KARAI : F1 990 facturés / 1 240 versés, F2 200 facturés / rien versé.
  const factures = [
    { id: "f1", montant_total: 990 },
    { id: "f2", montant_total: 200 },
  ];
  const paiements = [
    { facture_id: "f1", montant: 1000 },
    { facture_id: "f1", montant: 240 },
  ];

  it("ne laisse pas un trop-perçu masquer un impayé (deux factures, une en trop-perçu)", () => {
    expect(resteAEncaisserParFacture(factures, paiements)).toBe(200);
    expect(tropPercu(factures, paiements)).toBe(250);
  });

  it("diverge de l'agrégat, qui afficherait « soldé »", () => {
    expect(calculerResteAEncaisser(1190, 1240)).toBe(0);
  });

  it("ignore les versements sans facture rattachée", () => {
    expect(resteAEncaisserParFacture(factures, [{ facture_id: null, montant: 5000 }])).toBe(1190);
    expect(tropPercu(factures, [{ facture_id: null, montant: 5000 }])).toBe(0);
  });

  it("tolère les montants en chaîne et les listes vides", () => {
    expect(resteAEncaisserParFacture([{ id: "f1", montant_total: "300" }], [{ facture_id: "f1", montant: "100" }])).toBe(200);
    expect(resteAEncaisserParFacture([], [])).toBe(0);
    expect(tropPercu([], [])).toBe(0);
  });

  it("ne réclame rien sur une facture en brouillon", () => {
    const enBrouillon = [{ id: "f1", montant_total: 990, statut: "brouillon" as const }];
    expect(resteAEncaisserParFacture(enBrouillon, [])).toBe(0);
    expect(tropPercu(enBrouillon, [{ facture_id: "f1", montant: 1200 }])).toBe(0);
  });

  it("ne réclame rien sur une facture annulée", () => {
    const annulee = [{ id: "f1", montant_total: 990, statut: "annulee" as const }];
    expect(resteAEncaisserParFacture(annulee, [])).toBe(0);
    expect(tropPercu(annulee, [{ facture_id: "f1", montant: 1200 }])).toBe(0);
  });

  it("mélange trop-perçu, impayé, brouillon et annulée sur un même apprenant", () => {
    // F1 soldée en trop, F2 impayée, F3 brouillon, F4 annulée déjà encaissée.
    const melange = [
      { id: "f1", montant_total: 990, statut: "payee" },
      { id: "f2", montant_total: 200, statut: "impayee" },
      { id: "f3", montant_total: 500, statut: "brouillon" },
      { id: "f4", montant_total: 300, statut: "annulee" },
    ];
    const versements = [
      { facture_id: "f1", montant: 1240 },
      { facture_id: "f3", montant: 50 },
      { facture_id: "f4", montant: 300 },
    ];
    expect(sommeFactures(melange)).toBe(1190);
    expect(resteAEncaisserParFacture(melange, versements)).toBe(200);
    expect(tropPercu(melange, versements)).toBe(250);
    expect(sommePaiementsFactures(melange, versements)).toBe(1240);
  });
});

describe("sommePaiementsFactures", () => {
  it("additionne les versements des factures comptées", () => {
    const factures = [
      { id: "f1", montant_total: 990, statut: "partiel" },
      { id: "f2", montant_total: 200, statut: "emise" },
    ];
    expect(
      sommePaiementsFactures(factures, [
        { facture_id: "f1", montant: 250 },
        { facture_id: "f2", montant: 100 },
      ]),
    ).toBe(350);
  });

  it("écarte le versement rattaché à un brouillon ou à une annulée : le payé ne dépasse pas le facturé", () => {
    const factures = [
      { id: "f1", montant_total: 990, statut: "emise" },
      { id: "f2", montant_total: 300, statut: "annulee" },
    ];
    const versements = [
      { facture_id: "f1", montant: 250 },
      { facture_id: "f2", montant: 300 },
    ];
    expect(sommePaiementsFactures(factures, versements)).toBe(250);
    expect(sommePaiementsFactures(factures, versements)).toBeLessThanOrEqual(sommeFactures(factures));
  });

  it("ignore les versements sans facture connue", () => {
    expect(sommePaiementsFactures([{ id: "f1", montant_total: 990 }], [{ facture_id: "f9", montant: 500 }])).toBe(0);
    expect(sommePaiementsFactures([], [])).toBe(0);
  });
});

describe("parseMontantSaisi", () => {
  it("accepte un montant strictement positif, décimales comprises", () => {
    expect(parseMontantSaisi("50")).toBe(50);
    expect(parseMontantSaisi("0.01")).toBe(0.01);
    expect(parseMontantSaisi("1234.56")).toBe(1234.56);
  });

  it("accepte la virgule décimale", () => {
    expect(parseMontantSaisi("50,5")).toBe(50.5);
  });

  it("refuse 0, les négatifs et les saisies vides ou non numériques (contrainte CHECK montant > 0)", () => {
    expect(parseMontantSaisi("0")).toBeNull();
    expect(parseMontantSaisi("-50")).toBeNull();
    expect(parseMontantSaisi("")).toBeNull();
    expect(parseMontantSaisi("abc")).toBeNull();
  });
});
