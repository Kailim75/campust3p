// constants/formations.ts
// Fichier de configuration complet pour le générateur de conventions T3P CAMPUS

// ═══════════════════════════════════════════════════════════════════
// INFORMATIONS ORGANISME - Données par défaut (fallback)
// NOTE: Utiliser useCentreFormation() pour obtenir les données dynamiques de la DB
// ═══════════════════════════════════════════════════════════════════

/**
 * @deprecated Utiliser useCentreFormation() à la place pour les données dynamiques.
 * Cette constante est conservée uniquement pour la rétrocompatibilité.
 */
export const ORGANISME = {
  nom: "T3P CAMPUS",
  raisonSociale: "DROP ACADEMY",
  adresse: "3 rue Corneille",
  codePostal: "92120",
  ville: "Montrouge",
  telephone: "01 88 75 05 55",
  email: "dropacademymontrouge@gmail.com",
  siret: "94856480200023",
  nda: "11924375592",
  numeroRS: "RS5637",
  agreementVTCTAXI: "23/005",
  agreementVMDTR: "23/006",
  referentHandicap: {
    nom: "Karim HAMADACHE",
    telephone: "01 88 75 05 55",
    email: "dropacademymontrouge@gmail.com"
  },
  responsablePedagogique: {
    nom: "Karim HAMADACHE",
    fonction: "Directeur pédagogique"
  },
  assurance: {
    nom: "À compléter",
    numeroContrat: "À compléter"
  },
  mediateur: {
    nom: "MEDICYS",
    adresse: "73 Boulevard de Clichy",
    codePostal: "75009",
    ville: "PARIS",
    email: "contact@medicys.fr",
    web: "https://www.medicys.fr"
  },
  rib: {
    banque: "À compléter",
    iban: "À compléter",
    bic: "À compléter"
  }
} as const;

// ═══════════════════════════════════════════════════════════════════
// PROGRAMMES DE FORMATION
// ═══════════════════════════════════════════════════════════════════

export interface ModuleFormation {
  numero: number;
  titre: string;
  dureeHeures: number;
  contenu: string[];
  objectifs?: string[];
  methodologie?: string[];
  evaluation?: string[];
}

// Programme VTC conforme 2024 (35h)
export const PROGRAMME_VTC: ModuleFormation[] = [
  {
    numero: 1,
    titre: "Réglementation du transport public particulier de personnes",
    dureeHeures: 7,
    contenu: [
      "Cadre juridique national et européen du transport de personnes",
      "Différences entre VTC, taxi, LOTI et covoiturage",
      "Conditions d'accès et d'exercice de la profession VTC",
      "Obligations du conducteur VTC : registre de disponibilité, documents obligatoires",
      "Relations avec les plateformes de réservation et centrales",
      "Sanctions administratives et pénales",
      "Évolutions réglementaires et jurisprudence"
    ],
    objectifs: [
      "Maîtriser le cadre réglementaire du transport VTC",
      "Identifier les obligations légales du conducteur",
      "Connaître les sanctions encourues en cas d'infraction"
    ]
  },
  {
    numero: 2,
    titre: "Gestion d'une entreprise",
    dureeHeures: 4,
    contenu: [
      "Choix du statut juridique : auto-entrepreneur, EURL, SASU",
      "Démarches de création d'entreprise et inscription au registre",
      "Obligations comptables, fiscales et déclaratives",
      "Gestion de la TVA et des charges sociales",
      "Assurances professionnelles obligatoires (RC Pro, protection juridique)",
      "Tarification et facturation : devis, factures, mentions obligatoires",
      "Calcul du coût de revient et de la rentabilité"
    ],
    objectifs: [
      "Comprendre les différents statuts juridiques",
      "Connaître ses obligations comptables et fiscales",
      "Savoir calculer sa rentabilité"
    ]
  },
  {
    numero: 3,
    titre: "Sécurité routière",
    dureeHeures: 7,
    contenu: [
      "Réglementation du Code de la route applicable au transport de personnes",
      "Conduite défensive et anticipation des risques",
      "Éco-conduite et économie de carburant",
      "Alcool, stupéfiants, médicaments et vigilance au volant",
      "Gestion de la fatigue et temps de conduite",
      "Équipements de sécurité et entretien du véhicule",
      "Conduite par conditions difficiles (pluie, neige, nuit)",
      "Gestion des situations d'urgence et accidents"
    ],
    objectifs: [
      "Adopter une conduite sécuritaire et responsable",
      "Prévenir les risques d'accidents",
      "Réagir efficacement en situation d'urgence"
    ]
  },
  {
    numero: 4,
    titre: "Français (compréhension et expression)",
    dureeHeures: 7,
    contenu: [
      "Accueil et présentation professionnelle",
      "Communication efficace avec la clientèle",
      "Vocabulaire professionnel du transport de personnes",
      "Compréhension et transmission d'informations",
      "Gestion des réclamations et situations conflictuelles",
      "Rédaction de messages professionnels",
      "Adaptation du discours selon l'interlocuteur"
    ],
    objectifs: [
      "Communiquer efficacement en français",
      "Adopter un langage professionnel adapté",
      "Gérer les situations difficiles avec diplomatie"
    ]
  },
  {
    numero: 5,
    titre: "Anglais (niveau B1 du CECRL)",
    dureeHeures: 7,
    contenu: [
      "Accueil et salutations en anglais",
      "Vocabulaire professionnel du transport",
      "Indications d'itinéraire et orientation",
      "Présentation de la ville et des monuments",
      "Situations courantes de transport (aéroports, gares, hôtels)",
      "Gestion tarifaire et paiement en anglais",
      "Compréhension orale et expression"
    ],
    objectifs: [
      "Accueillir une clientèle anglophone",
      "Communiquer dans les situations professionnelles courantes",
      "Comprendre et répondre aux demandes en anglais"
    ]
  },
  {
    numero: 6,
    titre: "Prévention et lutte contre les discriminations",
    dureeHeures: 2,
    contenu: [
      "Cadre légal : loi du 27 mai 2008 et Code pénal",
      "Les 27 critères de discrimination prohibés",
      "Sanctions pénales et administratives",
      "Études de cas concrets dans le transport de personnes",
      "Refus de prise en charge : cas légitimes et illégitimes",
      "Obligations spécifiques du conducteur professionnel",
      "Signalement et témoignage"
    ],
    objectifs: [
      "Connaître le cadre légal de la non-discrimination",
      "Identifier les comportements discriminatoires",
      "Adopter une attitude professionnelle égalitaire"
    ]
  },
  {
    numero: 7,
    titre: "Prévention et lutte contre la traite des êtres humains et le harcèlement et agressions sexuels",
    dureeHeures: 1,
    contenu: [
      "Définitions : traite des êtres humains, harcèlement, agressions sexuelles",
      "Signaux d'alerte et situations à risque",
      "Obligations légales de signalement",
      "Numéros d'urgence : 119 (enfance), 3919 (violences), 17 (police)",
      "Procédures de signalement et protection des victimes",
      "Rôle de vigilance du conducteur professionnel",
      "Responsabilités pénales et civiles"
    ],
    objectifs: [
      "Reconnaître les situations de danger",
      "Connaître ses obligations de signalement",
      "Savoir réagir face à ces situations"
    ]
  }
];

// Programme TAXI conforme 2024 (35h)
export const PROGRAMME_TAXI: ModuleFormation[] = [
  {
    numero: 1,
    titre: "Réglementation nationale et locale du transport de personnes",
    dureeHeures: 7,
    contenu: [
      "Statut juridique et réglementation spécifique du taxi",
      "ADS (Autorisation De Stationnement) : acquisition, location, cession",
      "Réglementation tarifaire : lumineux, tarifs, suppléments",
      "Équipements obligatoires du véhicule taxi",
      "Stationnement et maraude : droits et obligations",
      "Relations avec l'autorité organisatrice",
      "Sanctions et contrôles spécifiques aux taxis"
    ],
    objectifs: [
      "Maîtriser la réglementation taxi",
      "Connaître le fonctionnement des ADS",
      "Respecter la tarification obligatoire"
    ]
  },
  {
    numero: 2,
    titre: "Gestion d'une entreprise",
    dureeHeures: 4,
    contenu: [
      "Création et gestion d'une activité taxi",
      "Location et acquisition d'ADS : coûts et modalités",
      "Obligations comptables du taxi artisan",
      "Calcul des charges : ADS, assurances, entretien, carburant",
      "Tarification et optimisation du chiffre d'affaires",
      "Gestion de trésorerie et rentabilité",
      "Transmission et cessation d'activité"
    ],
    objectifs: [
      "Comprendre l'économie du métier de taxi",
      "Calculer sa rentabilité",
      "Optimiser sa gestion financière"
    ]
  },
  {
    numero: 3,
    titre: "Sécurité routière",
    dureeHeures: 7,
    contenu: [
      "Réglementation routière spécifique aux taxis",
      "Conduite en milieu urbain dense",
      "Maîtrise du véhicule en toutes circonstances",
      "Éco-conduite et économie de carburant",
      "Sécurité des passagers : trajets, arrêts, chargement",
      "Prévention des risques routiers professionnels",
      "Gestion des situations d'urgence",
      "Entretien préventif du véhicule"
    ],
    objectifs: [
      "Adopter une conduite taxi professionnelle",
      "Assurer la sécurité des passagers",
      "Prévenir les accidents"
    ]
  },
  {
    numero: 4,
    titre: "Français (compréhension et expression)",
    dureeHeures: 7,
    contenu: [
      "Communication professionnelle en situation taxi",
      "Accueil client et courtoisie",
      "Gestion des conflits et réclamations",
      "Vocabulaire professionnel du transport urbain",
      "Rédaction de documents professionnels",
      "Compréhension et exécution de demandes clients",
      "Adaptation du langage au contexte professionnel"
    ],
    objectifs: [
      "Communiquer efficacement avec les clients",
      "Représenter professionnellement le métier",
      "Désamorcer les situations conflictuelles"
    ]
  },
  {
    numero: 5,
    titre: "Anglais (niveau B1 du CECRL)",
    dureeHeures: 7,
    contenu: [
      "Vocabulaire professionnel taxi en anglais",
      "Accueil de clientèle internationale",
      "Indications d'itinéraire et orientation en anglais",
      "Explication de la tarification",
      "Conversation courante pendant le trajet",
      "Gestion des paiements et de la facturation",
      "Présentation touristique de Paris"
    ],
    objectifs: [
      "Servir une clientèle anglophone",
      "Expliquer les tarifs en anglais",
      "Faciliter le tourisme international"
    ]
  },
  {
    numero: 6,
    titre: "Prévention et lutte contre les discriminations",
    dureeHeures: 2,
    contenu: [
      "Obligations spécifiques du conducteur de taxi",
      "Les 27 critères de discrimination",
      "Interdiction absolue du refus de prise en charge discriminatoire",
      "Jurisprudence taxi et discriminations",
      "Sanctions pénales, administratives et professionnelles",
      "Cas pratiques et mises en situation",
      "Contrôles et testing"
    ],
    objectifs: [
      "Connaître ses obligations légales",
      "Identifier et éviter les comportements discriminatoires",
      "Comprendre les risques encourus"
    ]
  },
  {
    numero: 7,
    titre: "Prévention et lutte contre la traite des êtres humains et le harcèlement et agressions sexuels",
    dureeHeures: 1,
    contenu: [
      "Rôle de vigilance du conducteur de taxi",
      "Identification des situations suspectes",
      "Procédures de signalement aux autorités",
      "Numéros d'urgence : 119, 3919, 17",
      "Protection des victimes",
      "Responsabilités du professionnel",
      "Cas concrets dans l'activité taxi"
    ],
    objectifs: [
      "Exercer sa vigilance professionnelle",
      "Savoir signaler aux autorités compétentes",
      "Contribuer à la protection des victimes"
    ]
  }
];

// Programme VMDTR conforme 2024 (35h)
export const PROGRAMME_VMDTR: ModuleFormation[] = [
  {
    numero: 1,
    titre: "Réglementation spécifique VMDTR",
    dureeHeures: 7,
    contenu: [
      "Cadre réglementaire du VMDTR",
      "Différences avec le transport à 4 roues",
      "Conditions d'accès à la profession",
      "Obligations du conducteur VMDTR",
      "Documents obligatoires à bord",
      "Spécificités de sécurité",
      "Sanctions applicables"
    ]
  },
  {
    numero: 2,
    titre: "Gestion d'entreprise VMDTR",
    dureeHeures: 4,
    contenu: [
      "Statuts juridiques adaptés",
      "Investissement et coûts spécifiques",
      "Assurances et garanties",
      "Comptabilité et charges",
      "Tarification et rentabilité",
      "Développement commercial"
    ]
  },
  {
    numero: 3,
    titre: "Sécurité routière deux-roues",
    dureeHeures: 7,
    contenu: [
      "Conduite défensive deux-roues",
      "Risques spécifiques moto/scooter",
      "Équipements de protection",
      "Conduite par mauvais temps",
      "Transport de passagers",
      "Anticipation et visibilité",
      "Entretien du véhicule"
    ]
  },
  {
    numero: 4,
    titre: "Français professionnel",
    dureeHeures: 7,
    contenu: [
      "Communication en situation VMDTR",
      "Accueil et professionnalisme",
      "Gestion client spécifique",
      "Instructions de sécurité passager"
    ]
  },
  {
    numero: 5,
    titre: "Anglais professionnel",
    dureeHeures: 7,
    contenu: [
      "Vocabulaire VMDTR en anglais",
      "Instructions de sécurité",
      "Communication client anglophone",
      "Tourisme en deux-roues"
    ]
  },
  {
    numero: 6,
    titre: "Prévention et lutte contre les discriminations",
    dureeHeures: 2,
    contenu: [
      "Cadre légal anti-discrimination",
      "27 critères prohibés",
      "Obligations conducteur VMDTR",
      "Sanctions",
      "Cas pratiques"
    ]
  },
  {
    numero: 7,
    titre: "Prévention et lutte contre la traite des êtres humains et le harcèlement et agressions sexuels",
    dureeHeures: 1,
    contenu: [
      "Vigilance professionnelle",
      "Signaux d'alerte",
      "Obligations de signalement",
      "Numéros d'urgence",
      "Protection des victimes"
    ]
  }
];

// ═══════════════════════════════════════════════════════════════════
// PRÉREQUIS RÉGLEMENTAIRES
// ═══════════════════════════════════════════════════════════════════

export const PREREQUIS_VTC = [
  "Être titulaire du permis de conduire de la catégorie B en cours de validité depuis au moins 3 ans",
  "Avoir un casier judiciaire vierge (bulletin n°2 sans mention incompatible)",
  "Être apte médicalement (visite médicale préfectorale ou médecin agréé)",
  "Être âgé d'au moins 21 ans révolus",
  "Justifier d'un niveau de français suffisant (niveau B1 du CECRL minimum)"
];

export const PREREQUIS_TAXI = [
  "Être titulaire du permis de conduire de la catégorie B en cours de validité depuis au moins 3 ans",
  "Avoir un casier judiciaire vierge (bulletin n°2 sans mention incompatible)",
  "Être apte médicalement (certificat médical préfectoral obligatoire)",
  "Être âgé d'au moins 21 ans révolus",
  "Justifier d'un niveau de français suffisant (niveau B1 du CECRL minimum)"
];

export const PREREQUIS_VMDTR = [
  "Être titulaire du permis A ou A2 en cours de validité depuis au moins 2 ans",
  "Avoir un casier judiciaire vierge (bulletin n°2 sans mention incompatible)",
  "Être apte médicalement (visite médicale préfectorale)",
  "Être âgé d'au moins 21 ans révolus",
  "Justifier d'un niveau de français suffisant (niveau B1 du CECRL minimum)"
];

// ═══════════════════════════════════════════════════════════════════
// OBJECTIFS PÉDAGOGIQUES
// ═══════════════════════════════════════════════════════════════════

export const OBJECTIFS_VTC = [
  "Maîtriser la réglementation applicable au transport VTC",
  "Acquérir les compétences nécessaires à la gestion d'une entreprise de transport",
  "Adopter une conduite professionnelle, sûre et éco-responsable",
  "Communiquer efficacement en français et en anglais avec la clientèle",
  "Prévenir et lutter contre les discriminations",
  "Identifier et signaler les situations de traite humaine et de violences",
  "Se présenter avec succès à l'examen VTC de la Chambre des Métiers et de l'Artisanat"
];

export const OBJECTIFS_TAXI = [
  "Maîtriser la réglementation spécifique au transport taxi",
  "Comprendre le fonctionnement économique de l'activité taxi",
  "Adopter une conduite professionnelle adaptée au milieu urbain",
  "Communiquer efficacement en français et en anglais",
  "Respecter les obligations de non-discrimination",
  "Exercer un rôle de vigilance contre les violences et la traite",
  "Réussir l'examen taxi de la Chambre des Métiers et de l'Artisanat"
];

export const OBJECTIFS_VMDTR = [
  "Maîtriser la réglementation VMDTR",
  "Gérer une activité de transport en deux-roues",
  "Garantir la sécurité du conducteur et du passager",
  "Communiquer professionnellement",
  "Respecter les principes de non-discrimination",
  "Assurer une vigilance contre les violences",
  "Obtenir la carte professionnelle VMDTR"
];

// ═══════════════════════════════════════════════════════════════════
// ÉPREUVES SPÉCIFIQUES PAR TYPE DE FORMATION
// ═══════════════════════════════════════════════════════════════════

export interface EpreuveSpecifique {
  code: string;
  intitule: string;
  qcm: number;
  qrc: number;
  duree: string;
  noteMinimale: string;
  pointsEliminatoires: number;
}

export const EPREUVES_SPECIFIQUES_TAXI: EpreuveSpecifique[] = [
  {
    code: "F(T)",
    intitule: "Connaissance du territoire et réglementation locale",
    qcm: 6,
    qrc: 2,
    duree: "0h20",
    noteMinimale: "6/20",
    pointsEliminatoires: 3
  },
  {
    code: "G(T)",
    intitule: "Réglementation nationale spécifique aux taxis",
    qcm: 12,
    qrc: 4,
    duree: "0h30",
    noteMinimale: "6/20",
    pointsEliminatoires: 3
  }
];

export const EPREUVES_SPECIFIQUES_VTC: EpreuveSpecifique[] = [
  {
    code: "F(V)",
    intitule: "Développement commercial",
    qcm: 12,
    qrc: 4,
    duree: "0h30",
    noteMinimale: "6/20",
    pointsEliminatoires: 3
  },
  {
    code: "G(V)",
    intitule: "Réglementation nationale spécifique de l'activité de VTC",
    qcm: 6,
    qrc: 2,
    duree: "0h20",
    noteMinimale: "6/20",
    pointsEliminatoires: 3
  }
];

export const EPREUVES_SPECIFIQUES_VMDTR: EpreuveSpecifique[] = [
  {
    code: "F(M)",
    intitule: "Sécurité routière spécifique à l'usage et à la conduite de motocyclettes",
    qcm: 12,
    qrc: 4,
    duree: "0h30",
    noteMinimale: "6/20",
    pointsEliminatoires: 3
  },
  {
    code: "G(M)",
    intitule: "Prise en charge du passager",
    qcm: 6,
    qrc: 2,
    duree: "0h20",
    noteMinimale: "6/20",
    pointsEliminatoires: 3
  }
];

export const getEpreuvesSpecifiques = (type: TypeFormation): EpreuveSpecifique[] => {
  switch (type) {
    case "VTC":
      return EPREUVES_SPECIFIQUES_VTC;
    case "TAXI":
      return EPREUVES_SPECIFIQUES_TAXI;
    case "VMDTR":
      return EPREUVES_SPECIFIQUES_VMDTR;
    default:
      return [];
  }
};

// ═══════════════════════════════════════════════════════════════════
// TARIFS
// ═══════════════════════════════════════════════════════════════════

export const TARIFS = {
  VTC: {
    journee: 990,
    soiree: 1090,
    weekend: 1090
  },
  TAXI: {
    journee: 990,
    soiree: 1090,
    weekend: 1090
  },
  VMDTR: {
    journee: 990,
    soiree: 1090,
    weekend: 1090
  },
  RECUPERATION_POINTS: {
    standard: 250
  }
} as const;

// ═══════════════════════════════════════════════════════════════════
// HORAIRES TYPES
// ═══════════════════════════════════════════════════════════════════

export const HORAIRES = {
  journee: {
    matin: "9h00 - 12h30",
    apresMidi: "13h30 - 17h00"
  },
  soiree: {
    matin: "18h00 - 20h00",
    apresMidi: "20h00 - 22h00"
  },
  weekend: {
    matin: "9h00 - 12h30",
    apresMidi: "13h30 - 17h00"
  }
} as const;

// ═══════════════════════════════════════════════════════════════════
// TYPES TYPESCRIPT
// ═══════════════════════════════════════════════════════════════════

export type TypeFormation = "VTC" | "TAXI" | "VMDTR" | "RECUPERATION_POINTS";
export type Modalite = "journée" | "soirée" | "weekend";
export type Civilite = "M." | "Mme";

export interface Beneficiaire {
  civilite: Civilite;
  nom: string;
  prenom: string;
  dateNaissance: Date;
  adresse: string;
  codePostal: string;
  ville: string;
  telephone: string;
  email: string;
  situationHandicap?: boolean;
}

export interface Formation {
  type: TypeFormation;
  intitule: string;
  modalite: Modalite;
  dateDebut: Date;
  dateFin: Date;
  dureeHeures: number;
  horaires: {
    matin: string;
    apresMidi: string;
  };
  tarifHT: number;
  prerequisReglementaires: string[];
  objectifsPedagogiques: string[];
  programme: ModuleFormation[];
}

// ═══════════════════════════════════════════════════════════════════
// FONCTIONS UTILITAIRES
// ═══════════════════════════════════════════════════════════════════

export const getProgramme = (type: TypeFormation): ModuleFormation[] => {
  switch (type) {
    case "VTC":
      return PROGRAMME_VTC;
    case "TAXI":
      return PROGRAMME_TAXI;
    case "VMDTR":
      return PROGRAMME_VMDTR;
    default:
      return [];
  }
};

export const getPrerequis = (type: TypeFormation): string[] => {
  switch (type) {
    case "VTC":
      return PREREQUIS_VTC;
    case "TAXI":
      return PREREQUIS_TAXI;
    case "VMDTR":
      return PREREQUIS_VMDTR;
    default:
      return [];
  }
};

export const getObjectifs = (type: TypeFormation): string[] => {
  switch (type) {
    case "VTC":
      return OBJECTIFS_VTC;
    case "TAXI":
      return OBJECTIFS_TAXI;
    case "VMDTR":
      return OBJECTIFS_VMDTR;
    default:
      return [];
  }
};

export const getTarif = (type: TypeFormation, modalite: Modalite): number => {
  const tarifsType = TARIFS[type];
  if (tarifsType && typeof tarifsType === 'object' && modalite in tarifsType) {
    return tarifsType[modalite as keyof typeof tarifsType];
  }
  return 0;
};

export const getHoraires = (modalite: Modalite) => {
  return HORAIRES[modalite];
};

// ═══════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════

export const validateBeneficiaire = (beneficiaire: Beneficiaire): string[] => {
  const errors: string[] = [];
  
  if (!beneficiaire.nom?.trim()) errors.push("Le nom est obligatoire");
  if (!beneficiaire.prenom?.trim()) errors.push("Le prénom est obligatoire");
  if (!beneficiaire.dateNaissance) errors.push("La date de naissance est obligatoire");
  if (!beneficiaire.adresse?.trim()) errors.push("L'adresse est obligatoire");
  if (!beneficiaire.codePostal?.trim()) errors.push("Le code postal est obligatoire");
  if (!beneficiaire.ville?.trim()) errors.push("La ville est obligatoire");
  if (!beneficiaire.telephone?.trim()) errors.push("Le téléphone est obligatoire");
  if (!beneficiaire.email?.trim()) errors.push("L'email est obligatoire");
  
  // Validation email
  if (beneficiaire.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(beneficiaire.email)) {
    errors.push("L'email n'est pas valide");
  }
  
  // Validation téléphone français
  if (beneficiaire.telephone && !/^0[1-9]\d{8}$/.test(beneficiaire.telephone.replace(/\s/g, ''))) {
    errors.push("Le téléphone n'est pas valide (format: 0X XX XX XX XX)");
  }
  
  // Validation âge minimum (21 ans)
  if (beneficiaire.dateNaissance) {
    const age = Math.floor((Date.now() - beneficiaire.dateNaissance.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    if (age < 21) {
      errors.push("Le bénéficiaire doit avoir au moins 21 ans");
    }
  }
  
  return errors;
};

export const validateFormation = (formation: Formation): string[] => {
  const errors: string[] = [];
  
  if (!formation.intitule?.trim()) errors.push("L'intitulé est obligatoire");
  if (!formation.type) errors.push("Le type de formation est obligatoire");
  if (!formation.modalite) errors.push("La modalité est obligatoire");
  if (!formation.dateDebut) errors.push("La date de début est obligatoire");
  if (!formation.dateFin) errors.push("La date de fin est obligatoire");
  if (formation.dureeHeures <= 0) errors.push("La durée doit être supérieure à 0");
  if (formation.tarifHT <= 0) errors.push("Le tarif doit être supérieur à 0");
  
  if (formation.dateDebut && formation.dateFin) {
    if (formation.dateDebut > formation.dateFin) {
      errors.push("La date de début doit être antérieure à la date de fin");
    }
    
    // Vérifier que la formation est dans le futur (sauf si test)
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    if (formation.dateDebut < aujourdhui) {
      errors.push("La date de début doit être dans le futur");
    }
  }
  
  return errors;
};

// ═══════════════════════════════════════════════════════════════════
// FORMATAGE
// ═══════════════════════════════════════════════════════════════════

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
};

export const formatDateLong = (date: Date): string => {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
};

export const formatHeure = (date: Date): string => {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

export const formatMontant = (montant: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(montant);
};

export const formatTelephone = (telephone: string): string => {
  const cleaned = telephone.replace(/\s/g, '');
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(?=\d)/g, '$1 ');
  }
  return telephone;
};

// ═══════════════════════════════════════════════════════════════════
// EXPORT PAR DÉFAUT
// ═══════════════════════════════════════════════════════════════════

export default {
  ORGANISME,
  PROGRAMME_VTC,
  PROGRAMME_TAXI,
  PROGRAMME_VMDTR,
  PREREQUIS_VTC,
  PREREQUIS_TAXI,
  PREREQUIS_VMDTR,
  OBJECTIFS_VTC,
  OBJECTIFS_TAXI,
  OBJECTIFS_VMDTR,
  EPREUVES_SPECIFIQUES_VTC,
  EPREUVES_SPECIFIQUES_TAXI,
  EPREUVES_SPECIFIQUES_VMDTR,
  TARIFS,
  HORAIRES,
  getProgramme,
  getPrerequis,
  getObjectifs,
  getEpreuvesSpecifiques,
  getTarif,
  getHoraires,
  validateBeneficiaire,
  validateFormation,
  formatDate,
  formatDateLong,
  formatHeure,
  formatMontant,
  formatTelephone
};
