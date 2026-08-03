import { describe, it, expect } from "vitest";
import {
  classerUrgence,
  trierRappels,
  compterParUrgence,
  encoderReport,
  decoderReport,
  rejetActif,
  construireRappelsPaiement,
  construireRappelsLibres,
  construireRappelsSession,
  construireRappelsSignature,
  construireRappelsDossier,
  type Rappel,
} from "../rappels";

const AUJOURDHUI = "2026-08-03";

function rappel(partiel: Partial<Rappel>): Rappel {
  return {
    id: "rp:libre:x",
    source: "libre",
    dateEcheance: AUJOURDHUI,
    titre: "Test",
    detail: "",
    joursDeRetard: 0,
    ...partiel,
  };
}

describe("classerUrgence", () => {
  it("sépare retard, aujourd'hui, semaine et plus tard", () => {
    expect(classerUrgence(5)).toBe("retard");
    expect(classerUrgence(0)).toBe("aujourdhui");
    expect(classerUrgence(-3)).toBe("semaine");
    expect(classerUrgence(-7)).toBe("semaine");
    expect(classerUrgence(-8)).toBe("plus_tard");
  });
});

describe("trierRappels", () => {
  it("remonte le plus en retard, puis le montant le plus lourd", () => {
    const tries = trierRappels([
      rappel({ id: "a", joursDeRetard: -2 }),
      rappel({ id: "b", joursDeRetard: 30, montant: 200 }),
      rappel({ id: "c", joursDeRetard: 30, montant: 990 }),
      rappel({ id: "d", joursDeRetard: 0 }),
    ]);
    expect(tries.map((r) => r.id)).toEqual(["c", "b", "d", "a"]);
  });

  it("ne modifie pas le tableau reçu", () => {
    const source = [rappel({ id: "a", joursDeRetard: -2 }), rappel({ id: "b", joursDeRetard: 10 })];
    trierRappels(source);
    expect(source.map((r) => r.id)).toEqual(["a", "b"]);
  });
});

describe("compterParUrgence", () => {
  it("compte chaque fenêtre et le total", () => {
    const counts = compterParUrgence([
      rappel({ joursDeRetard: 4 }),
      rappel({ joursDeRetard: 1 }),
      rappel({ joursDeRetard: 0 }),
      rappel({ joursDeRetard: -30 }),
    ]);
    expect(counts).toEqual({ tous: 4, retard: 2, aujourdhui: 1, semaine: 0, plus_tard: 1 });
  });
});

describe("reports", () => {
  it("encode et décode une date de report", () => {
    expect(decoderReport(encoderReport("2026-08-10"))).toBe("2026-08-10");
  });

  it("ignore un motif libre ou mal formé", () => {
    expect(decoderReport("traité par téléphone")).toBeNull();
    expect(decoderReport("report:demain")).toBeNull();
    expect(decoderReport(null)).toBeNull();
  });

  it("masque définitivement un rejet sans date", () => {
    expect(rejetActif(null, AUJOURDHUI)).toBe(true);
    expect(rejetActif("ignoré", AUJOURDHUI)).toBe(true);
  });

  it("laisse revenir un report échu", () => {
    expect(rejetActif(encoderReport("2026-08-10"), AUJOURDHUI)).toBe(true);
    expect(rejetActif(encoderReport("2026-08-03"), AUJOURDHUI)).toBe(false);
    expect(rejetActif(encoderReport("2026-07-30"), AUJOURDHUI)).toBe(false);
  });
});

describe("construireRappelsPaiement", () => {
  const contacts = new Map([["c1", { id: "c1", nom: "MAHDI", prenom: "Doudou", email: "d@x.fr", telephone: "06" }]]);

  it("retient une facture échue avec un reste dû", () => {
    const rappels = construireRappelsPaiement(
      [{ id: "f1", contact_id: "c1", numero_facture: "F-1", montant_total: 990, date_echeance: "2026-04-14", statut: "emise" }],
      new Map(),
      contacts,
      AUJOURDHUI
    );
    expect(rappels).toHaveLength(1);
    expect(rappels[0]).toMatchObject({
      id: "rp:paiement:f1",
      source: "paiement",
      titre: "Doudou MAHDI",
      montant: 990,
      joursDeRetard: 111,
      factureId: "f1",
    });
    expect(rappels[0].detail).toContain("111 j");
  });

  it("déduit les paiements déjà encaissés et écarte les factures soldées", () => {
    const factures = [
      { id: "f1", contact_id: "c1", numero_facture: "F-1", montant_total: 990, date_echeance: "2026-04-14", statut: "partiel" },
      { id: "f2", contact_id: "c1", numero_facture: "F-2", montant_total: 300, date_echeance: "2026-04-14", statut: "partiel" },
    ];
    const rappels = construireRappelsPaiement(
      factures,
      new Map([
        ["f1", 250],
        ["f2", 300],
      ]),
      contacts,
      AUJOURDHUI
    );
    expect(rappels).toHaveLength(1);
    expect(rappels[0].montant).toBe(740);
  });

  it("ignore les factures payées, annulées et les échéances lointaines", () => {
    const rappels = construireRappelsPaiement(
      [
        { id: "f1", contact_id: "c1", numero_facture: null, montant_total: 500, date_echeance: "2026-04-14", statut: "payee" },
        { id: "f2", contact_id: "c1", numero_facture: null, montant_total: 500, date_echeance: "2026-04-14", statut: "annulee" },
        { id: "f3", contact_id: "c1", numero_facture: null, montant_total: 500, date_echeance: "2026-12-01", statut: "emise" },
        { id: "f4", contact_id: "c1", numero_facture: null, montant_total: 500, date_echeance: null, statut: "emise" },
      ],
      new Map(),
      contacts,
      AUJOURDHUI
    );
    expect(rappels).toHaveLength(0);
  });

  it("annonce une échéance proche sans la présenter comme un retard", () => {
    const rappels = construireRappelsPaiement(
      [{ id: "f1", contact_id: "c1", numero_facture: null, montant_total: 500, date_echeance: "2026-08-08", statut: "emise" }],
      new Map(),
      contacts,
      AUJOURDHUI
    );
    expect(rappels[0].joursDeRetard).toBe(-5);
    expect(rappels[0].detail).toBe("500 € à encaisser");
  });
});

describe("construireRappelsLibres", () => {
  it("retient un rappel actif et daté", () => {
    const rappels = construireRappelsLibres(
      [
        {
          id: "h1",
          contact_id: "c1",
          titre: "Appel",
          rappel_description: "Rappeler pour le solde",
          date_rappel: "2026-08-01",
          alerte_active: true,
          contacts: { id: "c1", nom: "MAHDI", prenom: "Doudou" },
        },
      ],
      AUJOURDHUI
    );
    expect(rappels).toHaveLength(1);
    expect(rappels[0]).toMatchObject({
      id: "rp:libre:h1",
      detail: "Rappeler pour le solde",
      joursDeRetard: 2,
      historiqueId: "h1",
    });
  });

  it("ignore les rappels désactivés ou sans date", () => {
    const rappels = construireRappelsLibres(
      [
        { id: "h1", contact_id: "c1", titre: "x", rappel_description: null, date_rappel: "2026-08-01", alerte_active: false },
        { id: "h2", contact_id: "c1", titre: "x", rappel_description: null, date_rappel: null, alerte_active: true },
      ],
      AUJOURDHUI
    );
    expect(rappels).toHaveLength(0);
  });
});

describe("construireRappelsSession", () => {
  const base = { id: "s1", nom: "Taxi Août", date_debut: "2026-08-06", statut: "a_venir" };

  it("signale une session sans formateur ni lieu", () => {
    const rappels = construireRappelsSession(
      [{ ...base, formateur_id: null, formateur: null, lieu: null, adresse_ville: null }],
      AUJOURDHUI
    );
    expect(rappels).toHaveLength(1);
    expect(rappels[0].detail).toBe("Sans formateur ni lieu — démarre dans 3 j");
    // Échéance = une semaine avant le début : à J-3, on est en retard de 4 jours.
    expect(rappels[0].joursDeRetard).toBe(4);
  });

  it("se tait quand la session est complète, annulée ou terminée", () => {
    expect(
      construireRappelsSession(
        [{ ...base, formateur_id: "f1", formateur: null, lieu: "Montrouge", adresse_ville: null }],
        AUJOURDHUI
      )
    ).toHaveLength(0);
    expect(
      construireRappelsSession(
        [{ ...base, statut: "annulee", formateur_id: null, formateur: null, lieu: null, adresse_ville: null }],
        AUJOURDHUI
      )
    ).toHaveLength(0);
  });

  it("ignore une session déjà commencée", () => {
    const rappels = construireRappelsSession(
      [{ ...base, date_debut: "2026-08-01", formateur_id: null, formateur: null, lieu: null, adresse_ville: null }],
      AUJOURDHUI
    );
    expect(rappels).toHaveLength(0);
  });
});

describe("construireRappelsSignature", () => {
  it("relance une demande en attente au-delà du délai", () => {
    const rappels = construireRappelsSignature(
      [
        {
          id: "sig1",
          contact_id: "c1",
          titre: "Contrat de formation",
          type_document: "contrat",
          statut: "en_attente",
          date_envoi: "2026-07-25",
          created_at: "2026-07-20",
          contacts: { id: "c1", nom: "MAHDI", prenom: "Doudou" },
        },
      ],
      AUJOURDHUI
    );
    expect(rappels).toHaveLength(1);
    // La date d'envoi prime sur la date de création.
    expect(rappels[0].detail).toBe("Contrat de formation non signé depuis 9 j");
    expect(rappels[0].joursDeRetard).toBe(4);
  });

  it("se replie sur la date de création quand l'envoi n'est pas daté", () => {
    const rappels = construireRappelsSignature(
      [
        {
          id: "sig1",
          contact_id: "c1",
          titre: null,
          type_document: "Convention",
          statut: "en_attente",
          date_envoi: null,
          created_at: "2026-07-25",
        },
      ],
      AUJOURDHUI
    );
    expect(rappels[0].detail).toBe("Convention non signé depuis 9 j");
  });

  it("laisse le temps de signer et ignore les demandes signées", () => {
    expect(
      construireRappelsSignature(
        [{ id: "s", contact_id: "c1", titre: "Contrat", type_document: "contrat", statut: "en_attente", date_envoi: "2026-08-01", created_at: "2026-08-01" }],
        AUJOURDHUI
      )
    ).toHaveLength(0);
    expect(
      construireRappelsSignature(
        [{ id: "s", contact_id: "c1", titre: "Contrat", type_document: "contrat", statut: "signe", date_envoi: "2026-07-01", created_at: "2026-07-01" }],
        AUJOURDHUI
      )
    ).toHaveLength(0);
  });
});

describe("construireRappelsDossier", () => {
  const base = {
    contactId: "c1",
    contactNom: "Doudou MAHDI",
    sessionId: "s1",
    sessionNom: "Taxi Août",
    dateDebut: "2026-08-08",
  };

  it("alerte sur les pièces manquantes à l'approche de la session", () => {
    const rappels = construireRappelsDossier([{ ...base, piecesManquantes: ["Photo", "Permis"] }], AUJOURDHUI);
    expect(rappels).toHaveLength(1);
    expect(rappels[0].id).toBe("rp:dossier:c1:s1");
    expect(rappels[0].detail).toBe("Manque : Photo, Permis — session dans 5 j");
    expect(rappels[0].joursDeRetard).toBe(5);
  });

  it("résume au-delà de deux pièces", () => {
    const rappels = construireRappelsDossier(
      [{ ...base, piecesManquantes: ["Photo", "Permis", "Casier", "Visite"] }],
      AUJOURDHUI
    );
    expect(rappels[0].detail).toContain("Photo, Permis +2");
  });

  it("se tait sur un dossier complet ou une session passée", () => {
    expect(construireRappelsDossier([{ ...base, piecesManquantes: [] }], AUJOURDHUI)).toHaveLength(0);
    expect(
      construireRappelsDossier([{ ...base, dateDebut: "2026-07-01", piecesManquantes: ["Photo"] }], AUJOURDHUI)
    ).toHaveLength(0);
  });
});
