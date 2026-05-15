// ═══════════════════════════════════════════════════════════════
// Contrôle de cohérence du Contrat de formation T3P
// Vérifie articles 2 / 4 / 5 / 8 / 9 + bloc Représentant légal
// par rapport au type de formation et à l'âge du bénéficiaire.
// ═══════════════════════════════════════════════════════════════

export type CoherenceStatus = "ok" | "warning" | "error";

export interface CoherenceCheck {
  id: string;
  label: string;
  reference: string;
  status: CoherenceStatus;
  message: string;
}

export interface CoherenceReport {
  checks: CoherenceCheck[];
  score: number;            // 0-100
  blocking: number;         // nb d'erreurs bloquantes
  warnings: number;
  ready: boolean;           // aucune erreur bloquante
  generatedAt: string;
  context: {
    formationType: string | null;
    isFC: boolean;
    age: number | null;
    isMinor: boolean;
    hasRepLegal: boolean;
  };
}

export interface ContratCoherenceInput {
  /** Type de formation technique : taxi, vtc, vmdtr, taxi_fc, vtc_fc, ... */
  formationType?: string | null;
  /** Durée en heures (utile pour détecter une FC quand le type est ambigu) */
  dureeHeures?: number | null;
  /** Date de naissance ISO (YYYY-MM-DD) */
  dateNaissance?: string | null;
  /** Présence d'un programme rattaché à la formation */
  hasProgramme?: boolean;
  /** Présence d'un objectif renseigné sur la session */
  hasObjectifs?: boolean;
  /** Bloc représentant légal renseigné (nom + lien de parenté + signature) */
  hasRepresentantLegal?: boolean;
  /** Documents associés détectés (utilisés indicativement) */
  hasFeuilleEmargement?: boolean;
  hasAttestation?: boolean;
}

// ── Helpers ────────────────────────────────────────────────────

function calcAge(date?: string | null): number | null {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

function detectFC(type?: string | null, duree?: number | null): boolean {
  const t = (type || "").toLowerCase();
  if (/(_fc|-fc|continue|recyclage|renouvel)/.test(t)) return true;
  if (duree && duree <= 16) return true;
  return false;
}

function metierLabel(type?: string | null): "Taxi" | "VTC" | "VMDTR" | "T3P" {
  const t = (type || "").toLowerCase();
  if (/taxi/.test(t)) return "Taxi";
  if (/vtc/.test(t)) return "VTC";
  if (/vmdtr/.test(t)) return "VMDTR";
  return "T3P";
}

// ── Moteur de vérification ─────────────────────────────────────

export function runContratCoherenceCheck(input: ContratCoherenceInput): CoherenceReport {
  const checks: CoherenceCheck[] = [];
  const isFC = detectFC(input.formationType, input.dureeHeures ?? null);
  const age = calcAge(input.dateNaissance ?? null);
  const isMinor = age !== null && age < 18;
  const metier = metierLabel(input.formationType);
  const hasRep = !!input.hasRepresentantLegal;

  // ── Article 2 — Nature, durée, parcours ────────────────────
  if (!input.formationType) {
    checks.push({
      id: "art2_type",
      label: "Article 2 — Type de formation",
      reference: "Code du travail L.6353-4",
      status: "error",
      message: "Type de formation manquant : impossible de qualifier la nature de l'action (Initial / Formation continue).",
    });
  } else if (isFC && input.dureeHeures && input.dureeHeures > 16) {
    checks.push({
      id: "art2_duree_fc",
      label: "Article 2 — Durée incohérente (FC)",
      reference: "Art. R.3120-9 / R.3122-9 Code des transports",
      status: "error",
      message: `La formation est qualifiée "continue" mais la durée (${input.dureeHeures} h) dépasse le format réglementaire (≤ 16 h).`,
    });
  } else if (!isFC && input.dureeHeures && input.dureeHeures < 35) {
    checks.push({
      id: "art2_duree_init",
      label: "Article 2 — Durée faible (Initial)",
      reference: "Décret n°2017-483",
      status: "warning",
      message: `Formation initiale ${metier} avec ${input.dureeHeures} h : vérifier que la durée est cohérente avec la préparation à l'examen.`,
    });
  } else {
    checks.push({
      id: "art2_ok",
      label: "Article 2 — Nature et durée",
      reference: "Code du travail L.6353-4",
      status: "ok",
      message: `Formation ${isFC ? "continue" : "initiale"} ${metier} cohérente${input.dureeHeures ? ` (${input.dureeHeures} h)` : ""}.`,
    });
  }

  // ── Article 4 — Public visé / prérequis (incl. âge) ─────────
  if (age === null) {
    checks.push({
      id: "art4_age",
      label: "Article 4 — Âge du bénéficiaire inconnu",
      reference: "Art. R.3120-8 / R.3122-9",
      status: "warning",
      message: "Date de naissance manquante : impossible de vérifier la condition de majorité et d'ancienneté du permis B (3 ans).",
    });
  } else if (isMinor) {
    checks.push({
      id: "art4_minor",
      label: "Article 4 — Bénéficiaire mineur",
      reference: "Art. R.3120-8 / R.3122-9 Code des transports",
      status: "error",
      message: `Le bénéficiaire est mineur (${age} ans). L'accès à la profession T3P exige la majorité et un permis B depuis ≥ 3 ans : prérequis non remplis.`,
    });
  } else if (!isFC && age < 21) {
    checks.push({
      id: "art4_age_init",
      label: "Article 4 — Ancienneté permis B",
      reference: "Art. R.3120-8",
      status: "warning",
      message: `Bénéficiaire de ${age} ans : vérifier l'ancienneté du permis B (≥ 3 ans, ou 2 ans en conduite accompagnée).`,
    });
  } else {
    checks.push({
      id: "art4_ok",
      label: "Article 4 — Public visé / prérequis",
      reference: "Art. R.3120-8 / R.3122-9",
      status: "ok",
      message: `Conditions d'âge satisfaites (${age} ans) pour une formation ${isFC ? "continue" : "initiale"} ${metier}.`,
    });
  }

  // ── Article 5 — Programme ──────────────────────────────────
  if (input.hasProgramme === false) {
    checks.push({
      id: "art5_programme",
      label: "Article 5 — Programme manquant",
      reference: "Code du travail L.6353-4",
      status: "error",
      message: "Aucun programme de formation rattaché : l'annexe 1 du contrat ne peut être fournie.",
    });
  } else if (input.hasObjectifs === false) {
    checks.push({
      id: "art5_objectifs",
      label: "Article 5 — Objectifs pédagogiques",
      reference: "RNQ Critère 1 — Indicateur 1",
      status: "warning",
      message: "Objectifs pédagogiques non renseignés sur la session : le programme annexé risque d'être incomplet.",
    });
  } else {
    checks.push({
      id: "art5_ok",
      label: "Article 5 — Programme",
      reference: "Code du travail L.6353-4",
      status: "ok",
      message: "Programme et objectifs pédagogiques disponibles.",
    });
  }

  // ── Article 8 — Évaluation / contrôle des connaissances ────
  if (isFC) {
    checks.push({
      id: "art8_fc",
      label: "Article 8 — Évaluation (Formation continue)",
      reference: "Art. R.3120-9 / R.3122-9",
      status: "ok",
      message: "Formation continue : évaluations formatives + émargement obligatoire (pas d'examen externe).",
    });
  } else {
    checks.push({
      id: "art8_init",
      label: "Article 8 — Évaluation (Initial)",
      reference: "Décret n°2017-483",
      status: "ok",
      message: `Formation initiale ${metier} : évaluations formatives internes + examen externe (CMA / préfecture).`,
    });
  }

  // ── Article 9 — Sanction de la formation ───────────────────
  if (isFC) {
    checks.push({
      id: "art9_fc",
      label: "Article 9 — Sanction (FC)",
      reference: "Art. R.3120-9 / R.3122-9",
      status: "ok",
      message: "Attestation de suivi de formation continue T3P à délivrer pour le renouvellement de la carte professionnelle.",
    });
  } else {
    checks.push({
      id: "art9_init",
      label: "Article 9 — Sanction (Initial) — obligation de moyens",
      reference: "Code du travail L.6353-1",
      status: "ok",
      message: `Attestation de fin de formation initiale ${metier} ; la réussite à l'examen externe relève d'une obligation de moyens.`,
    });
  }

  // ── Bloc Représentant légal ────────────────────────────────
  if (isMinor && !hasRep) {
    checks.push({
      id: "rep_legal_missing",
      label: "Représentant légal manquant",
      reference: "Code civil Art. 1146 — capacité de contracter",
      status: "error",
      message: "Le bénéficiaire est mineur : un bloc Représentant légal (nom, lien de parenté, signature) doit obligatoirement figurer au contrat.",
    });
  } else if (!isMinor && hasRep) {
    checks.push({
      id: "rep_legal_useless",
      label: "Représentant légal superflu",
      reference: "Code civil Art. 414",
      status: "warning",
      message: `Le bénéficiaire est majeur (${age ?? "?"} ans) : le bloc Représentant légal n'est pas requis et peut être retiré.`,
    });
  } else if (isMinor && hasRep) {
    checks.push({
      id: "rep_legal_ok",
      label: "Représentant légal renseigné",
      reference: "Code civil Art. 1146",
      status: "ok",
      message: "Bloc Représentant légal présent et conforme à la situation du bénéficiaire mineur.",
    });
  } else {
    checks.push({
      id: "rep_legal_na",
      label: "Représentant légal — non requis",
      reference: "Code civil Art. 414",
      status: "ok",
      message: "Bénéficiaire majeur : bloc représentant légal non requis.",
    });
  }

  const blocking = checks.filter(c => c.status === "error").length;
  const warnings = checks.filter(c => c.status === "warning").length;
  const ok = checks.filter(c => c.status === "ok").length;
  const score = checks.length === 0 ? 100 : Math.round((ok / checks.length) * 100);

  return {
    checks,
    score,
    blocking,
    warnings,
    ready: blocking === 0,
    generatedAt: new Date().toISOString(),
    context: {
      formationType: input.formationType ?? null,
      isFC,
      age,
      isMinor,
      hasRepLegal: hasRep,
    },
  };
}
