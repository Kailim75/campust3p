import { describe, it, expect } from "vitest";
// Type seul : importer la valeur construirait un client Supabase dans les tests.
import type { supabase } from "@/integrations/supabase/client";
import {
  STATUTS_FACTURE_EXCLUS,
  calculerResteAEncaisser,
  estFactureComptee,
  etatSolde,
  facturesEncaissables,
  filtreFacturesComptees,
  parseMontantSaisi,
  resteAEncaisserParFacture,
  sommeFactures,
  sommePaiementsFactures,
  sommePaiementsFacturesPeriode,
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

describe("sommeFactures", () => {
  it("additionne en ignorant les valeurs manquantes ou non numériques", () => {
    expect(sommeFactures([{ montant_total: 990 }, { montant_total: "250.5" }, { montant_total: undefined }])).toBe(1240.5);
  });

  it("vaut 0 sur une liste vide", () => {
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

describe("facturesEncaissables", () => {
  it("ne garde que les factures qui comptent dans les totaux", () => {
    const factures = [
      { id: "f1", statut: "emise" },
      { id: "f2", statut: "brouillon" },
      { id: "f3", statut: "annulee" },
      { id: "f4", statut: "partiel" },
    ];
    expect(facturesEncaissables(factures).map((f) => f.id)).toEqual(["f1", "f4"]);
  });

  it("ne propose rien à encaisser quand l'apprenant n'a qu'un brouillon", () => {
    // Régression B2 : un versement rattaché à ce brouillon serait exclu du
    // « Payé » comme du reste à encaisser — saisie visible, totaux immobiles.
    expect(facturesEncaissables([{ id: "f1", statut: "brouillon" }])).toEqual([]);
  });

  it("garde une facture dont le statut n'a pas été chargé", () => {
    expect(facturesEncaissables([{ id: "f1" }, { id: "f2", statut: null }])).toHaveLength(2);
  });
});

// Vérification de TYPE, jamais exécutée : `tsc` prouve ici que le helper se
// chaîne sur une vraie requête PostgREST et renvoie un type encore chaînable.
// Sans elle, une régression de typage ne se verrait qu'à l'usage, dans les
// écrans. `import type` : aucun client Supabase n'est construit par les tests.
export function _verifieChainageSupabase(client: typeof supabase) {
  return filtreFacturesComptees(client.from("factures").select("id, montant_total, statut"))
    .is("deleted_at", null)
    .eq("contact_id", "peu-importe");
}

// Les 6 valeurs de l'enum Postgres `facture_statut`, telles qu'elles sont en
// base — et la liste blanche que les écrans écrivaient à la main.
const TOUS_LES_STATUTS = ["brouillon", "emise", "payee", "partiel", "impayee", "annulee"];
const LISTE_BLANCHE = ["emise", "partiel", "impayee", "payee"];

/** Requête factice : capture les arguments passés au filtre et se chaîne. */
type QueryFactice = {
  appels: Array<[string, string, string]>;
  not: (colonne: string, operateur: string, valeur: string) => QueryFactice;
};

function queryFactice(): QueryFactice {
  const query: QueryFactice = {
    appels: [],
    not: (colonne, operateur, valeur) => {
      query.appels.push([colonne, operateur, valeur]);
      return query;
    },
  };
  return query;
}

describe("filtreFacturesComptees", () => {
  it("écarte brouillon ET annulée, là où les écrans n'écartaient que l'annulée", () => {
    // Défaut réel : `.not("statut","eq","annulee")` laissait les brouillons
    // entrer dans le chiffre d'affaires — un devis non émis était facturé.
    const query = queryFactice();
    filtreFacturesComptees(query);
    expect(query.appels).toEqual([["statut", "in", "(brouillon,annulee)"]]);
  });

  it("renvoie la requête pour ne pas casser le chaînage", () => {
    const query = queryFactice();
    expect(filtreFacturesComptees(query)).toBe(query);
  });

  it("dérive la chaîne de STATUTS_FACTURE_EXCLUS, sans recopie en dur", () => {
    // La constante ne peut pas être mutée depuis le test : on verrouille donc
    // l'égalité STRICTE avec ce qu'elle produit. Une liste recopiée à la main
    // dans le helper — ou un statut ajouté à la constante sans toucher au
    // filtre SQL — fait tomber ce test.
    const query = queryFactice();
    filtreFacturesComptees(query);
    expect(query.appels[0][2]).toBe(`(${STATUTS_FACTURE_EXCLUS.join(",")})`);
  });

  it("écarte côté SQL exactement ce qu'estFactureComptee écarte côté JS", () => {
    // Le vrai risque n'est pas la faute de frappe, c'est la DÉRIVE : un filtre
    // SQL et un filtre JS qui ne disent plus la même chose donnent un total
    // « facturé » et un total « payé » calculés sur deux lots différents.
    const query = queryFactice();
    filtreFacturesComptees(query);
    const exclusParSQL = query.appels[0][2].slice(1, -1).split(",");
    for (const statut of TOUS_LES_STATUTS) {
      expect(exclusParSQL.includes(statut)).toBe(!estFactureComptee({ statut }));
    }
  });
});

describe("liste blanche et exclusion sur les 6 valeurs de l'enum", () => {
  it("donnent le même résultat aujourd'hui — mais c'est l'exclusion qui fait foi", () => {
    // Elles coïncident tant que l'enum vaut ces 6 valeurs. Si un statut est
    // ajouté demain (« en_litige »…), la liste blanche le ferait disparaître
    // des totaux EN SILENCE, alors que l'exclusion le comptera. C'est pourquoi
    // les écrans passent par estFactureComptee / filtreFacturesComptees et
    // jamais par une énumération des statuts valides.
    for (const statut of TOUS_LES_STATUTS) {
      expect(estFactureComptee({ statut })).toBe(LISTE_BLANCHE.includes(statut));
    }
  });

  it("compte un statut ajouté demain plutôt que de le perdre", () => {
    expect(LISTE_BLANCHE.includes("en_litige")).toBe(false);
    expect(estFactureComptee({ statut: "en_litige" })).toBe(true);
  });
});

describe("sommePaiementsFacturesPeriode", () => {
  const factures = [
    { id: "f1", montant_total: 990, statut: "payee" },
    { id: "f2", montant_total: 500, statut: "brouillon" },
    { id: "f3", montant_total: 300, statut: "annulee" },
  ];
  const versements = [
    { facture_id: "f1", montant: 400, date_paiement: "2026-09-03" },
    { facture_id: "f1", montant: 590, date_paiement: "2026-08-28" },
    { facture_id: "f2", montant: 250, date_paiement: "2026-09-05" },
    { facture_id: "f3", montant: 300, date_paiement: "2026-09-07" },
  ];
  const enSeptembre = (p: { date_paiement: string }) => p.date_paiement.startsWith("2026-09");

  it("n'ajoute au payé du mois que les versements rattachés à une facture comptée", () => {
    // Défaut réel : le CA mensuel et les piliers sommaient TOUS les paiements
    // du mois — les 250 € encaissés sur un brouillon et les 300 € d'une
    // annulée gonflaient la barre « payé ».
    expect(sommePaiementsFacturesPeriode(factures, versements, enSeptembre)).toBe(400);
  });

  it("empêche le payé du mois de dépasser le facturé affiché à côté", () => {
    expect(sommePaiementsFacturesPeriode(factures, versements, enSeptembre)).toBeLessThanOrEqual(
      sommeFactures(factures),
    );
  });

  it("laisse dehors le versement du mois précédent sur la même facture", () => {
    expect(sommePaiementsFactures(factures, versements)).toBe(990);
    expect(sommePaiementsFacturesPeriode(factures, versements, enSeptembre)).toBe(400);
  });

  it("vaut 0 sur une période sans versement", () => {
    expect(sommePaiementsFacturesPeriode(factures, versements, () => false)).toBe(0);
  });

  it("ignore les versements rattachés à une facture inconnue du lot", () => {
    const orphelin = [{ facture_id: "f9", montant: 800, date_paiement: "2026-09-02" }];
    expect(sommePaiementsFacturesPeriode(factures, orphelin, enSeptembre)).toBe(0);
  });
});

describe("etatSolde", () => {
  it("« rien à encaisser » quand rien n'est facturé — pas « soldé »", () => {
    // Régression B3 : une seule facture de 990 € en brouillon sort du total
    // facturé ; l'apprenant affichait 0/0/0 et le badge « Soldé ».
    expect(etatSolde(0, 0)).toBe("rien");
    expect(etatSolde(0, 0)).not.toBe("solde");
  });

  it("« impayé » tant qu'il reste quelque chose à encaisser", () => {
    expect(etatSolde(990, 990)).toBe("impaye");
    expect(etatSolde(990, 740)).toBe("impaye");
  });

  it("« soldé » seulement sur une créance réelle éteinte", () => {
    expect(etatSolde(990, 0)).toBe("solde");
  });

  it("tolère les montants en chaîne et les valeurs absentes", () => {
    expect(etatSolde("990", "0")).toBe("solde");
    expect(etatSolde(null, null)).toBe("rien");
    expect(etatSolde(undefined, 200)).toBe("rien");
  });
});
