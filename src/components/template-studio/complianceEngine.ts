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
  blocking_issues: string[];
  generated_at: string;
}

// ── Required fields by template type ──

const PROGRAMME_REQUIRED_FIELDS = [
  { id: "objectifs", pattern: /objectif|compétence/i, label: "Objectifs opérationnels", reference: "RNQ Critère 1 - Indicateur 1", critical: true },
  { id: "prerequis", pattern: /pr[eé]requis|condition.*acc[eè]s/i, label: "Prérequis", reference: "RNQ Critère 1 - Indicateur 2", critical: true },
  { id: "public_vise", pattern: /public.*vis[eé]|public.*concern[eé]|public.*cible/i, label: "Public visé", reference: "RNQ Critère 1 - Indicateur 3", critical: true },
  { id: "duree", pattern: /dur[eé]e|heures|jours/i, label: "Durée", reference: "Code du travail L6353-1", critical: true },
  { id: "modalites_pedagogiques", pattern: /modalit[eé].*p[eé]dagog|m[eé]thod.*p[eé]dagog/i, label: "Modalités pédagogiques", reference: "RNQ Critère 4 - Indicateur 11", critical: true },
  { id: "moyens_pedagogiques", pattern: /moyen.*p[eé]dagog|ressource.*p[eé]dagog|support|moyen.*technique/i, label: "Moyens pédagogiques", reference: "RNQ Critère 4 - Indicateur 12", critical: false },
  { id: "evaluation", pattern: /[eé]valuation|contr[oô]le.*connaissance|examen|modalit[eé].*[eé]valuation/i, label: "Modalités d'évaluation", reference: "RNQ Critère 5 - Indicateur 17", critical: true },
  { id: "accessibilite", pattern: /accessibilit[eé]|handicap|PMR|adapt/i, label: "Accessibilité / adaptation", reference: "RNQ Critère 6 - Indicateur 20", critical: true },
  { id: "positionnement", pattern: /positionnement|diagnostic.*entr[eé]e/i, label: "Test de positionnement", reference: "RNQ Critère 2 - Indicateur 8", critical: false },
  { id: "tracabilite", pattern: /[eé]margement|pr[eé]sence|suivi|modalit[eé].*suivi/i, label: "Traçabilité (émargement)", reference: "RNQ Critère 5 - Indicateur 19", critical: false },
  { id: "attestation", pattern: /attestation|certificat|d[eé]livr[eé]/i, label: "Attestation délivrée", reference: "Code du travail L6353-1", critical: false },
];

const CONTRAT_REQUIRED_FIELDS = [
  { id: "parties", pattern: /entre.*et|partie|contractant|organisme.*stagiaire|identit[eé]/i, label: "Identification des parties", reference: "Code du travail L6353-3", critical: true },
  { id: "objet", pattern: /objet.*formation|intitul[eé]|nature.*action/i, label: "Nature et objet de la formation", reference: "Code du travail L6353-4", critical: true },
  { id: "duree_contrat", pattern: /dur[eé]e|heures/i, label: "Durée de la formation", reference: "Code du travail L6353-4", critical: true },
  { id: "programme_ref", pattern: /programme|contenu|module/i, label: "Référence au programme", reference: "Code du travail L6353-4", critical: false },
  { id: "effectif", pattern: /effectif|nombre.*stagiaire|groupe/i, label: "Effectif prévu", reference: "Code du travail L6353-4", critical: false },
  { id: "prix", pattern: /prix|tarif|montant|co[uû]t|€|modalit[eé].*paiement/i, label: "Prix et modalités de paiement", reference: "Code du travail L6353-5", critical: true },
  { id: "retractation", pattern: /r[eé]tractation|d[eé]lai.*10.*jour|annulation/i, label: "Délai de rétractation (10 jours)", reference: "Code du travail L6353-6", critical: true },
  { id: "cas_force_majeure", pattern: /force.*majeure|interruption|cas.*arr[eê]t|r[eé]siliation|condition.*r[eé]siliation/i, label: "Conditions de résiliation", reference: "Code du travail L6353-7", critical: true },
  { id: "rgpd", pattern: /RGPD|donn[eé]es.*personnelles|vie.*priv[eé]e/i, label: "Clause RGPD", reference: "RGPD Art. 13", critical: false },
  { id: "signature", pattern: /signature|sign[eé]|dat[eé].*signature/i, label: "Date et signature", reference: "Code du travail L6353-3", critical: true },
];

const CONVENTION_REQUIRED_FIELDS = [
  { id: "parties", pattern: /entre.*et|partie|organisme.*entreprise|employeur|identification.*entreprise/i, label: "Identification des parties", reference: "Code du travail L6353-1", critical: true },
  { id: "objet", pattern: /objet|intitul[eé]|nature|objectif/i, label: "Objectifs de la formation", reference: "Code du travail L6353-1", critical: true },
  { id: "programme_ref", pattern: /programme|contenu/i, label: "Programme de formation", reference: "Code du travail L6353-1", critical: false },
  { id: "duree", pattern: /dur[eé]e|heures/i, label: "Durée", reference: "Code du travail L6353-1", critical: true },
  { id: "effectif", pattern: /effectif|stagiaire/i, label: "Effectif", reference: "Code du travail L6353-1", critical: false },
  { id: "modalites_deroulement", pattern: /d[eé]roulement|modalit[eé]/i, label: "Modalités de déroulement", reference: "Code du travail L6353-1", critical: false },
  { id: "prix", pattern: /prix|tarif|montant|€|r[eè]glement/i, label: "Prix et modalités de règlement", reference: "Code du travail L6353-1", critical: true },
  { id: "organisme_nda", pattern: /NDA|d[eé]claration.*activit[eé]|num[eé]ro/i, label: "N° Déclaration Activité", reference: "DREETS", critical: false },
  { id: "signature", pattern: /signature|sign[eé]|dat[eé]/i, label: "Date et signature", reference: "Code du travail L6353-1", critical: true },
];

const ATTESTATION_REQUIRED_FIELDS = [
  { id: "identite", pattern: /nom|pr[eé]nom|identit[eé]|stagiaire/i, label: "Identité du stagiaire", reference: "Code du travail L6353-1", critical: true },
  { id: "formation", pattern: /formation|intitul[eé]|action/i, label: "Intitulé de la formation", reference: "Code du travail L6353-1", critical: true },
  { id: "dates", pattern: /date|du.*au|p[eé]riode/i, label: "Dates de formation", reference: "Code du travail L6353-1", critical: true },
  { id: "duree", pattern: /dur[eé]e|heures/i, label: "Durée", reference: "Code du travail L6353-1", critical: true },
  { id: "objectifs", pattern: /objectif|comp[eé]tence.*acquise/i, label: "Objectifs atteints", reference: "RNQ Critère 5", critical: false },
  { id: "evaluation_result", pattern: /r[eé]sultat|acquis|[eé]valuation/i, label: "Résultats de l'évaluation", reference: "RNQ Critère 5 - Indicateur 17", critical: false },
  { id: "organisme", pattern: /organisme|centre|[eé]cole/i, label: "Identification de l'organisme", reference: "DREETS", critical: true },
  { id: "signature", pattern: /signature|sign[eé]|cachet/i, label: "Signature et cachet", reference: "Code du travail L6353-1", critical: true },
];

const EVALUATION_REQUIRED_FIELDS = [
  { id: "identite", pattern: /nom|pr[eé]nom|stagiaire/i, label: "Identité du stagiaire", reference: "RNQ Critère 5", critical: true },
  { id: "formation_ref", pattern: /formation|session|intitul[eé]/i, label: "Référence formation", reference: "RNQ Critère 5", critical: true },
  { id: "criteres", pattern: /crit[eè]re|note|barème|[eé]chelle/i, label: "Critères d'évaluation", reference: "RNQ Critère 5 - Indicateur 17", critical: true },
  { id: "satisfaction", pattern: /satisfaction|avis|appr[eé]ciation/i, label: "Mesure de satisfaction", reference: "RNQ Critère 7 - Indicateur 30", critical: false },
  { id: "amelioration", pattern: /am[eé]lioration|suggestion|recommandation/i, label: "Pistes d'amélioration", reference: "RNQ Critère 7 - Indicateur 32", critical: false },
];

const BULLETIN_REQUIRED_FIELDS = [
  { id: "identite", pattern: /nom|pr[eé]nom|identit[eé]/i, label: "Identité du stagiaire", reference: "Code du travail L6353-1", critical: true },
  { id: "formation", pattern: /formation|intitul[eé]/i, label: "Formation concernée", reference: "Code du travail L6353-1", critical: true },
  { id: "dates", pattern: /date|du.*au|p[eé]riode/i, label: "Dates de formation", reference: "Code du travail L6353-1", critical: true },
  { id: "signature", pattern: /signature|sign[eé]/i, label: "Signature", reference: "Code du travail L6353-1", critical: true },
];

const POSITIONNEMENT_REQUIRED_FIELDS = [
  { id: "identite", pattern: /nom|pr[eé]nom|stagiaire/i, label: "Identité du stagiaire", reference: "RNQ Critère 2 - Indicateur 8", critical: true },
  { id: "formation_ref", pattern: /formation|intitul[eé]/i, label: "Référence formation", reference: "RNQ Critère 2", critical: true },
  { id: "questions", pattern: /question|[eé]valuation|test|diagnostic/i, label: "Questions / Diagnostic", reference: "RNQ Critère 2 - Indicateur 8", critical: true },
  { id: "score", pattern: /score|r[eé]sultat|niveau|barème/i, label: "Score / Résultat", reference: "RNQ Critère 2 - Indicateur 8", critical: true },
];

const EMARGEMENT_REQUIRED_FIELDS = [
  { id: "formation", pattern: /formation|intitul[eé]|session/i, label: "Intitulé de la formation", reference: "RNQ Critère 5 - Indicateur 19", critical: true },
  { id: "dates", pattern: /date|jour/i, label: "Date", reference: "RNQ Critère 5 - Indicateur 19", critical: true },
  { id: "horaires", pattern: /heure|horaire|matin|apr[eè]s-midi|cr[eé]neau/i, label: "Horaires", reference: "RNQ Critère 5 - Indicateur 19", critical: true },
  { id: "signature", pattern: /signature|[eé]margement|pr[eé]sence/i, label: "Signature / Émargement", reference: "RNQ Critère 5 - Indicateur 19", critical: true },
  { id: "formateur", pattern: /formateur|intervenant/i, label: "Formateur", reference: "RNQ Critère 5 - Indicateur 19", critical: false },
];

function getRequiredFieldsForType(type: string) {
  switch (type) {
    case "programme": return PROGRAMME_REQUIRED_FIELDS;
    case "contrat": return CONTRAT_REQUIRED_FIELDS;
    case "convention": return CONVENTION_REQUIRED_FIELDS;
    case "attestation": return ATTESTATION_REQUIRED_FIELDS;
    case "evaluation":
    case "evaluation_chaud":
    case "evaluation_froid": return EVALUATION_REQUIRED_FIELDS;
    case "positionnement":
    case "test_positionnement": return POSITIONNEMENT_REQUIRED_FIELDS;
    case "bulletin_inscription": return BULLETIN_REQUIRED_FIELDS;
    case "emargement":
    case "feuille_emargement": return EMARGEMENT_REQUIRED_FIELDS;
    default: return [];
  }
}

/** Types that require compliance check before publication */
export const COMPLIANCE_GATED_TYPES = [
  "programme", "contrat", "convention", "attestation",
  "bulletin_inscription", "positionnement", "test_positionnement",
  "evaluation", "evaluation_chaud", "evaluation_froid",
  "emargement", "feuille_emargement",
];

export function runComplianceCheck(templateBody: string, templateType: string): ComplianceReport {
  const requiredFields = getRequiredFieldsForType(templateType);
  const checks: ComplianceCheck[] = [];
  const blocking_issues: string[] = [];

  for (const field of requiredFields) {
    const found = field.pattern.test(templateBody);
    checks.push({
      id: field.id,
      label: field.label,
      reference: field.reference,
      status: found ? "ok" : (field.critical ? "missing" : "warning"),
      details: found
        ? `Mention "${field.label}" détectée dans le template`
        : `Mention ${field.critical ? "obligatoire" : "recommandée"} "${field.label}" absente — Référence : ${field.reference}`,
      category: field.reference.startsWith("RNQ")
        ? "qualiopi"
        : field.reference.startsWith("Code")
        ? "code_travail"
        : field.reference.startsWith("DREETS")
        ? "dreets"
        : "t3p",
    });

    if (!found && field.critical) {
      blocking_issues.push(`${field.label} (${field.reference})`);
    }
  }

  const okCount = checks.filter((c) => c.status === "ok").length;
  const total = checks.length;
  const score = total > 0 ? Math.round((okCount / total) * 100) : 100;

  return {
    template_type: templateType,
    checks,
    score,
    ready_to_publish: blocking_issues.length === 0,
    blocking_issues,
    generated_at: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════
// Template Generators — Pre-fill structured content
// ═══════════════════════════════════════════════════════════════

export function generateProgrammeT3P(): string {
  return `<h1>Programme de Formation T3P</h1>

<h2>1. Objectifs opérationnels</h2>
<p>À l'issue de cette formation, le stagiaire sera capable de :</p>
<ul>
  <li>{{objectif_1}}</li>
  <li>{{objectif_2}}</li>
  <li>{{objectif_3}}</li>
</ul>

<h2>2. Compétences visées</h2>
<ul>
  <li>{{competence_1}}</li>
  <li>{{competence_2}}</li>
</ul>

<h2>3. Public cible</h2>
<p>Public visé : {{public_vise}}</p>

<h2>4. Prérequis</h2>
<p>Conditions d'accès et prérequis : {{prerequis}}</p>

<h2>5. Durée</h2>
<p>Durée totale : {{duree_heures}} heures réparties sur {{duree_jours}} jours</p>

<h2>6. Modalités pédagogiques</h2>
<p>Méthodes pédagogiques utilisées :</p>
<ul>
  <li>Cours théoriques en salle</li>
  <li>Exercices pratiques</li>
  <li>Mises en situation professionnelle</li>
  <li>Supports numériques</li>
</ul>

<h2>7. Modalités d'évaluation</h2>
<p>L'évaluation des acquis est réalisée par :</p>
<ul>
  <li>Test de positionnement en début de formation</li>
  <li>Évaluations formatives continues</li>
  <li>Évaluation sommative en fin de formation</li>
</ul>

<h2>8. Moyens techniques</h2>
<ul>
  <li>Salle de formation équipée (vidéoprojecteur, tableau)</li>
  <li>Supports de cours remis aux stagiaires</li>
  <li>{{moyens_specifiques}}</li>
</ul>

<h2>9. Accessibilité</h2>
<p>Formation accessible aux personnes en situation de handicap. Adaptation possible sur demande. Référent handicap : {{referent_handicap}}</p>

<h2>10. Attestation délivrée</h2>
<p>Attestation de fin de formation mentionnant les objectifs, la nature, la durée et les résultats de l'évaluation des acquis.</p>

<h2>11. Modalités de suivi</h2>
<p>Feuilles d'émargement signées par demi-journée. Suivi pédagogique individualisé.</p>

<hr/>
<p><em>Organisme : {{centre_nom}} — SIRET : {{centre_siret}} — NDA : {{centre_nda}}</em></p>
<p><em>Date de mise à jour : {{date_jour}}</em></p>`;
}

export function generateContratFormation(): string {
  return `<h1>Contrat de Formation Professionnelle</h1>
<p><em>Conformément aux articles L.6353-3 à L.6353-7 du Code du travail</em></p>

<h2>Entre les parties</h2>
<p><strong>L'organisme de formation :</strong></p>
<p>{{centre_nom}}<br/>
SIRET : {{centre_siret}}<br/>
N° Déclaration d'Activité : {{centre_nda}}<br/>
Adresse : {{centre_adresse}}<br/>
Représenté par : {{responsable_nom}}</p>

<p><strong>Et le stagiaire (personne physique) :</strong></p>
<p>{{nom}} {{prenom}}<br/>
Né(e) le : {{date_naissance}}<br/>
Adresse : {{adresse_stagiaire}}<br/>
Email : {{email}}<br/>
Téléphone : {{telephone}}</p>

<h2>Article 1 — Objet de la formation</h2>
<p>Nature de l'action : {{intitule_formation}}</p>
<p>Objectifs : {{objectifs_formation}}</p>

<h2>Article 2 — Durée</h2>
<p>Durée totale : {{duree_heures}} heures<br/>
Du {{session_date_debut}} au {{session_date_fin}}</p>

<h2>Article 3 — Prix et modalités de paiement</h2>
<p>Prix total : {{prix_total}} € TTC<br/>
Modalités de paiement : {{modalites_paiement}}<br/>
<em>TVA non applicable — art. 293 B du CGI</em></p>

<h2>Article 4 — Délai de rétractation</h2>
<p>Conformément à l'article L.6353-6 du Code du travail, le stagiaire dispose d'un délai de <strong>10 jours</strong> à compter de la signature du présent contrat pour se rétracter par lettre recommandée avec accusé de réception.</p>

<h2>Article 5 — Conditions de résiliation</h2>
<p>En cas de cessation anticipée de la formation du fait de l'organisme ou pour un cas de force majeure, seules les prestations effectivement dispensées sont facturées au prorata temporis.</p>

<h2>Article 6 — Protection des données (RGPD)</h2>
<p>Les données personnelles collectées sont nécessaires à l'exécution du contrat. Elles sont conservées pendant la durée légale. Le stagiaire dispose d'un droit d'accès, rectification et suppression (Art. 15 à 17 du RGPD).</p>

<h2>Date et signature</h2>
<p>Fait à {{lieu}}, le {{date_jour}}</p>
<table>
<tr>
<td style="width:50%"><p>L'organisme de formation<br/><br/><br/>Signature et cachet</p></td>
<td style="width:50%"><p>Le stagiaire<br/><br/><br/>Signature précédée de "Lu et approuvé"</p></td>
</tr>
</table>`;
}

export function generateConventionFormation(): string {
  return `<h1>Convention de Formation Professionnelle</h1>
<p><em>Conformément à l'article L.6353-1 du Code du travail</em></p>

<h2>Entre les parties</h2>
<p><strong>L'organisme de formation :</strong></p>
<p>{{centre_nom}}<br/>
SIRET : {{centre_siret}}<br/>
N° Déclaration d'Activité : {{centre_nda}}<br/>
Adresse : {{centre_adresse}}<br/>
Représenté par : {{responsable_nom}}</p>

<p><strong>Et l'entreprise (identification entreprise) :</strong></p>
<p>{{entreprise_nom}}<br/>
SIRET : {{entreprise_siret}}<br/>
Adresse : {{entreprise_adresse}}<br/>
Représentée par : {{entreprise_representant}}<br/>
En qualité de : {{entreprise_fonction}}</p>

<h2>Article 1 — Objectifs de la formation</h2>
<p>Intitulé : {{intitule_formation}}<br/>
Objectifs : {{objectifs_formation}}</p>

<h2>Article 2 — Programme</h2>
<p>Le programme détaillé est annexé à la présente convention.</p>

<h2>Article 3 — Durée</h2>
<p>Durée totale : {{duree_heures}} heures<br/>
Du {{session_date_debut}} au {{session_date_fin}}</p>

<h2>Article 4 — Effectif</h2>
<p>Nombre de stagiaires : {{effectif}}</p>

<h2>Article 5 — Modalités de déroulement</h2>
<p>Lieu : {{lieu_formation}}<br/>
Horaires : {{horaires}}</p>

<h2>Article 6 — Prix et modalités de règlement</h2>
<p>Prix total : {{prix_total}} € HT<br/>
Modalités de règlement : {{modalites_reglement}}<br/>
<em>TVA non applicable — art. 293 B du CGI</em></p>

<h2>Date et signature</h2>
<p>Fait en deux exemplaires à {{lieu}}, le {{date_jour}}</p>
<table>
<tr>
<td style="width:50%"><p>L'organisme de formation<br/><br/><br/>Signature et cachet</p></td>
<td style="width:50%"><p>L'entreprise<br/><br/><br/>Signature et cachet</p></td>
</tr>
</table>`;
}

export function generateBulletinInscription(): string {
  return `<h1>Bulletin d'Inscription</h1>

<h2>Identité du stagiaire</h2>
<p>Nom : {{nom}}<br/>
Prénom : {{prenom}}<br/>
Date de naissance : {{date_naissance}}<br/>
Adresse : {{adresse}}<br/>
Email : {{email}}<br/>
Téléphone : {{telephone}}</p>

<h2>Formation choisie</h2>
<p>Intitulé : {{intitule_formation}}<br/>
Dates : du {{session_date_debut}} au {{session_date_fin}}<br/>
Durée : {{duree_heures}} heures<br/>
Lieu : {{lieu_formation}}</p>

<h2>Engagement</h2>
<p>Je soussigné(e) {{nom}} {{prenom}} déclare m'inscrire à la formation ci-dessus et certifie l'exactitude des renseignements fournis.</p>

<h2>Signature</h2>
<p>Fait à {{lieu}}, le {{date_jour}}</p>
<p>Signature du stagiaire :</p>`;
}

export function generateTestPositionnement(): string {
  return `<h1>Test de Positionnement</h1>
<p><em>Diagnostic d'entrée en formation — RNQ Critère 2, Indicateur 8</em></p>

<h2>Identification</h2>
<p>Nom : {{nom}}<br/>
Prénom : {{prenom}}<br/>
Formation : {{intitule_formation}}<br/>
Date du test : {{date_jour}}</p>

<h2>Questions d'évaluation</h2>

<h3>Question 1 : {{question_1}}</h3>
<p>☐ Réponse A &nbsp; ☐ Réponse B &nbsp; ☐ Réponse C &nbsp; ☐ Réponse D</p>

<h3>Question 2 : {{question_2}}</h3>
<p>☐ Réponse A &nbsp; ☐ Réponse B &nbsp; ☐ Réponse C &nbsp; ☐ Réponse D</p>

<h3>Question 3 : {{question_3}}</h3>
<p>☐ Réponse A &nbsp; ☐ Réponse B &nbsp; ☐ Réponse C &nbsp; ☐ Réponse D</p>

<h2>Résultat / Score</h2>
<p>Score obtenu : {{score}} / {{score_max}}<br/>
Niveau évalué : {{niveau}}</p>

<h2>Commentaires du formateur</h2>
<p>{{commentaires_formateur}}</p>

<p><em>Organisme : {{centre_nom}}</em></p>`;
}

export function generateEvaluationChaud(): string {
  return `<h1>Évaluation à chaud — Fin de formation</h1>
<p><em>RNQ Critère 7 — Indicateur 30</em></p>

<h2>Identification</h2>
<p>Nom : {{nom}} {{prenom}}<br/>
Formation : {{intitule_formation}}<br/>
Session : du {{session_date_debut}} au {{session_date_fin}}<br/>
Date d'évaluation : {{date_jour}}</p>

<h2>Critères d'évaluation</h2>
<table>
<tr><th>Critère</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th></tr>
<tr><td>Atteinte des objectifs</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td></tr>
<tr><td>Qualité de l'animation</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td></tr>
<tr><td>Supports pédagogiques</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td></tr>
<tr><td>Organisation / Locaux</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td></tr>
<tr><td>Satisfaction globale</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td></tr>
</table>

<h2>Recommanderiez-vous cette formation ?</h2>
<p>☐ Oui &nbsp; ☐ Non</p>

<h2>Commentaires / Suggestions d'amélioration</h2>
<p>{{commentaire}}</p>`;
}

export function generateEvaluationFroid(): string {
  return `<h1>Évaluation à froid — J+30</h1>
<p><em>RNQ Critère 7 — Indicateur 32</em></p>

<h2>Identification</h2>
<p>Nom : {{nom}} {{prenom}}<br/>
Formation suivie : {{intitule_formation}}<br/>
Date de fin de formation : {{session_date_fin}}<br/>
Date d'évaluation : {{date_jour}}</p>

<h2>Critères d'évaluation</h2>
<table>
<tr><th>Critère</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th></tr>
<tr><td>Application des acquis en situation professionnelle</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td></tr>
<tr><td>Impact sur la pratique quotidienne</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td></tr>
<tr><td>Satisfaction globale avec le recul</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td><td>☐</td></tr>
</table>

<h2>Pistes d'amélioration</h2>
<p>{{suggestions_amelioration}}</p>

<h2>Commentaires</h2>
<p>{{commentaire}}</p>`;
}

export function generateFeuilleEmargement(): string {
  return `<h1>Feuille d'Émargement</h1>

<h2>Formation : {{intitule_formation}}</h2>
<p>Session : {{session_nom}}<br/>
Date : {{date_jour}}<br/>
Horaires : {{horaire_matin}} / {{horaire_apres_midi}}<br/>
Formateur / Intervenant : {{formateur_nom}}<br/>
Lieu : {{lieu_formation}}</p>

<table style="width:100%; border-collapse:collapse;">
<tr style="background:#f0f0f0;">
<th style="border:1px solid #ccc; padding:8px;">N°</th>
<th style="border:1px solid #ccc; padding:8px;">Nom Prénom</th>
<th style="border:1px solid #ccc; padding:8px;">Signature Matin</th>
<th style="border:1px solid #ccc; padding:8px;">Signature Après-midi</th>
</tr>
<tr><td style="border:1px solid #ccc; padding:8px;">1</td><td style="border:1px solid #ccc; padding:8px;"></td><td style="border:1px solid #ccc; padding:8px;"></td><td style="border:1px solid #ccc; padding:8px;"></td></tr>
<tr><td style="border:1px solid #ccc; padding:8px;">2</td><td style="border:1px solid #ccc; padding:8px;"></td><td style="border:1px solid #ccc; padding:8px;"></td><td style="border:1px solid #ccc; padding:8px;"></td></tr>
<tr><td style="border:1px solid #ccc; padding:8px;">3</td><td style="border:1px solid #ccc; padding:8px;"></td><td style="border:1px solid #ccc; padding:8px;"></td><td style="border:1px solid #ccc; padding:8px;"></td></tr>
<tr><td style="border:1px solid #ccc; padding:8px;">4</td><td style="border:1px solid #ccc; padding:8px;"></td><td style="border:1px solid #ccc; padding:8px;"></td><td style="border:1px solid #ccc; padding:8px;"></td></tr>
<tr><td style="border:1px solid #ccc; padding:8px;">5</td><td style="border:1px solid #ccc; padding:8px;"></td><td style="border:1px solid #ccc; padding:8px;"></td><td style="border:1px solid #ccc; padding:8px;"></td></tr>
</table>

<p style="margin-top:20px;"><strong>Signature du formateur :</strong></p>

<p><em>Organisme : {{centre_nom}} — SIRET : {{centre_siret}} — NDA : {{centre_nda}}</em></p>`;
}

/** Map of generator functions by type */
export const TEMPLATE_GENERATORS: Record<string, { label: string; generator: () => string }> = {
  programme: { label: "Générer Programme Formation T3P", generator: generateProgrammeT3P },
  contrat: { label: "Générer Contrat de Formation", generator: generateContratFormation },
  convention: { label: "Générer Convention de Formation", generator: generateConventionFormation },
  bulletin_inscription: { label: "Générer Bulletin d'Inscription", generator: generateBulletinInscription },
  positionnement: { label: "Générer Test de Positionnement", generator: generateTestPositionnement },
  test_positionnement: { label: "Générer Test de Positionnement", generator: generateTestPositionnement },
  evaluation: { label: "Générer Évaluation à chaud", generator: generateEvaluationChaud },
  evaluation_chaud: { label: "Générer Évaluation à chaud", generator: generateEvaluationChaud },
  evaluation_froid: { label: "Générer Évaluation à froid", generator: generateEvaluationFroid },
  emargement: { label: "Générer Feuille d'Émargement", generator: generateFeuilleEmargement },
  feuille_emargement: { label: "Générer Feuille d'Émargement", generator: generateFeuilleEmargement },
  attestation: { label: "Générer Attestation de Formation", generator: () => `<h1>Attestation de Fin de Formation</h1>

<p>Je soussigné(e), {{responsable_nom}}, responsable de l'organisme de formation {{centre_nom}}, atteste que :</p>

<p><strong>{{nom}} {{prenom}}</strong><br/>
Né(e) le {{date_naissance}}</p>

<p>a suivi la formation :</p>
<p><strong>{{intitule_formation}}</strong></p>

<p>Du {{session_date_debut}} au {{session_date_fin}}<br/>
Durée : {{duree_heures}} heures</p>

<h2>Objectifs atteints</h2>
<p>{{objectifs_atteints}}</p>

<h2>Résultats de l'évaluation</h2>
<p>{{resultats_evaluation}}</p>

<p>Fait à {{lieu}}, le {{date_jour}}</p>

<p>Organisme : {{centre_nom}}<br/>
SIRET : {{centre_siret}}<br/>
NDA : {{centre_nda}}</p>

<p>Signature et cachet :</p>` },
  invoice: { label: "Générer Facture Standard", generator: generateFactureStandard },
  convocation: { label: "Générer Convocation Session", generator: generateConvocationSession },
  reglement_interieur: { label: "Générer Règlement Intérieur", generator: generateReglementInterieur },
  procedure_reclamation: { label: "Générer Procédure Réclamation", generator: generateProcedureReclamation },
};

export function generateFactureStandard(): string {
  return `<div style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;">
<div style="display:flex;justify-content:space-between;margin-bottom:30px;">
<div>
<h2 style="margin:0;">{{centre_nom}}</h2>
<p style="margin:4px 0;font-size:12px;">SIRET : {{centre_siret}}<br/>NDA : {{centre_nda}}<br/>{{centre_adresse}}</p>
</div>
<div style="text-align:right;">
<h1 style="margin:0;color:#2563eb;">FACTURE</h1>
<p style="font-size:14px;margin:4px 0;">N° {{numero_facture}}<br/>Date : {{date_jour}}</p>
</div>
</div>

<div style="background:#f8fafc;padding:16px;border-radius:8px;margin-bottom:24px;">
<p style="margin:0;font-weight:bold;">Destinataire :</p>
<p style="margin:4px 0;">{{civilite}} {{prenom}} {{nom}}<br/>{{adresse}}<br/>Email : {{email}}<br/>Tél : {{telephone}}</p>
</div>

<table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
<thead>
<tr style="background:#0f172a;color:#fff;">
<th style="padding:10px;text-align:left;">Désignation</th>
<th style="padding:10px;text-align:center;">Qté</th>
<th style="padding:10px;text-align:right;">P.U. HT</th>
<th style="padding:10px;text-align:right;">Montant HT</th>
</tr>
</thead>
<tbody>
<tr style="border-bottom:1px solid #e2e8f0;">
<td style="padding:10px;">{{intitule_formation}}<br/><span style="font-size:12px;color:#64748b;">Du {{session_date_debut}} au {{session_date_fin}} — {{duree_heures}}h</span></td>
<td style="padding:10px;text-align:center;">1</td>
<td style="padding:10px;text-align:right;">{{prix_total}} €</td>
<td style="padding:10px;text-align:right;">{{prix_total}} €</td>
</tr>
</tbody>
</table>

<div style="display:flex;justify-content:flex-end;">
<table style="width:250px;">
<tr><td style="padding:4px;">Total HT</td><td style="padding:4px;text-align:right;font-weight:bold;">{{prix_total}} €</td></tr>
<tr><td style="padding:4px;font-size:12px;color:#64748b;">TVA non applicable — art. 293 B du CGI</td><td></td></tr>
<tr style="border-top:2px solid #0f172a;"><td style="padding:8px 4px;font-weight:bold;font-size:16px;">Total TTC</td><td style="padding:8px 4px;text-align:right;font-weight:bold;font-size:16px;color:#2563eb;">{{prix_total}} €</td></tr>
</table>
</div>

<div style="margin-top:30px;padding:16px;background:#f8fafc;border-radius:8px;font-size:12px;">
<p style="margin:0;"><strong>Conditions de règlement :</strong> {{modalites_paiement}}</p>
<p style="margin:4px 0;">En cas de retard de paiement, une pénalité de 3 fois le taux d'intérêt légal sera appliquée. Indemnité forfaitaire de recouvrement : 40 €.</p>
</div>
</div>`;
}

export function generateConvocationSession(): string {
  return `<div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;">
<div style="text-align:right;margin-bottom:20px;">
<p>{{centre_nom}}<br/>{{centre_adresse}}<br/>SIRET : {{centre_siret}} — NDA : {{centre_nda}}</p>
</div>

<p style="text-align:right;">Le {{date_jour}}</p>

<p><strong>À l'attention de :</strong><br/>{{civilite}} {{prenom}} {{nom}}<br/>{{adresse}}<br/>{{email}}</p>

<h1 style="text-align:center;color:#0f172a;border-bottom:2px solid #2563eb;padding-bottom:10px;">CONVOCATION</h1>

<p>{{civilite}} {{nom}},</p>

<p>Nous avons le plaisir de vous confirmer votre inscription à la formation suivante :</p>

<table style="width:100%;border-collapse:collapse;margin:20px 0;">
<tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:8px;font-weight:bold;width:200px;">Formation</td><td style="padding:8px;">{{intitule_formation}}</td></tr>
<tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:8px;font-weight:bold;">Session</td><td style="padding:8px;">{{session_nom}}</td></tr>
<tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:8px;font-weight:bold;">Dates</td><td style="padding:8px;">Du {{session_date_debut}} au {{session_date_fin}}</td></tr>
<tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:8px;font-weight:bold;">Durée</td><td style="padding:8px;">{{duree_heures}} heures</td></tr>
<tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:8px;font-weight:bold;">Horaires</td><td style="padding:8px;">{{horaires}}</td></tr>
<tr><td style="padding:8px;font-weight:bold;">Lieu</td><td style="padding:8px;">{{lieu_formation}}</td></tr>
</table>

<p><strong>Documents à apporter :</strong></p>
<ul>
<li>Pièce d'identité en cours de validité</li>
<li>Le présent courrier de convocation</li>
</ul>

<p>Nous vous prions d'agréer l'expression de nos salutations distinguées.</p>

<p style="margin-top:30px;"><strong>{{responsable_nom}}</strong><br/>{{centre_nom}}</p>
</div>`;
}

export function generateReglementInterieur(): string {
  return `<h1 style="text-align:center;">Règlement Intérieur</h1>
<p style="text-align:center;"><em>Établi conformément aux articles L.6352-3 et R.6352-1 à R.6352-15 du Code du travail</em></p>

<p><strong>{{centre_nom}}</strong><br/>SIRET : {{centre_siret}} — NDA : {{centre_nda}}</p>

<h2>Article 1 — Objet et champ d'application</h2>
<p>Le présent règlement s'applique à tous les stagiaires inscrits à une formation dispensée par {{centre_nom}}, et ce pendant toute la durée de la formation.</p>

<h2>Article 2 — Hygiène et sécurité</h2>
<p>Les stagiaires sont tenus de respecter les consignes d'hygiène et de sécurité. Il est interdit de fumer ou vapoter dans les locaux. L'introduction de boissons alcoolisées est interdite.</p>

<h2>Article 3 — Discipline</h2>
<p>Les stagiaires doivent respecter les horaires de formation. En cas d'absence ou de retard, le stagiaire doit en informer l'organisme. Toute absence non justifiée pourra entraîner l'exclusion.</p>

<h2>Article 4 — Sanctions disciplinaires</h2>
<p>Tout manquement au présent règlement pourra faire l'objet d'une sanction, allant de l'avertissement écrit à l'exclusion définitive, conformément aux dispositions des articles R.6352-3 et suivants du Code du travail.</p>

<h2>Article 5 — Représentation des stagiaires</h2>
<p>Pour les formations d'une durée supérieure à 500 heures, un délégué des stagiaires est élu dans les conditions prévues aux articles R.6352-9 à R.6352-15.</p>

<h2>Article 6 — Procédure disciplinaire</h2>
<p>Aucune sanction ne peut être infligée sans que le stagiaire ait été informé des griefs retenus contre lui et ait pu présenter ses observations (art. R.6352-4 à R.6352-8).</p>

<h2>Article 7 — Réclamations</h2>
<p>Toute réclamation peut être adressée au responsable de l'organisme par écrit. Une procédure de traitement des réclamations est mise en place conformément au référentiel Qualiopi.</p>

<h2>Article 8 — Entrée en vigueur</h2>
<p>Le présent règlement entre en vigueur à compter du {{date_jour}}.</p>

<p style="margin-top:30px;"><strong>{{responsable_nom}}</strong><br/>{{centre_nom}}</p>`;
}

export function generateProcedureReclamation(): string {
  return `<h1 style="text-align:center;">Procédure de Réclamation</h1>
<p style="text-align:center;"><em>Conformément au Référentiel National Qualité (Qualiopi) — Critère 7, Indicateur 31</em></p>

<p><strong>{{centre_nom}}</strong><br/>SIRET : {{centre_siret}} — NDA : {{centre_nda}}</p>

<h2>1. Objet</h2>
<p>La présente procédure définit les modalités de traitement des réclamations et difficultés rencontrées par les parties prenantes (stagiaires, employeurs, financeurs).</p>

<h2>2. Périmètre</h2>
<p>Cette procédure s'applique à toute réclamation relative à l'organisation, au contenu, aux conditions de déroulement ou aux résultats des formations dispensées par {{centre_nom}}.</p>

<h2>3. Dépôt de la réclamation</h2>
<p>Toute réclamation peut être formulée :</p>
<ul>
<li>Par email : {{email_contact}}</li>
<li>Par courrier : {{centre_adresse}}</li>
<li>Via le formulaire en ligne disponible sur l'espace apprenant</li>
</ul>

<h2>4. Accusé de réception</h2>
<p>Un accusé de réception est adressé au réclamant dans un délai de <strong>48 heures ouvrées</strong>.</p>

<h2>5. Traitement</h2>
<p>La réclamation est analysée par le responsable pédagogique. Une réponse argumentée est apportée dans un délai de <strong>15 jours ouvrés</strong>.</p>

<h2>6. Suivi et amélioration continue</h2>
<p>Chaque réclamation est enregistrée dans un registre dédié. Les réclamations sont analysées trimestriellement pour identifier les axes d'amélioration.</p>

<h2>7. Médiation</h2>
<p>En cas de litige non résolu, le réclamant peut saisir le médiateur de la consommation dont les coordonnées sont disponibles sur demande.</p>

<p style="margin-top:30px;"><em>Date de mise à jour : {{date_jour}}</em><br/><strong>{{responsable_nom}}</strong> — {{centre_nom}}</p>`;
}
