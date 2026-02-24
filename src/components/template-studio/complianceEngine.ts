// ═══════════════════════════════════════════════════════════════
// Compliance Engine — Qualiopi / DREETS / Code du travail checks
// ═══════════════════════════════════════════════════════════════

export interface ComplianceCheck {
  id: string;
  label: string;
  reference: string;
  status: "ok" | "missing" | "warning";
  details: string;
  category: "qualiopi" | "dreets" | "code_travail" | "t3p";
}

export interface ComplianceReport {
  template_type: string;
  checks: ComplianceCheck[];
  score: number; // 0-100
  ready_to_publish: boolean;
  generated_at: string;
}

// ── Required fields by template type ──

const PROGRAMME_REQUIRED_FIELDS = [
  { id: "objectifs", pattern: /objectif|compétence/i, label: "Objectifs opérationnels", reference: "RNQ Critère 1 - Indicateur 1" },
  { id: "prerequis", pattern: /pr[eé]requis|condition.*acc[eè]s/i, label: "Prérequis", reference: "RNQ Critère 1 - Indicateur 2" },
  { id: "public_vise", pattern: /public.*vis[eé]|public.*concern[eé]/i, label: "Public visé", reference: "RNQ Critère 1 - Indicateur 3" },
  { id: "duree", pattern: /dur[eé]e|heures|jours/i, label: "Durée", reference: "Code du travail L6353-1" },
  { id: "modalites_pedagogiques", pattern: /modalit[eé].*p[eé]dagog|m[eé]thod.*p[eé]dagog/i, label: "Modalités pédagogiques", reference: "RNQ Critère 4 - Indicateur 11" },
  { id: "moyens_pedagogiques", pattern: /moyen.*p[eé]dagog|ressource.*p[eé]dagog|support/i, label: "Moyens pédagogiques", reference: "RNQ Critère 4 - Indicateur 12" },
  { id: "evaluation", pattern: /[eé]valuation|contr[oô]le.*connaissance|examen/i, label: "Modalités d'évaluation", reference: "RNQ Critère 5 - Indicateur 17" },
  { id: "accessibilite", pattern: /accessibilit[eé]|handicap|PMR|adapt/i, label: "Accessibilité / adaptation", reference: "RNQ Critère 6 - Indicateur 20" },
  { id: "positionnement", pattern: /positionnement|diagnostic.*entr[eé]e/i, label: "Test de positionnement", reference: "RNQ Critère 2 - Indicateur 8" },
  { id: "tracabilite", pattern: /[eé]margement|pr[eé]sence|suivi/i, label: "Traçabilité (émargement)", reference: "RNQ Critère 5 - Indicateur 19" },
];

const CONTRAT_REQUIRED_FIELDS = [
  { id: "parties", pattern: /entre.*et|partie|contractant|organisme.*stagiaire/i, label: "Identification des parties", reference: "Code du travail L6353-3" },
  { id: "objet", pattern: /objet.*formation|intitul[eé]|nature.*action/i, label: "Nature et objet de la formation", reference: "Code du travail L6353-4" },
  { id: "duree_contrat", pattern: /dur[eé]e|heures/i, label: "Durée de la formation", reference: "Code du travail L6353-4" },
  { id: "programme_ref", pattern: /programme|contenu|module/i, label: "Référence au programme", reference: "Code du travail L6353-4" },
  { id: "effectif", pattern: /effectif|nombre.*stagiaire|groupe/i, label: "Effectif prévu", reference: "Code du travail L6353-4" },
  { id: "prix", pattern: /prix|tarif|montant|co[uû]t|€/i, label: "Prix et modalités de paiement", reference: "Code du travail L6353-5" },
  { id: "retractation", pattern: /r[eé]tractation|d[eé]lai.*10.*jour|annulation/i, label: "Délai de rétractation (10 jours)", reference: "Code du travail L6353-6" },
  { id: "cas_force_majeure", pattern: /force.*majeure|interruption|cas.*arr[eê]t/i, label: "Cas de force majeure / interruption", reference: "Code du travail L6353-7" },
  { id: "rgpd", pattern: /RGPD|donn[eé]es.*personnelles|vie.*priv[eé]e/i, label: "Clause RGPD", reference: "RGPD Art. 13" },
  { id: "signature", pattern: /signature|sign[eé]|dat[eé]/i, label: "Date et signature", reference: "Code du travail L6353-3" },
];

const CONVENTION_REQUIRED_FIELDS = [
  { id: "parties", pattern: /entre.*et|partie|organisme.*entreprise|employeur/i, label: "Identification des parties", reference: "Code du travail L6353-1" },
  { id: "objet", pattern: /objet|intitul[eé]|nature/i, label: "Objet de la convention", reference: "Code du travail L6353-1" },
  { id: "programme_ref", pattern: /programme|contenu/i, label: "Programme de formation", reference: "Code du travail L6353-1" },
  { id: "duree", pattern: /dur[eé]e|heures/i, label: "Durée", reference: "Code du travail L6353-1" },
  { id: "effectif", pattern: /effectif|stagiaire/i, label: "Effectif", reference: "Code du travail L6353-1" },
  { id: "modalites_deroulement", pattern: /d[eé]roulement|modalit[eé]/i, label: "Modalités de déroulement", reference: "Code du travail L6353-1" },
  { id: "prix", pattern: /prix|tarif|montant|€/i, label: "Prix et financement", reference: "Code du travail L6353-1" },
  { id: "organisme_nda", pattern: /NDA|d[eé]claration.*activit[eé]|num[eé]ro/i, label: "N° Déclaration Activité", reference: "DREETS" },
  { id: "signature", pattern: /signature|sign[eé]|dat[eé]/i, label: "Date et signature", reference: "Code du travail L6353-1" },
];

const ATTESTATION_REQUIRED_FIELDS = [
  { id: "identite", pattern: /nom|pr[eé]nom|identit[eé]|stagiaire/i, label: "Identité du stagiaire", reference: "Code du travail L6353-1" },
  { id: "formation", pattern: /formation|intitul[eé]|action/i, label: "Intitulé de la formation", reference: "Code du travail L6353-1" },
  { id: "dates", pattern: /date|du.*au|p[eé]riode/i, label: "Dates de formation", reference: "Code du travail L6353-1" },
  { id: "duree", pattern: /dur[eé]e|heures/i, label: "Durée", reference: "Code du travail L6353-1" },
  { id: "objectifs", pattern: /objectif|comp[eé]tence.*acquise/i, label: "Objectifs atteints", reference: "RNQ Critère 5" },
  { id: "evaluation_result", pattern: /r[eé]sultat|acquis|[eé]valuation/i, label: "Résultats de l'évaluation", reference: "RNQ Critère 5 - Indicateur 17" },
  { id: "organisme", pattern: /organisme|centre|[eé]cole/i, label: "Identification de l'organisme", reference: "DREETS" },
  { id: "signature", pattern: /signature|sign[eé]|cachet/i, label: "Signature et cachet", reference: "Code du travail L6353-1" },
];

const EVALUATION_REQUIRED_FIELDS = [
  { id: "identite", pattern: /nom|pr[eé]nom|stagiaire/i, label: "Identité du stagiaire", reference: "RNQ Critère 5" },
  { id: "formation_ref", pattern: /formation|session|intitul[eé]/i, label: "Référence formation", reference: "RNQ Critère 5" },
  { id: "criteres", pattern: /crit[eè]re|note|barème|[eé]chelle/i, label: "Critères d'évaluation", reference: "RNQ Critère 5 - Indicateur 17" },
  { id: "satisfaction", pattern: /satisfaction|avis|appr[eé]ciation/i, label: "Mesure de satisfaction", reference: "RNQ Critère 7 - Indicateur 30" },
  { id: "amelioration", pattern: /am[eé]lioration|suggestion|recommandation/i, label: "Pistes d'amélioration", reference: "RNQ Critère 7 - Indicateur 32" },
];

function getRequiredFieldsForType(type: string) {
  switch (type) {
    case "programme": return PROGRAMME_REQUIRED_FIELDS;
    case "contrat": return CONTRAT_REQUIRED_FIELDS;
    case "convention": return CONVENTION_REQUIRED_FIELDS;
    case "attestation": return ATTESTATION_REQUIRED_FIELDS;
    case "evaluation": return EVALUATION_REQUIRED_FIELDS;
    case "positionnement": return EVALUATION_REQUIRED_FIELDS; // Similar requirements
    default: return [];
  }
}

export function runComplianceCheck(templateBody: string, templateType: string): ComplianceReport {
  const requiredFields = getRequiredFieldsForType(templateType);
  const checks: ComplianceCheck[] = [];

  for (const field of requiredFields) {
    const found = field.pattern.test(templateBody);
    checks.push({
      id: field.id,
      label: field.label,
      reference: field.reference,
      status: found ? "ok" : "missing",
      details: found
        ? `Mention "${field.label}" détectée dans le template`
        : `Mention obligatoire "${field.label}" absente — Référence : ${field.reference}`,
      category: field.reference.startsWith("RNQ")
        ? "qualiopi"
        : field.reference.startsWith("Code")
        ? "code_travail"
        : field.reference.startsWith("DREETS")
        ? "dreets"
        : "t3p",
    });
  }

  const okCount = checks.filter((c) => c.status === "ok").length;
  const total = checks.length;
  const score = total > 0 ? Math.round((okCount / total) * 100) : 100;

  return {
    template_type: templateType,
    checks,
    score,
    ready_to_publish: checks.every((c) => c.status !== "missing"),
    generated_at: new Date().toISOString(),
  };
}
