import { describe, it, expect } from "vitest";
import { calculerResteAEncaisser, sommeFactures, sommeMontants } from "../montants";

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

describe("sommeMontants / sommeFactures", () => {
  it("additionne en ignorant les valeurs manquantes ou non numériques", () => {
    expect(sommeMontants([{ montant: 250 }, { montant: "740" }, { montant: null }, {}])).toBe(990);
    expect(sommeFactures([{ montant_total: 990 }, { montant_total: "250.5" }, { montant_total: undefined }])).toBe(1240.5);
  });

  it("vaut 0 sur une liste vide", () => {
    expect(sommeMontants([])).toBe(0);
    expect(sommeFactures([])).toBe(0);
  });
});
