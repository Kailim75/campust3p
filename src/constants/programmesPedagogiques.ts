// ═══════════════════════════════════════════════════════════════
// DONNÉES PÉDAGOGIQUES COMPLÉMENTAIRES PAR FILIÈRE
// Blocs documentaires obligatoires pour le programme de formation
// ═══════════════════════════════════════════════════════════════

import type { TypeFormation } from "@/constants/formations";

// ─── Public visé ────────────────────────────────────────────────
const PUBLIC_VISE: Record<string, string[]> = {
  VTC: [
    "Toute personne souhaitant exercer la profession de conducteur de voiture de transport avec chauffeur (VTC)",
    "Candidats à l'examen VTC de la Chambre des Métiers et de l'Artisanat",
    "Reconversion professionnelle vers le secteur du transport de personnes",
  ],
  TAXI: [
    "Toute personne souhaitant exercer la profession de conducteur de taxi",
    "Candidats à l'examen taxi de la Chambre des Métiers et de l'Artisanat",
    "Reconversion professionnelle vers le secteur du transport public de personnes",
  ],
  "TAXI-75": [
    "Toute personne souhaitant exercer la profession de conducteur de taxi sur le territoire de Paris (75)",
    "Candidats à l'examen taxi de la Chambre des Métiers et de l'Artisanat de Paris",
    "Reconversion professionnelle vers le transport public de personnes à Paris",
  ],
  VMDTR: [
    "Toute personne souhaitant exercer la profession de conducteur de véhicule motorisé à deux ou trois roues (moto-taxi)",
    "Candidats à l'examen VMDTR de la Chambre des Métiers et de l'Artisanat",
    "Titulaires du permis A ou A2 souhaitant se professionnaliser dans le transport de personnes",
  ],
};

// ─── Compétences visées ─────────────────────────────────────────
const COMPETENCES_VISEES: Record<string, string[]> = {
  VTC: [
    "Appliquer la réglementation du transport public particulier de personnes",
    "Créer et gérer une entreprise de transport VTC",
    "Assurer la sécurité des passagers et adopter une conduite professionnelle",
    "Accueillir et communiquer avec une clientèle française et internationale",
    "Prévenir les discriminations et lutter contre les violences",
    "Réussir l'examen d'accès à la profession de conducteur VTC",
  ],
  TAXI: [
    "Appliquer la réglementation nationale du transport taxi",
    "Créer et gérer une entreprise de taxi",
    "Assurer la sécurité des passagers et adopter une conduite professionnelle",
    "Accueillir et communiquer avec une clientèle française et internationale",
    "Maîtriser les équipements spéciaux taxi (taximètre, lumineux, TPE)",
    "Prévenir les discriminations et lutter contre les violences",
    "Réussir l'examen d'accès à la profession de conducteur de taxi",
  ],
  "TAXI-75": [
    "Appliquer la réglementation nationale et locale du transport taxi à Paris",
    "Connaître le territoire parisien (arrondissements, monuments, axes)",
    "Créer et gérer une entreprise de taxi",
    "Assurer la sécurité des passagers en milieu urbain dense",
    "Accueillir une clientèle internationale et fournir des informations touristiques",
    "Maîtriser les équipements spéciaux taxi et la tarification parisienne",
    "Prévenir les discriminations et lutter contre les violences",
    "Réussir l'examen taxi de la CMA de Paris",
  ],
  VMDTR: [
    "Appliquer la réglementation spécifique au transport VMDTR",
    "Créer et gérer une activité de transport en deux-roues",
    "Garantir la sécurité du conducteur et du passager en deux-roues",
    "Communiquer professionnellement en français et en anglais",
    "Prévenir les discriminations et lutter contre les violences",
    "Obtenir la carte professionnelle VMDTR",
  ],
};

// ─── Modalités pédagogiques ─────────────────────────────────────
const MODALITES_PEDAGOGIQUES: string[] = [
  "Formation en présentiel dans nos locaux",
  "Alternance d'apports théoriques et d'exercices pratiques",
  "Études de cas concrets issus du métier",
  "Mises en situation professionnelles",
  "Supports pédagogiques remis à chaque stagiaire (format numérique et/ou papier)",
  "Examens blancs dans les conditions de l'épreuve officielle",
];

// ─── Moyens pédagogiques et techniques ──────────────────────────
const MOYENS_PEDAGOGIQUES: string[] = [
  "Salle de formation climatisée équipée de vidéoprojecteur et écran",
  "Supports de cours actualisés conformes à la réglementation en vigueur",
  "QCM d'entraînement sur plateforme numérique",
  "Véhicule(s) de formation pour les modules pratiques",
  "Accès Wi-Fi pour les stagiaires",
];

// ─── Suivi et évaluation ────────────────────────────────────────
const SUIVI_EVALUATION: string[] = [
  "Feuille de présence émargée par demi-journée",
  "Évaluation diagnostique en début de formation",
  "QCM d'évaluation continue à la fin de chaque module",
  "Examens blancs dans les conditions réelles de l'épreuve CMA",
  "Évaluation de satisfaction à chaud en fin de formation",
  "Évaluation des acquis en fin de formation",
];

// ─── Encadrement ────────────────────────────────────────────────
const ENCADREMENT: string[] = [
  "Formateurs experts titulaires d'une expérience professionnelle dans le transport de personnes",
  "Responsable pédagogique garant de la qualité de la formation",
  "Suivi individualisé de chaque stagiaire tout au long de la formation",
];

// ─── Accessibilité ──────────────────────────────────────────────
const ACCESSIBILITE: string[] = [
  "Formation accessible aux personnes en situation de handicap",
  "Locaux conformes aux normes d'accessibilité ERP",
  "Un référent handicap est disponible pour adapter les conditions de formation",
  "Contactez-nous en amont pour étudier les aménagements possibles",
];

// ─── Sanction / Documents remis ─────────────────────────────────
const SANCTION: Record<string, string[]> = {
  VTC: [
    "Attestation de fin de formation mentionnant les objectifs, la nature, la durée et les résultats de l'évaluation",
    "Certificat de réalisation",
    "Le stagiaire peut ensuite se présenter à l'examen VTC organisé par la Chambre des Métiers et de l'Artisanat",
  ],
  TAXI: [
    "Attestation de fin de formation mentionnant les objectifs, la nature, la durée et les résultats de l'évaluation",
    "Certificat de réalisation",
    "Le stagiaire peut ensuite se présenter à l'examen taxi organisé par la Chambre des Métiers et de l'Artisanat",
  ],
  "TAXI-75": [
    "Attestation de fin de formation mentionnant les objectifs, la nature, la durée et les résultats de l'évaluation",
    "Certificat de réalisation",
    "Le stagiaire peut ensuite se présenter à l'examen taxi organisé par la CMA de Paris",
  ],
  VMDTR: [
    "Attestation de fin de formation mentionnant les objectifs, la nature, la durée et les résultats de l'évaluation",
    "Certificat de réalisation",
    "Le stagiaire peut ensuite se présenter à l'examen VMDTR organisé par la Chambre des Métiers et de l'Artisanat",
  ],
};

// ─── Références réglementaires ──────────────────────────────────
const REFERENCES_REGLEMENTAIRES: Record<string, string[]> = {
  VTC: [
    "Loi n°2014-1104 du 1er octobre 2014 relative aux taxis et aux voitures de transport avec chauffeur",
    "Décret n°2017-483 du 6 avril 2017 relatif aux activités de transport public particulier de personnes",
    "Arrêté du 6 avril 2017 relatif aux programmes et à l'évaluation des épreuves des examens",
  ],
  TAXI: [
    "Loi n°2014-1104 du 1er octobre 2014 relative aux taxis et aux voitures de transport avec chauffeur",
    "Décret n°2017-483 du 6 avril 2017 relatif aux activités de transport public particulier de personnes",
    "Arrêté du 6 avril 2017 relatif aux programmes et à l'évaluation des épreuves des examens",
  ],
  "TAXI-75": [
    "Loi n°2014-1104 du 1er octobre 2014 relative aux taxis et aux voitures de transport avec chauffeur",
    "Décret n°2017-483 du 6 avril 2017 relatif aux activités de transport public particulier de personnes",
    "Arrêté du 6 avril 2017 relatif aux programmes et à l'évaluation des épreuves des examens",
    "Réglementation locale de la Préfecture de Police de Paris",
  ],
  VMDTR: [
    "Loi n°2014-1104 du 1er octobre 2014 relative aux taxis et aux voitures de transport avec chauffeur",
    "Décret n°2017-483 du 6 avril 2017 relatif aux activités de transport public particulier de personnes",
    "Dispositions spécifiques aux véhicules motorisés à deux ou trois roues",
  ],
};

// ─── Intitulés complets par filière ─────────────────────────────
const INTITULES_COMPLETS: Record<string, string> = {
  VTC: "Formation initiale — Conducteur de voiture de transport avec chauffeur (VTC)",
  TAXI: "Formation initiale — Conducteur de taxi",
  "TAXI-75": "Formation initiale — Conducteur de taxi — Paris (75)",
  VMDTR: "Formation initiale — Conducteur de véhicule motorisé à deux ou trois roues (VMDTR)",
};

// ─── Accesseurs publics ─────────────────────────────────────────

export function getPublicVise(type: TypeFormation): string[] {
  return PUBLIC_VISE[type] || [];
}

export function getCompetencesVisees(type: TypeFormation): string[] {
  return COMPETENCES_VISEES[type] || [];
}

export function getModalitesPedagogiques(): string[] {
  return MODALITES_PEDAGOGIQUES;
}

export function getMoyensPedagogiques(): string[] {
  return MOYENS_PEDAGOGIQUES;
}

export function getSuiviEvaluation(): string[] {
  return SUIVI_EVALUATION;
}

export function getEncadrement(): string[] {
  return ENCADREMENT;
}

export function getAccessibilite(): string[] {
  return ACCESSIBILITE;
}

export function getSanction(type: TypeFormation): string[] {
  return SANCTION[type] || SANCTION.VTC;
}

export function getReferencesReglementaires(type: TypeFormation): string[] {
  return REFERENCES_REGLEMENTAIRES[type] || [];
}

export function getIntituleComplet(type: TypeFormation): string {
  return INTITULES_COMPLETS[type] || type;
}
