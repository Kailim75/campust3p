/**
 * Moteur de suivi du parcours d'examen T3P — fonctions pures.
 *
 * Principe directeur (même logique que `statut_cma`) : l'étape du parcours
 * est TOUJOURS calculée à partir des faits (dates + résultats des examens),
 * jamais saisie à la main. Rien ne peut donc être « oublié » : dès qu'un
 * candidat a passé un examen sans que le résultat soit enregistré, il tombe
 * automatiquement dans un état d'attente porteur d'une échéance.
 *
 * Ce module ne lit ni n'écrit la base : il reçoit des faits et renvoie une
 * étape + une éventuelle échéance. L'intégration au hub « Aujourd'hui » et
 * les alertes de dépassement sont branchées ailleurs (lots suivants).
 *
 * Valeurs métier réutilisées (cf. useExamensT3P / useExamensPratique /
 * useAdvancedStats) :
 *   - examens_t3p.resultat      : "admis" | "ajourne" | "absent" | null
 *   - examens_pratique.resultat : "admis" | "ajourne" | "absent"
 *                                 | "favorable" | "defavorable" | "refuse" | null
 */

// ─── Seuils (validés avec la direction le 17/07/2026) ───
//
// Résultats (théorie & pratique) : rappel dès J+21, escalade à J+28,
//   alerte de dépassement à J+35 (≈ 5 semaines après l'examen).
// Convocation CMA à l'épreuve pratique : rappel dès J+21, alerte à J+28
//   (≈ 4 semaines après la réussite théorique).
// Boîte mail interne (Outlook, non rattachée au CRM) : rappel de
//   consultation si non consultée depuis 7 jours.
export const SEUILS_PARCOURS = {
  resultat: { rappel: 21, alerte: 35 },
  convocation: { rappel: 21, alerte: 28 },
  boiteMail: { rappel: 7 },
} as const;

// ─── Étapes du parcours (colonne vertébrale + branches d'échec) ───

export type ParcoursStage =
  | "inscrit"
  | "theorie_planifiee"
  | "theorie_attente_resultat"
  | "theorie_a_reprogrammer"
  | "attente_convocation_cma"
  | "convocation_recue"
  | "conduite_programmee"
  | "pratique_planifiee"
  | "pratique_attente_resultat"
  | "pratique_a_reprogrammer"
  | "admis";

export type StageKind = "spine" | "waiting" | "failed" | "done";

export type UrgenceNiveau = "ok" | "rappel" | "alerte";

export type AttenteType =
  | "resultat_theorie"
  | "convocation_cma"
  | "resultat_pratique";

export const STAGE_LABELS: Record<ParcoursStage, string> = {
  inscrit: "Inscrit",
  theorie_planifiee: "Théorie planifiée",
  theorie_attente_resultat: "Théorie passée — en attente du résultat",
  theorie_a_reprogrammer: "Théorie ajournée — à réinscrire",
  attente_convocation_cma: "En attente de convocation CMA",
  convocation_recue: "Convocation reçue — heures à programmer",
  conduite_programmee: "Heures de conduite programmées",
  pratique_planifiee: "Pratique planifiée",
  pratique_attente_resultat: "Pratique passée — en attente du résultat",
  pratique_a_reprogrammer: "Pratique ajournée — à réinscrire",
  admis: "Admis",
};

const STAGE_KIND: Record<ParcoursStage, StageKind> = {
  inscrit: "spine",
  theorie_planifiee: "spine",
  theorie_attente_resultat: "waiting",
  theorie_a_reprogrammer: "failed",
  attente_convocation_cma: "waiting",
  convocation_recue: "spine",
  conduite_programmee: "spine",
  pratique_planifiee: "spine",
  pratique_attente_resultat: "waiting",
  pratique_a_reprogrammer: "failed",
  admis: "done",
};

// Résultats qui valent un échec (à réinscrire). "absent" est traité comme un
// échec : le candidat ne s'est pas présenté et doit se réinscrire.
const RESULTATS_ECHEC = new Set([
  "ajourne",
  "absent",
  "refuse",
  "defavorable",
]);
const RESULTAT_ADMIS = new Set(["admis", "favorable"]);

// ─── Faits en entrée ───

export interface ExamenTheorieFacts {
  date_examen: string | null;
  resultat: string | null;
  date_resultat_recu: string | null;
  date_reussite: string | null;
  date_convocation_pratique_recue: string | null;
  numero_convocation: string | null;
}

export interface ExamenPratiqueFacts {
  date_examen: string | null;
  resultat: string | null;
  date_resultat_recu: string | null;
}

export interface ParcoursFacts {
  /** Dernier examen théorique du candidat (null si aucun). */
  theorie: ExamenTheorieFacts | null;
  /** Dernier examen pratique du candidat (null si aucun). */
  pratique: ExamenPratiqueFacts | null;
  /** Vrai si des séances de conduite sont programmées (seances_conduite). */
  conduiteProgrammee?: boolean;
  emailInterne?: string | null;
  emailInterneConsulteLe?: string | null;
}

// ─── Résultat ───

export interface AttenteInfo {
  type: AttenteType;
  /** Date à laquelle le compteur d'attente a démarré (ISO). */
  referenceDate: string;
  /** Jours calendaires écoulés depuis referenceDate. */
  joursEcoules: number;
  niveau: UrgenceNiveau;
  seuilRappel: number;
  seuilAlerte: number;
}

export interface BoiteMailInfo {
  email: string;
  consulteLe: string | null;
  /** Jours depuis la dernière consultation, null si jamais consultée. */
  joursDepuisConsultation: number | null;
  aConsulter: boolean;
}

export interface ParcoursResult {
  stage: ParcoursStage;
  label: string;
  kind: StageKind;
  /** Présent uniquement pour les étapes d'attente (waiting). */
  attente?: AttenteInfo;
  /** Présent si une boîte mail interne est renseignée. */
  boiteMail?: BoiteMailInfo;
}

// ─── Utilitaires de date (comparaison en jours calendaires, UTC) ───

/** Convertit une date ISO/`YYYY-MM-DD` en jours epoch UTC (minuit). */
function toEpochDay(iso: string): number {
  const d = new Date(iso);
  return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86_400_000);
}

/** Nombre de jours calendaires de `fromIso` (inclus) à `today` (exclu borne). */
function joursEcoules(fromIso: string, today: Date): number {
  const todayDay = Math.floor(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) / 86_400_000,
  );
  return todayDay - toEpochDay(fromIso);
}

/** `true` si `iso` est aujourd'hui ou dans le passé. */
function estPasse(iso: string, today: Date): boolean {
  return joursEcoules(iso, today) >= 0;
}

function niveauResultat(jours: number): UrgenceNiveau {
  if (jours >= SEUILS_PARCOURS.resultat.alerte) return "alerte";
  if (jours >= SEUILS_PARCOURS.resultat.rappel) return "rappel";
  return "ok";
}

function niveauConvocation(jours: number): UrgenceNiveau {
  if (jours >= SEUILS_PARCOURS.convocation.alerte) return "alerte";
  if (jours >= SEUILS_PARCOURS.convocation.rappel) return "rappel";
  return "ok";
}

// ─── Prédicats sur les faits ───

function estAdmis(resultat: string | null): boolean {
  return resultat != null && RESULTAT_ADMIS.has(resultat);
}
function estEchec(resultat: string | null): boolean {
  return resultat != null && RESULTATS_ECHEC.has(resultat);
}
// Un résultat « pas encore connu » peut être NULL ou une valeur d'attente
// explicite ("en_attente", posée par la fiche apprenant à la création).
// Toute valeur inconnue est traitée comme une attente plutôt que d'inventer
// un état : le candidat apparaît alors dans « Résultats à vérifier », ce qui
// pousse à corriger la donnée au lieu de la faire disparaître.
function sansResultat(resultat: string | null): boolean {
  return !estAdmis(resultat) && !estEchec(resultat);
}

function convocationRecue(t: ExamenTheorieFacts): boolean {
  return Boolean(t.date_convocation_pratique_recue || t.numero_convocation);
}

// ─── Cœur : dérivation de l'étape ───

function computeStage(facts: ParcoursFacts, today: Date): {
  stage: ParcoursStage;
  attente?: AttenteInfo;
} {
  const { theorie, pratique } = facts;

  // 1. Admission finale — état terminal.
  if (pratique && estAdmis(pratique.resultat)) {
    return { stage: "admis" };
  }

  // 2. Côté pratique : dès qu'un examen pratique existe, le candidat a
  //    dépassé la convocation/les heures de conduite.
  if (pratique && pratique.date_examen) {
    if (estEchec(pratique.resultat)) {
      return { stage: "pratique_a_reprogrammer" };
    }
    if (sansResultat(pratique.resultat) && estPasse(pratique.date_examen, today)) {
      return {
        stage: "pratique_attente_resultat",
        attente: buildAttente("resultat_pratique", pratique.date_examen, today),
      };
    }
    // Examen à venir, pas encore de résultat.
    if (sansResultat(pratique.resultat)) {
      return { stage: "pratique_planifiee" };
    }
  }

  // 3. Côté théorie.
  if (theorie && theorie.date_examen) {
    if (estAdmis(theorie.resultat)) {
      // Réussie : reçoit-on déjà la convocation CMA ?
      if (convocationRecue(theorie)) {
        return {
          stage: facts.conduiteProgrammee ? "conduite_programmee" : "convocation_recue",
        };
      }
      // Le compteur d'attente de convocation démarre au jour où le résultat
      // a été connu (date_resultat_recu), pas au jour de l'examen : la CMA
      // n'envoie la convocation qu'après la publication des résultats.
      const ref =
        theorie.date_resultat_recu || theorie.date_reussite || theorie.date_examen;
      return {
        stage: "attente_convocation_cma",
        attente: buildAttente("convocation_cma", ref, today),
      };
    }
    if (estEchec(theorie.resultat)) {
      return { stage: "theorie_a_reprogrammer" };
    }
    if (sansResultat(theorie.resultat) && estPasse(theorie.date_examen, today)) {
      return {
        stage: "theorie_attente_resultat",
        attente: buildAttente("resultat_theorie", theorie.date_examen, today),
      };
    }
    if (sansResultat(theorie.resultat)) {
      return { stage: "theorie_planifiee" };
    }
  }

  // 4. Aucun examen exploitable : simple inscription.
  return { stage: "inscrit" };
}

function buildAttente(type: AttenteType, referenceDate: string, today: Date): AttenteInfo {
  const jours = joursEcoules(referenceDate, today);
  const convoc = type === "convocation_cma";
  const seuilRappel = convoc ? SEUILS_PARCOURS.convocation.rappel : SEUILS_PARCOURS.resultat.rappel;
  const seuilAlerte = convoc ? SEUILS_PARCOURS.convocation.alerte : SEUILS_PARCOURS.resultat.alerte;
  return {
    type,
    referenceDate,
    joursEcoules: jours,
    niveau: convoc ? niveauConvocation(jours) : niveauResultat(jours),
    seuilRappel,
    seuilAlerte,
  };
}

function computeBoiteMail(facts: ParcoursFacts, today: Date): BoiteMailInfo | undefined {
  const email = facts.emailInterne?.trim();
  if (!email) return undefined;
  const consulteLe = facts.emailInterneConsulteLe ?? null;
  const jours = consulteLe ? joursEcoules(consulteLe, today) : null;
  const aConsulter = jours == null || jours >= SEUILS_PARCOURS.boiteMail.rappel;
  return { email, consulteLe, joursDepuisConsultation: jours, aConsulter };
}

/**
 * Calcule l'étape du parcours d'examen d'un candidat à partir des faits.
 * `now` est injectable pour rendre le calcul testable et déterministe.
 */
export function computeParcours(facts: ParcoursFacts, now: Date = new Date()): ParcoursResult {
  const { stage, attente } = computeStage(facts, now);
  const boiteMail = computeBoiteMail(facts, now);
  return {
    stage,
    label: STAGE_LABELS[stage],
    kind: STAGE_KIND[stage],
    ...(attente ? { attente } : {}),
    ...(boiteMail ? { boiteMail } : {}),
  };
}

// ─── Classification des lignes d'examen par candidat ───

export interface ExamenT3pRow extends ExamenTheorieFacts {
  contact_id: string;
  /** La fiche apprenant enregistre le type d'examen (theorique/pratique)
   *  dans ce champ : les lignes « pratique » sont des épreuves pratiques. */
  type_formation: string | null;
}
export interface ExamenPratiqueRow extends ExamenPratiqueFacts {
  contact_id: string;
}

/**
 * Classe les lignes brutes des deux tables d'examens en faits par candidat :
 * dernière théorie et dernière pratique (les lignes examens_t3p de type
 * « pratique » sont fusionnées avec la table examens_pratique). Logique
 * partagée entre le hub « Aujourd'hui » et la fiche session.
 */
export function classerExamensParContact(
  t3pRows: ExamenT3pRow[],
  pratiqueRows: ExamenPratiqueRow[],
): Map<string, { theorie: ExamenTheorieFacts | null; pratique: ExamenPratiqueFacts | null }> {
  const isPratique = (r: ExamenT3pRow) =>
    String(r.type_formation || "").toLowerCase() === "pratique";

  const latest = new Map<string, { theorie: (ExamenTheorieFacts & { date_examen: string | null }) | null; pratique: ExamenPratiqueFacts | null }>();
  const entry = (id: string) => {
    let e = latest.get(id);
    if (!e) { e = { theorie: null, pratique: null }; latest.set(id, e); }
    return e;
  };

  for (const r of t3pRows) {
    const e = entry(r.contact_id);
    if (isPratique(r)) {
      if (!e.pratique || (r.date_examen || "") > (e.pratique.date_examen || "")) {
        e.pratique = { date_examen: r.date_examen, resultat: r.resultat, date_resultat_recu: r.date_resultat_recu };
      }
    } else if (!e.theorie || (r.date_examen || "") > (e.theorie.date_examen || "")) {
      e.theorie = r;
    }
  }
  for (const r of pratiqueRows) {
    const e = entry(r.contact_id);
    if (!e.pratique || (r.date_examen || "") > (e.pratique.date_examen || "")) {
      e.pratique = { date_examen: r.date_examen, resultat: r.resultat, date_resultat_recu: r.date_resultat_recu };
    }
  }
  return latest;
}
