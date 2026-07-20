import { describe, it, expect } from "vitest";
import {
  computeParcours,
  classerExamensParContact,
  SEUILS_PARCOURS,
  type ExamenTheorieFacts,
  type ExamenPratiqueFacts,
  type ExamenT3pRow,
  type ParcoursFacts,
} from "@/lib/parcours-examen";

// Date de référence fixe pour tous les tests (déterminisme).
const NOW = new Date("2026-07-17T10:00:00Z");

/** Décale une date de `n` jours avant NOW, au format YYYY-MM-DD. */
function ilYaJours(n: number): string {
  const d = new Date(NOW);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}
/** Date dans `n` jours (futur). */
function dansJours(n: number): string {
  return ilYaJours(-n);
}

function theorie(p: Partial<ExamenTheorieFacts>): ExamenTheorieFacts {
  return {
    date_examen: null,
    resultat: null,
    date_resultat_recu: null,
    date_reussite: null,
    date_convocation_pratique_recue: null,
    numero_convocation: null,
    ...p,
  };
}
function pratique(p: Partial<ExamenPratiqueFacts>): ExamenPratiqueFacts {
  return { date_examen: null, resultat: null, date_resultat_recu: null, ...p };
}
function facts(p: Partial<ParcoursFacts>): ParcoursFacts {
  return { theorie: null, pratique: null, ...p };
}

describe("computeParcours — colonne vertébrale des étapes", () => {
  it("aucun examen → inscrit", () => {
    const r = computeParcours(facts({}), NOW);
    expect(r.stage).toBe("inscrit");
    expect(r.kind).toBe("spine");
    expect(r.attente).toBeUndefined();
  });

  it("théorie à venir → theorie_planifiee (pas d'attente)", () => {
    const r = computeParcours(
      facts({ theorie: theorie({ date_examen: dansJours(5) }) }),
      NOW,
    );
    expect(r.stage).toBe("theorie_planifiee");
    expect(r.attente).toBeUndefined();
  });

  it("théorie passée sans résultat → theorie_attente_resultat (waiting)", () => {
    const r = computeParcours(
      facts({ theorie: theorie({ date_examen: ilYaJours(3) }) }),
      NOW,
    );
    expect(r.stage).toBe("theorie_attente_resultat");
    expect(r.kind).toBe("waiting");
    expect(r.attente?.type).toBe("resultat_theorie");
    expect(r.attente?.joursEcoules).toBe(3);
    expect(r.attente?.niveau).toBe("ok");
  });

  it("théorie admise sans convocation → attente_convocation_cma (waiting)", () => {
    const r = computeParcours(
      facts({
        theorie: theorie({
          date_examen: ilYaJours(30),
          resultat: "admis",
          date_reussite: ilYaJours(25),
        }),
      }),
      NOW,
    );
    expect(r.stage).toBe("attente_convocation_cma");
    expect(r.attente?.type).toBe("convocation_cma");
    // Référence = date_reussite (J-25), pas la date d'examen.
    expect(r.attente?.joursEcoules).toBe(25);
    expect(r.attente?.niveau).toBe("rappel"); // 25 ≥ 21 et < 28
  });

  it("théorie admise + convocation reçue → convocation_recue", () => {
    const r = computeParcours(
      facts({
        theorie: theorie({
          date_examen: ilYaJours(30),
          resultat: "admis",
          date_convocation_pratique_recue: ilYaJours(2),
        }),
      }),
      NOW,
    );
    expect(r.stage).toBe("convocation_recue");
    expect(r.attente).toBeUndefined();
  });

  it("numero_convocation seul suffit à sortir de l'attente CMA", () => {
    const r = computeParcours(
      facts({
        theorie: theorie({
          date_examen: ilYaJours(30),
          resultat: "admis",
          numero_convocation: "CMA-2026-00123",
        }),
      }),
      NOW,
    );
    expect(r.stage).toBe("convocation_recue");
  });

  it("convocation reçue + conduite programmée → conduite_programmee", () => {
    const r = computeParcours(
      facts({
        theorie: theorie({
          date_examen: ilYaJours(30),
          resultat: "admis",
          date_convocation_pratique_recue: ilYaJours(2),
        }),
        conduiteProgrammee: true,
      }),
      NOW,
    );
    expect(r.stage).toBe("conduite_programmee");
  });

  it("examen pratique à venir → pratique_planifiee", () => {
    const r = computeParcours(
      facts({
        theorie: theorie({ date_examen: ilYaJours(60), resultat: "admis" }),
        pratique: pratique({ date_examen: dansJours(4) }),
      }),
      NOW,
    );
    expect(r.stage).toBe("pratique_planifiee");
    expect(r.attente).toBeUndefined();
  });

  it("pratique passée sans résultat → pratique_attente_resultat (waiting)", () => {
    const r = computeParcours(
      facts({
        theorie: theorie({ date_examen: ilYaJours(60), resultat: "admis" }),
        pratique: pratique({ date_examen: ilYaJours(10) }),
      }),
      NOW,
    );
    expect(r.stage).toBe("pratique_attente_resultat");
    expect(r.attente?.type).toBe("resultat_pratique");
    expect(r.attente?.joursEcoules).toBe(10);
  });

  it("pratique admise → admis (état terminal)", () => {
    const r = computeParcours(
      facts({
        theorie: theorie({ date_examen: ilYaJours(90), resultat: "admis" }),
        pratique: pratique({ date_examen: ilYaJours(20), resultat: "admis" }),
      }),
      NOW,
    );
    expect(r.stage).toBe("admis");
    expect(r.kind).toBe("done");
  });
});

describe("computeParcours — branches d'échec (réinscription)", () => {
  it("théorie ajournée → theorie_a_reprogrammer", () => {
    const r = computeParcours(
      facts({ theorie: theorie({ date_examen: ilYaJours(5), resultat: "ajourne" }) }),
      NOW,
    );
    expect(r.stage).toBe("theorie_a_reprogrammer");
    expect(r.kind).toBe("failed");
  });

  it("théorie absent → theorie_a_reprogrammer", () => {
    const r = computeParcours(
      facts({ theorie: theorie({ date_examen: ilYaJours(5), resultat: "absent" }) }),
      NOW,
    );
    expect(r.stage).toBe("theorie_a_reprogrammer");
  });

  it("pratique ajournée → pratique_a_reprogrammer", () => {
    const r = computeParcours(
      facts({
        theorie: theorie({ date_examen: ilYaJours(60), resultat: "admis" }),
        pratique: pratique({ date_examen: ilYaJours(5), resultat: "ajourne" }),
      }),
      NOW,
    );
    expect(r.stage).toBe("pratique_a_reprogrammer");
    expect(r.kind).toBe("failed");
  });

  it("variantes legacy pratique (defavorable/refuse) → échec ; favorable → admis", () => {
    const base = { theorie: theorie({ date_examen: ilYaJours(60), resultat: "admis" }) };
    for (const res of ["defavorable", "refuse"]) {
      expect(
        computeParcours(
          facts({ ...base, pratique: pratique({ date_examen: ilYaJours(5), resultat: res }) }),
          NOW,
        ).stage,
      ).toBe("pratique_a_reprogrammer");
    }
    expect(
      computeParcours(
        facts({ ...base, pratique: pratique({ date_examen: ilYaJours(5), resultat: "favorable" }) }),
        NOW,
      ).stage,
    ).toBe("admis");
  });
});

describe("computeParcours — seuils de dépassement", () => {
  it("résultat théorie : ok < 21, rappel à 21, alerte à 35", () => {
    const at = (n: number) =>
      computeParcours(facts({ theorie: theorie({ date_examen: ilYaJours(n) }) }), NOW).attente!;
    expect(at(SEUILS_PARCOURS.resultat.rappel - 1).niveau).toBe("ok");
    expect(at(SEUILS_PARCOURS.resultat.rappel).niveau).toBe("rappel");
    expect(at(SEUILS_PARCOURS.resultat.alerte - 1).niveau).toBe("rappel");
    expect(at(SEUILS_PARCOURS.resultat.alerte).niveau).toBe("alerte");
    expect(at(SEUILS_PARCOURS.resultat.alerte + 10).niveau).toBe("alerte");
  });

  it("convocation CMA : ok < 21, rappel à 21, alerte à 28", () => {
    const at = (n: number) =>
      computeParcours(
        facts({
          theorie: theorie({
            date_examen: ilYaJours(n + 5),
            resultat: "admis",
            date_reussite: ilYaJours(n),
          }),
        }),
        NOW,
      ).attente!;
    expect(at(SEUILS_PARCOURS.convocation.rappel - 1).niveau).toBe("ok");
    expect(at(SEUILS_PARCOURS.convocation.rappel).niveau).toBe("rappel");
    expect(at(SEUILS_PARCOURS.convocation.alerte - 1).niveau).toBe("rappel");
    expect(at(SEUILS_PARCOURS.convocation.alerte).niveau).toBe("alerte");
  });

  it("résultat pratique suit les mêmes seuils que la théorie", () => {
    const at = (n: number) =>
      computeParcours(
        facts({
          theorie: theorie({ date_examen: ilYaJours(90), resultat: "admis" }),
          pratique: pratique({ date_examen: ilYaJours(n) }),
        }),
        NOW,
      ).attente!;
    expect(at(20).niveau).toBe("ok");
    expect(at(21).niveau).toBe("rappel");
    expect(at(35).niveau).toBe("alerte");
  });
});

describe("computeParcours — boîte mail interne (Outlook)", () => {
  it("pas d'email interne → aucune info boîte mail", () => {
    const r = computeParcours(facts({ theorie: theorie({ date_examen: ilYaJours(3) }) }), NOW);
    expect(r.boiteMail).toBeUndefined();
  });

  it("jamais consultée → à consulter", () => {
    const r = computeParcours(
      facts({
        theorie: theorie({ date_examen: ilYaJours(3) }),
        emailInterne: "cand.dupont@ecolet3p-interne.fr",
        emailInterneConsulteLe: null,
      }),
      NOW,
    );
    expect(r.boiteMail?.aConsulter).toBe(true);
    expect(r.boiteMail?.joursDepuisConsultation).toBeNull();
  });

  it("consultée il y a 7 jours → à consulter ; 6 jours → non", () => {
    const build = (n: number) =>
      computeParcours(
        facts({
          theorie: theorie({ date_examen: ilYaJours(3) }),
          emailInterne: "x@interne.fr",
          emailInterneConsulteLe: ilYaJours(n),
        }),
        NOW,
      ).boiteMail!;
    expect(build(SEUILS_PARCOURS.boiteMail.rappel).aConsulter).toBe(true);
    expect(build(SEUILS_PARCOURS.boiteMail.rappel - 1).aConsulter).toBe(false);
  });

  it("l'info boîte mail est indépendante de l'étape du parcours", () => {
    const r = computeParcours(
      facts({
        theorie: theorie({ date_examen: ilYaJours(90), resultat: "admis" }),
        pratique: pratique({ date_examen: ilYaJours(20), resultat: "admis" }),
        emailInterne: "x@interne.fr",
        emailInterneConsulteLe: ilYaJours(30),
      }),
      NOW,
    );
    expect(r.stage).toBe("admis");
    expect(r.boiteMail?.aConsulter).toBe(true);
  });

  it("email vide ou espaces → ignoré", () => {
    const r = computeParcours(
      facts({ theorie: theorie({ date_examen: ilYaJours(3) }), emailInterne: "   " }),
      NOW,
    );
    expect(r.boiteMail).toBeUndefined();
  });
});

describe("computeParcours — résultat « en_attente » (valeur posée par la fiche)", () => {
  it("théorie en_attente passée → attente de résultat (pas « inscrit »)", () => {
    const r = computeParcours(
      facts({ theorie: theorie({ date_examen: ilYaJours(10), resultat: "en_attente" }) }),
      NOW,
    );
    expect(r.stage).toBe("theorie_attente_resultat");
    expect(r.attente?.joursEcoules).toBe(10);
  });

  it("théorie en_attente à venir → planifiée", () => {
    const r = computeParcours(
      facts({ theorie: theorie({ date_examen: dansJours(5), resultat: "en_attente" }) }),
      NOW,
    );
    expect(r.stage).toBe("theorie_planifiee");
  });

  it("pratique en_attente passée → attente de résultat", () => {
    const r = computeParcours(
      facts({
        theorie: theorie({ date_examen: ilYaJours(60), resultat: "admis" }),
        pratique: pratique({ date_examen: ilYaJours(8), resultat: "en_attente" }),
      }),
      NOW,
    );
    expect(r.stage).toBe("pratique_attente_resultat");
    expect(r.attente?.joursEcoules).toBe(8);
  });

  it("valeur de résultat inconnue → traitée comme une attente (donnée à corriger)", () => {
    const r = computeParcours(
      facts({ theorie: theorie({ date_examen: ilYaJours(4), resultat: "typo_inconnue" }) }),
      NOW,
    );
    expect(r.stage).toBe("theorie_attente_resultat");
  });
});

describe("computeParcours — référence du compteur de convocation CMA", () => {
  it("préfère date_resultat_recu (jour où le résultat a été connu)", () => {
    const r = computeParcours(
      facts({
        theorie: theorie({
          date_examen: ilYaJours(40),
          resultat: "admis",
          date_reussite: ilYaJours(40),
          date_resultat_recu: ilYaJours(10),
        }),
      }),
      NOW,
    );
    expect(r.stage).toBe("attente_convocation_cma");
    expect(r.attente?.joursEcoules).toBe(10);
    expect(r.attente?.niveau).toBe("ok");
  });
});

describe("computeParcours — priorité pratique sur théorie", () => {
  it("un examen pratique existant prime sur l'attente de convocation", () => {
    // Théorie admise sans convocation ENREGISTRÉE, mais un pratique est déjà
    // programmé → on est déjà plus loin dans le parcours.
    const r = computeParcours(
      facts({
        theorie: theorie({ date_examen: ilYaJours(60), resultat: "admis" }),
        pratique: pratique({ date_examen: dansJours(3) }),
      }),
      NOW,
    );
    expect(r.stage).toBe("pratique_planifiee");
  });
});

describe("classerExamensParContact — classification partagée hub/session", () => {
  const row = (p: Partial<ExamenT3pRow>): ExamenT3pRow => ({
    contact_id: "c1",
    type_formation: "VTC",
    date_examen: null,
    resultat: null,
    date_resultat_recu: null,
    date_reussite: null,
    date_convocation_pratique_recue: null,
    numero_convocation: null,
    ...p,
  });

  it("garde le dernier examen théorique par candidat", () => {
    const m = classerExamensParContact(
      [
        row({ date_examen: "2026-01-10", resultat: "ajourne" }),
        row({ date_examen: "2026-03-10", resultat: "admis" }),
      ],
      [],
    );
    expect(m.get("c1")?.theorie?.resultat).toBe("admis");
    expect(m.get("c1")?.pratique).toBeNull();
  });

  it("classe les lignes t3p type 'pratique' comme épreuves pratiques", () => {
    const m = classerExamensParContact(
      [
        row({ date_examen: "2026-02-01", resultat: "admis" }),
        row({ type_formation: "pratique", date_examen: "2026-04-01", resultat: "en_attente" }),
      ],
      [],
    );
    expect(m.get("c1")?.theorie?.date_examen).toBe("2026-02-01");
    expect(m.get("c1")?.pratique?.date_examen).toBe("2026-04-01");
  });

  it("fusionne examens_pratique et lignes t3p pratique en gardant la plus récente", () => {
    const m = classerExamensParContact(
      [row({ type_formation: "pratique", date_examen: "2026-03-01", resultat: "ajourne" })],
      [{ contact_id: "c1", date_examen: "2026-05-01", resultat: "admis", date_resultat_recu: null }],
    );
    expect(m.get("c1")?.pratique?.resultat).toBe("admis");
  });

  it("sépare bien les candidats", () => {
    const m = classerExamensParContact(
      [row({ contact_id: "a", date_examen: "2026-01-01" }), row({ contact_id: "b", date_examen: "2026-02-01" })],
      [],
    );
    expect(m.get("a")?.theorie?.date_examen).toBe("2026-01-01");
    expect(m.get("b")?.theorie?.date_examen).toBe("2026-02-01");
  });
});

describe("classerExamensParContact — id et table d'origine (actions du hub)", () => {
  it("conserve l'id et marque la source t3p pour une ligne t3p type pratique", () => {
    const m = classerExamensParContact(
      [{
        id: "ex-1", contact_id: "c1", type_formation: "pratique",
        date_examen: "2026-05-01", resultat: null, date_resultat_recu: null,
        date_reussite: null, date_convocation_pratique_recue: null, numero_convocation: null,
      }],
      [],
    );
    expect(m.get("c1")?.pratique?.id).toBe("ex-1");
    expect(m.get("c1")?.pratique?.source).toBe("t3p");
  });

  it("marque la source pratique pour une ligne de la table examens_pratique", () => {
    const m = classerExamensParContact(
      [],
      [{ id: "ep-9", contact_id: "c1", date_examen: "2026-06-01", resultat: null, date_resultat_recu: null }],
    );
    expect(m.get("c1")?.pratique?.id).toBe("ep-9");
    expect(m.get("c1")?.pratique?.source).toBe("pratique");
  });

  it("conserve l'id de la théorie (cible du marquage de convocation)", () => {
    const m = classerExamensParContact(
      [{
        id: "th-7", contact_id: "c1", type_formation: "VTC",
        date_examen: "2026-04-01", resultat: "admis", date_resultat_recu: "2026-04-20",
        date_reussite: "2026-04-01", date_convocation_pratique_recue: null, numero_convocation: null,
      }],
      [],
    );
    expect(m.get("c1")?.theorie?.id).toBe("th-7");
  });
});
