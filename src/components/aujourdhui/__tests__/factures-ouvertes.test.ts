import { describe, it, expect } from "vitest";
import { compteCommeActivite, estFactureOuverte, estInscritSolde } from "../factures-ouvertes";

/**
 * Symptôme rapporté par le directeur : « Aujourd'hui » proposait de relancer le
 * paiement d'un apprenant dont la fiche affiche « Soldé ». Cause : le hub
 * traitait un BROUILLON comme une facture ouverte, alors que la fiche apprenant
 * l'écarte (STATUTS_FACTURE_EXCLUS). Les deux écrans lisaient le même
 * apprenant et n'en disaient pas la même chose.
 */

const AUCUN_PAIEMENT = new Map<string, number>();

describe("estFactureOuverte", () => {
  it("n'ouvre PAS un brouillon — le cas exact du symptôme (990 € jamais émis)", () => {
    expect(estFactureOuverte({ id: "f1", statut: "brouillon", montant_total: 990 }, 0)).toBe(false);
  });

  it("ouvre une facture émise impayée", () => {
    expect(estFactureOuverte({ id: "f1", statut: "emise", montant_total: 990 }, 0)).toBe(true);
  });

  it("ouvre une facture partiellement réglée ou déclarée impayée", () => {
    expect(estFactureOuverte({ id: "f1", statut: "partiel", montant_total: 990 }, 250)).toBe(true);
    expect(estFactureOuverte({ id: "f1", statut: "impayee", montant_total: 990 }, 0)).toBe(true);
  });

  it("n'ouvre ni une payée ni une annulée", () => {
    expect(estFactureOuverte({ id: "f1", statut: "payee", montant_total: 990 }, 990)).toBe(false);
    expect(estFactureOuverte({ id: "f1", statut: "annulee", montant_total: 990 }, 0)).toBe(false);
  });

  it("n'ouvre pas une facture émise déjà réglée dont le statut n'a pas suivi", () => {
    expect(estFactureOuverte({ id: "f1", statut: "emise", montant_total: 990 }, 990)).toBe(false);
  });

  it("n'ouvre pas une facture en trop-perçu (le restant dû ne devient pas négatif)", () => {
    expect(estFactureOuverte({ id: "f1", statut: "emise", montant_total: 990 }, 1240)).toBe(false);
  });

  it("tolère un montant en chaîne et un statut non chargé", () => {
    expect(estFactureOuverte({ id: "f1", statut: "emise", montant_total: "990" }, 250)).toBe(true);
    // Statut absent : la facture compte (cf. estFactureComptee).
    expect(estFactureOuverte({ id: "f1", montant_total: 990 }, 0)).toBe(true);
  });
});

describe("relance de paiement — assiette du hub « Aujourd'hui »", () => {
  const HIER = "2026-09-10";
  const AUJOURDHUI = "2026-09-11";

  // Deux apprenants, une facture chacun, toutes deux échues hier.
  const factures = [
    {
      id: "f-brouillon",
      contact_id: "apprenant-solde",
      statut: "brouillon",
      montant_total: 990,
      date_echeance: HIER,
    },
    {
      id: "f-emise",
      contact_id: "apprenant-debiteur",
      statut: "emise",
      montant_total: 990,
      date_echeance: HIER,
    },
  ];

  /** Reproduit la boucle du hub qui alimente `contactHasLatePayment`. */
  function contactsARelancer(): Set<string> {
    const enRetard = new Set<string>();
    for (const f of factures) {
      if (!estFactureOuverte(f, 0)) continue;
      if (f.date_echeance && f.date_echeance < AUJOURDHUI) enRetard.add(f.contact_id);
    }
    return enRetard;
  }

  it("ne relance PAS l'apprenant dont la seule facture est un brouillon de 990 €", () => {
    expect(contactsARelancer().has("apprenant-solde")).toBe(false);
  });

  it("relance bien l'apprenant qui a une facture émise impayée", () => {
    expect(contactsARelancer().has("apprenant-debiteur")).toBe(true);
  });
});

describe("estInscritSolde", () => {
  it("ne déclare PAS payé un inscrit sans aucune facture", () => {
    // `[].every()` vaut `true` : sans la garde sur le vide, l'inscrit
    // passerait « payé » par vacuité.
    expect(estInscritSolde([], AUCUN_PAIEMENT)).toBe(false);
  });

  it("ne déclare PAS payé un inscrit dont la seule facture est un brouillon", () => {
    expect(
      estInscritSolde([{ id: "f1", statut: "brouillon", montant_total: 990 }], AUCUN_PAIEMENT),
    ).toBe(false);
  });

  it("ne déclare PAS payé un inscrit dont la seule facture est annulée", () => {
    expect(
      estInscritSolde([{ id: "f1", statut: "annulee", montant_total: 990 }], AUCUN_PAIEMENT),
    ).toBe(false);
  });

  it("déclare payé un inscrit dont la facture comptée est soldée", () => {
    expect(
      estInscritSolde(
        [{ id: "f1", statut: "payee", montant_total: 990 }],
        new Map([["f1", 990]]),
      ),
    ).toBe(true);
  });

  it("ignore le brouillon qui accompagne une facture soldée (régression du bloc préparation)", () => {
    // Avant : le brouillon faisait échouer le `every`, l'inscrit s'affichait
    // NON PAYÉ alors que sa facture réelle était réglée.
    expect(
      estInscritSolde(
        [
          { id: "f1", statut: "payee", montant_total: 990 },
          { id: "f2", statut: "brouillon", montant_total: 500 },
        ],
        new Map([["f1", 990]]),
      ),
    ).toBe(true);
  });

  it("ne déclare pas payé un inscrit qui garde une facture émise impayée", () => {
    expect(
      estInscritSolde(
        [
          { id: "f1", statut: "payee", montant_total: 990 },
          { id: "f2", statut: "emise", montant_total: 200 },
        ],
        new Map([["f1", 990]]),
      ),
    ).toBe(false);
  });
});

/**
 * Visibilité des contacts dans « Aujourd'hui » (blocs CMA et critiques).
 *
 * Piège du 11/09/2026, commis DEUX fois : en resserrant « facture ouverte »
 * pour corriger les relances, le lot a d'abord fait SORTIR des contacts de
 * l'écran ; puis, en réparant, il les a fait rentrer TROP largement — les
 * factures payées étant incluses, des apprenants soldés et dormants
 * remontaient. Ces cas figent le critère de main : ni plus, ni moins.
 */
describe("compteCommeActivite", () => {
  it("retient un brouillon : un devis préparé reste un signe d'activité", () => {
    expect(compteCommeActivite({ statut: "brouillon" })).toBe(true);
  });

  it("retient une facture émise, partielle ou impayée", () => {
    expect(compteCommeActivite({ statut: "emise" })).toBe(true);
    expect(compteCommeActivite({ statut: "partiel" })).toBe(true);
    expect(compteCommeActivite({ statut: "impayee" })).toBe(true);
  });

  it("écarte une facture payée : un apprenant soldé et dormant ne doit pas remonter", () => {
    expect(compteCommeActivite({ statut: "payee" })).toBe(false);
  });

  it("écarte une facture annulée", () => {
    expect(compteCommeActivite({ statut: "annulee" })).toBe(false);
  });

  it("ne dit RIEN de la créance : visible ici, jamais relançable pour autant", () => {
    expect(compteCommeActivite({ statut: "brouillon" })).toBe(true);
    expect(estFactureOuverte({ id: "f1", statut: "brouillon", montant_total: 990 }, 0)).toBe(false);
  });

  it("tolère un statut absent", () => {
    expect(compteCommeActivite({})).toBe(true);
    expect(compteCommeActivite({ statut: null })).toBe(true);
  });
});
