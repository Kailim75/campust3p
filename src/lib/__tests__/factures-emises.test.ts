import { describe, it, expect } from "vitest";
import {
  CHAMPS_FACTURE_MODIFIABLES_APRES_EMISSION,
  actionsGestionFacture,
  demandeConfirmationAnnulation,
  executerPlanEnregistrement,
  interpreterAnnulationManuellePermise,
  messageLignesNonEnregistrees,
  nettoyerActionsWorkflow,
  optionsStatutBrouillon,
  optionsStatutFactureEmise,
  planifierEnregistrementFacture,
  texteConfirmationAnnulation,
  STATUTS_FACTURE_AVANT_EMISSION,
  STATUTS_FACTURE_POUR_WORKFLOW,
  type PlanEnregistrementFacture,
} from "@/lib/factures-emises";

/**
 * Garde des factures émises, volet interface (11/09/2026).
 * Les trois pannes prouvées sur le banc PGlite de la migration sont rejouées
 * ici au niveau de la décision « quoi écrire, dans quel ordre ».
 */

const valeursCompletes = {
  contact_id: "k1",
  client_partner_id: null,
  montant_total: 1500,
  type_financement: "personnel",
  statut: "emise",
  date_emission: "2026-09-11",
  date_echeance: null,
  commentaires: null,
};

function ok(plan: PlanEnregistrementFacture) {
  if ("message" in plan) throw new Error(`plan refusé : ${plan.message}`);
  return plan;
}

async function journal(plan: PlanEnregistrementFacture, echecLignes = false) {
  const appels: string[] = [];
  const envoyes: Record<string, unknown>[] = [];
  let erreur: unknown = null;
  try {
    await executerPlanEnregistrement(ok(plan), {
      ecrireLignes: async () => {
        appels.push("lignes");
        if (echecLignes) throw new Error("Suppression de ligne refusée");
      },
      ecrireFacture: async (valeurs) => {
        appels.push("facture");
        envoyes.push(valeurs);
      },
    });
  } catch (e) {
    erreur = e;
  }
  return { appels, envoyes, erreur };
}

describe("planifierEnregistrementFacture — brouillon en base (F1a)", () => {
  it("panne 1 : un brouillon émis dans le formulaire écrit les lignes AVANT la facture", async () => {
    const plan = planifierEnregistrementFacture({
      statutOuverture: "brouillon",
      statutEnBase: "brouillon",
      valeursFacture: valeursCompletes,
      avecLignes: true,
    });
    const { appels, envoyes } = await journal(plan);
    expect(appels).toEqual(["lignes", "facture"]);
    // Un brouillon garde toutes ses valeurs : rien d'autre ne change pour lui.
    expect(envoyes[0]).toEqual(valeursCompletes);
  });

  it("panne 1 bis : si l'écriture des lignes échoue, la facture n'est pas émise", async () => {
    const plan = planifierEnregistrementFacture({
      statutOuverture: "brouillon",
      statutEnBase: "brouillon",
      valeursFacture: valeursCompletes,
      avecLignes: true,
    });
    const { appels, erreur } = await journal(plan, true);
    expect(erreur).toBeTruthy();
    expect(appels).toEqual(["lignes"]);
  });

  it("un brouillon ne peut pas sauter directement à « Payée » ni à « Annulée »", () => {
    // Le déclencheur de snapshot ne s'arme que sur statut = 'emise'. Mesuré au
    // banc : brouillon → 'payee' laisse buyer_*, montant_ht et montant_tva
    // NULL, la garde gèle aussitôt la facture, le retour en brouillon est
    // refusé et le PDF suit la fiche contact VIVANTE (D2 violée).
    for (const statut of ["payee", "partiel", "impayee", "annulee"]) {
      const plan = planifierEnregistrementFacture({
        numeroFacture: "FAC-2026-9001",
        statutOuverture: "brouillon",
        statutEnBase: "brouillon",
        valeursFacture: { ...valeursCompletes, statut },
        avecLignes: true,
      });
      expect("message" in plan && plan.message).toMatch(/émettez d'abord la facture FAC-2026-9001/);
    }
  });

  it("un brouillon reste modifiable et s'émet normalement", () => {
    for (const statut of ["brouillon", "emise"]) {
      const plan = ok(planifierEnregistrementFacture({
        statutOuverture: "brouillon",
        statutEnBase: "brouillon",
        valeursFacture: { ...valeursCompletes, statut },
        avecLignes: true,
      }));
      expect(plan.etapes).toEqual(["lignes", "facture"]);
    }
  });

  it("seuls « Brouillon » et « Émise » sont proposés avant l'émission", () => {
    expect(optionsStatutBrouillon().map((o) => o.value)).toEqual(["brouillon", "emise"]);
    expect(STATUTS_FACTURE_AVANT_EMISSION).not.toContain("annulee");
  });

  it("panne 2 : sans ligne à écrire, seule la facture est écrite", () => {
    const plan = ok(planifierEnregistrementFacture({
      statutOuverture: "brouillon",
      statutEnBase: "brouillon",
      valeursFacture: valeursCompletes,
      avecLignes: false,
    }));
    expect(plan.etapes).toEqual(["facture"]);
  });
});

describe("planifierEnregistrementFacture — facture émise en base (F1b)", () => {
  it("panne 3 : n'envoie QUE { statut }, jamais les lignes ni commentaires normalisé", async () => {
    const plan = planifierEnregistrementFacture({
      numeroFacture: "FAC-2026-0502",
      statutOuverture: "emise",
      statutEnBase: "emise",
      valeursFacture: { ...valeursCompletes, statut: "annulee", commentaires: null },
      avecLignes: true,
    });
    const { appels, envoyes } = await journal(plan);
    expect(appels).toEqual(["facture"]);
    expect(envoyes).toEqual([{ statut: "annulee" }]);
    expect(Object.keys(envoyes[0])).toEqual([...CHAMPS_FACTURE_MODIFIABLES_APRES_EMISSION]);
  });

  it("refuse le retour en brouillon", () => {
    const plan = planifierEnregistrementFacture({
      numeroFacture: "FAC-2026-0502",
      statutOuverture: "payee",
      statutEnBase: "payee",
      valeursFacture: { ...valeursCompletes, statut: "brouillon" },
      avecLignes: true,
    });
    expect("message" in plan && plan.message).toMatch(/ne peut plus redevenir un brouillon/);
  });

  it("statut inchangé : rien à écrire", () => {
    const plan = ok(planifierEnregistrementFacture({
      statutOuverture: "partiel",
      statutEnBase: "partiel",
      valeursFacture: { ...valeursCompletes, statut: "partiel", montant_total: 1 },
      avecLignes: true,
    }));
    expect(plan.etapes).toEqual([]);
  });

  it("sélecteur non touché mais facture passée à « partiel » en base : rien à écrire", () => {
    // Le sélecteur porte la valeur de la copie en CACHE. Sans ce test, un clic
    // sur « Enregistrer le statut » sans rien changer renvoyait { statut:
    // 'emise' } : la garde l'accepte (transitions de règlement libres) et
    // l'état de paiement réel est écrasé en silence.
    const plan = ok(planifierEnregistrementFacture({
      statutOuverture: "emise",
      statutEnBase: "partiel",
      valeursFacture: { ...valeursCompletes, statut: "emise" },
      avecLignes: true,
    }));
    expect(plan.etapes).toEqual([]);
  });

  it("mais un changement réel du sélecteur reste écrit", () => {
    const plan = ok(planifierEnregistrementFacture({
      statutOuverture: "emise",
      statutEnBase: "partiel",
      valeursFacture: { ...valeursCompletes, statut: "payee" },
      avecLignes: true,
    }));
    expect(plan.etapes).toEqual(["facture"]);
    expect(plan.valeursFacture).toEqual({ statut: "payee" });
  });

  it("messageLignesNonEnregistrees dit de réessayer tout de suite", () => {
    // Fenêtre de première saisie de la garde : aucune ligne existante ET
    // facture créée il y a moins de quinze minutes.
    const message = messageLignesNonEnregistrees("FAC-2026-0777");
    expect(message).toMatch(/FAC-2026-0777/);
    expect(message).toMatch(/réessayez immédiatement/);
    expect(message).toMatch(/quinze minutes/);
  });

  it("facture émise ailleurs après l'ouverture en brouillon : refus, aucune écriture", () => {
    const plan = planifierEnregistrementFacture({
      numeroFacture: "FAC-2026-0518",
      statutOuverture: "brouillon",
      statutEnBase: "emise",
      valeursFacture: valeursCompletes,
      avecLignes: true,
    });
    expect("message" in plan && plan.message).toMatch(/a été émise depuis l'ouverture/);
  });
});

describe("annulation manuelle (F1c, F2)", () => {
  it("confirmation demandée uniquement pour une facture émise non annulée passée à annulee", () => {
    expect(demandeConfirmationAnnulation("emise", "annulee")).toBe(true);
    expect(demandeConfirmationAnnulation("payee", "annulee")).toBe(true);
    expect(demandeConfirmationAnnulation("annulee", "annulee")).toBe(false);
    expect(demandeConfirmationAnnulation("emise", "payee")).toBe(false);
    // Rien ne change pour un brouillon.
    expect(demandeConfirmationAnnulation("brouillon", "annulee")).toBe(false);
  });

  it("fonction SQL absente (base actuelle) ou illisible : annulation permise ; false explicite : masquée", () => {
    const absente = { code: "PGRST202", message: "Could not find the function public.factures_annulation_manuelle_permise without parameters in the schema cache" };
    expect(interpreterAnnulationManuellePermise(null, absente)).toBe(true);
    expect(interpreterAnnulationManuellePermise(null, { code: "42883", message: "function does not exist" })).toBe(true);
    expect(interpreterAnnulationManuellePermise(true, null)).toBe(true);
    expect(interpreterAnnulationManuellePermise(false, null)).toBe(false);
  });

  it("Supprimer seulement pour un brouillon ; Annuler pour une émise non annulée", () => {
    expect(actionsGestionFacture("brouillon", true)).toEqual({ supprimer: true, annuler: false });
    expect(actionsGestionFacture("emise", true)).toEqual({ supprimer: false, annuler: true });
    expect(actionsGestionFacture("impayee", true)).toEqual({ supprimer: false, annuler: true });
    expect(actionsGestionFacture("annulee", true)).toEqual({ supprimer: false, annuler: false });
    expect(actionsGestionFacture("emise", false)).toEqual({ supprimer: false, annuler: false });
  });

  it("le sélecteur d'une facture émise ne propose jamais Brouillon", () => {
    const valeurs = optionsStatutFactureEmise("emise", true).map((o) => o.value);
    expect(valeurs).not.toContain("brouillon");
    expect(valeurs).toContain("annulee");
    expect(optionsStatutFactureEmise("emise", false).map((o) => o.value)).not.toContain("annulee");
    expect(optionsStatutFactureEmise("annulee", false).map((o) => o.value)).toContain("annulee");
  });

  it("phase des avoirs : une facture déjà annulée ne propose plus de réactivation", () => {
    // La garde refuse « annulee → autre statut » quand l'interrupteur est à
    // false (« Réactivation refusée ») : le sélecteur ne doit pas proposer une
    // action vouée au refus.
    expect(optionsStatutFactureEmise("annulee", false).map((o) => o.value)).toEqual(["annulee"]);
    // Tant que l'annulation manuelle est permise, la liste reste complète.
    expect(optionsStatutFactureEmise("annulee", true).map((o) => o.value)).toContain("emise");
  });

  it("la confirmation annonce les paiements déjà encaissés (D7)", () => {
    const sansPaiement = texteConfirmationAnnulation("FAC-2026-0502", 0).join(" ");
    expect(sansPaiement).not.toMatch(/de paiements/);

    // Le séparateur de milliers de fr-FR varie selon l'ICU : on le neutralise.
    const avecPaiement = texteConfirmationAnnulation("FAC-2026-0502", 1000).join(" ").replace(/\s/g, " ");
    expect(avecPaiement).toMatch(/1 000,00 € de paiements/);
    expect(avecPaiement).toMatch(/resteront rattachés à la facture annulée/);
    expect(avecPaiement).toMatch(/remboursement se fait à part/);
  });
});

describe("workflows (F7)", () => {
  it("aucun statut brouillon proposé pour les factures", () => {
    expect(STATUTS_FACTURE_POUR_WORKFLOW).not.toContain("brouillon");
  });

  it("une suggestion qui remet une facture en brouillon est vidée", () => {
    const actions = nettoyerActionsWorkflow([
      { type: "update_status", config: { table: "factures", new_status: "brouillon" } },
      { type: "update_status", config: { table: "factures", new_status: "payee" } },
      { type: "update_status", config: { table: "contacts", new_status: "brouillon" } },
    ]);
    expect(actions[0].config.new_status).toBe("");
    expect(actions[1].config.new_status).toBe("payee");
    expect(actions[2].config.new_status).toBe("brouillon");
  });
});
