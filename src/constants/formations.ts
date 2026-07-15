// constants/formations.ts
// Fichier de configuration complet pour le générateur de conventions T3P CAMPUS

// ═══════════════════════════════════════════════════════════════════
// INFORMATIONS ORGANISME - Données par défaut (fallback)
// NOTE: Utiliser useCentreFormation() pour obtenir les données dynamiques de la DB
// ═══════════════════════════════════════════════════════════════════

/**
 * Données par défaut de l'organisme - UTILISÉES UNIQUEMENT EN FALLBACK
 * ⚠️ IMPORTANT : Toujours utiliser useCentreFormation() pour les données dynamiques.
 * Ces valeurs sont remplacées par les données configurées dans Paramètres > Centre.
 */
export const ORGANISME = {
  // Données ECOLE T3P par défaut — remplacées par les données du centre en DB si configurées
  nom: "ECOLE T3P",
  raisonSociale: "ECOLE T3P",
  adresse: "3 rue Corneille",
  codePostal: "92120",
  ville: "Montrouge",
  telephone: "01 88 75 05 55",
  email: "montrouge@ecolet3p.fr",
  siret: "94856480200023",
  nda: "", // Pas de NDA actuellement — ne pas afficher
  numeroRS: "",
  agreementVTCTAXI: "23/005",
  agreementVMDTR: "23/006",
  referentHandicap: {
    nom: "ECOLE T3P",
    telephone: "01 88 75 05 55",
    email: "montrouge@ecolet3p.fr"
  },
  responsablePedagogique: {
    nom: "La Direction",
    fonction: "Direction pédagogique"
  },
  assurance: {
    nom: "",
    numeroContrat: ""
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
    banque: "",
    iban: "",
    bic: ""
  },
  // Pièces d'inscription à fournir (liste canonique)
  piecesInscription: [
    "Pièce d'identité",
    "Permis de conduire",
    "Justificatif de domicile de moins de 3 mois",
    "Photo d'identité",
    "Signature sur fond blanc"
  ],
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

// ─── Modules communs de fin de formation initiale ──────────────────
// Ajoutés à chaque filière : examen blanc (3h, dernier samedi 14h-17h) et
// formation pratique à la conduite (2 séances de 1h + présentation à
// l'épreuve pratique). Homogènes Taxi / VTC / VMDTR.

export const MODULE_EXAMEN_BLANC: ModuleFormation = {
  numero: 90,
  titre: "Examen blanc",
  dureeHeures: 3,
  contenu: [
    "Examen blanc complet dans les conditions réelles de l'épreuve théorique CMA",
    "Épreuves d'admissibilité (QCM) sur l'ensemble des thèmes du programme",
    "Correction commentée et identification des points à consolider",
    "Organisé le dernier samedi de la formation (14h - 17h)",
  ],
  objectifs: [
    "Se placer dans les conditions réelles de l'examen d'accès à la profession",
    "Mesurer son niveau et cibler ses révisions avant l'épreuve officielle",
  ],
  methodologie: ["Mise en situation d'examen", "Correction collective"],
  evaluation: ["Score à l'examen blanc"],
};

export const MODULE_PRATIQUE_CONDUITE: ModuleFormation = {
  numero: 91,
  titre: "Formation pratique à la conduite et présentation à l'épreuve pratique",
  dureeHeures: 2,
  contenu: [
    "2 séances de 1 heure de conduite accompagnée sur véhicule-école",
    "Conduite en sécurité, souplesse et confort du passager",
    "Prise en charge et dépose du client, gestion du parcours",
    "Préparation et présentation à l'épreuve pratique organisée par la préfecture",
  ],
  objectifs: [
    "Adopter une conduite professionnelle sûre et confortable",
    "Se préparer aux exigences de l'épreuve pratique d'admission",
  ],
  methodologie: ["Mise en pratique sur véhicule-école", "Débriefing individualisé"],
  evaluation: ["Grille d'observation de conduite"],
};

// Programme VTC conforme à l'arrêté du 6 avril 2017 modifié (2024) - Durée totale : 34 heures
// Nomenclature officielle des épreuves : A, B, C, D, E + F(V), G(V)
export const PROGRAMME_VTC: ModuleFormation[] = [
  {
    numero: 1,
    titre: "A — Réglementation du transport public particulier de personnes et prévention des discriminations et des violences sexuelles et sexistes",
    dureeHeures: 6,
    contenu: [
      "Cadre juridique national et européen du transport de personnes",
      "Différences entre VTC, taxi, LOTI et covoiturage",
      "Conditions d'accès et d'exercice de la profession VTC",
      "Obligations du conducteur VTC : registre de disponibilité, documents obligatoires",
      "Relations avec les plateformes de réservation et centrales",
      "Sanctions administratives et pénales",
      "Évolutions réglementaires et jurisprudence",
      "Règles relatives à la prise en charge des personnes à mobilité réduite",
      "Connaître les comportements constituant des infractions à caractère sexuel et/ou sexiste (outrage sexiste, agression sexuelle, harcèlement sexuel, viol)",
      "Connaître les discriminations listées à l'article 225-1 du code pénal ainsi que les peines encourues",
      "Connaître les acteurs au service de la prévention en matière de violences sexuelles et sexistes et de lutte contre les discriminations"
    ],
    objectifs: [
      "Maîtriser le cadre réglementaire du transport VTC",
      "Identifier les obligations légales du conducteur",
      "Connaître les sanctions encourues en cas d'infraction",
      "Prévenir et lutter contre les discriminations et les violences"
    ]
  },
  {
    numero: 2,
    titre: "B — Gestion",
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
    titre: "C — Sécurité routière",
    dureeHeures: 6,
    contenu: [
      "Réglementation du Code de la route applicable au transport de personnes",
      "Conduite défensive et anticipation des risques",
      "Éco-conduite et économie de carburant",
      "Alcool, stupéfiants, médicaments et vigilance au volant",
      "Gestion de la fatigue et temps de conduite",
      "Équipements de sécurité et entretien du véhicule",
      "Conduite par conditions difficiles (pluie, neige, nuit)",
      "Gestion des situations d'urgence et accidents",
      "Mécanisme du permis à points"
    ],
    objectifs: [
      "Adopter une conduite sécuritaire et responsable",
      "Prévenir les risques d'accidents",
      "Réagir efficacement en situation d'urgence"
    ]
  },
  {
    numero: 4,
    titre: "D — Français (compréhension et expression)",
    dureeHeures: 6,
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
    titre: "E — Anglais",
    dureeHeures: 6,
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
    titre: "F(V) — Développement commercial et gestion propre à l'activité de VTC",
    dureeHeures: 4,
    contenu: [
      "Stratégie de développement commercial pour un conducteur VTC",
      "Positionnement et différenciation sur le marché",
      "Gestion de la relation client et fidélisation",
      "Utilisation des plateformes de réservation et outils numériques",
      "Construction d'une offre de services (gamme de véhicules, prestations)",
      "Communication professionnelle et e-réputation",
      "Partenariats et développement de réseau"
    ],
    objectifs: [
      "Élaborer une stratégie commerciale adaptée",
      "Maîtriser les outils de développement d'activité",
      "Fidéliser une clientèle haut de gamme"
    ]
  },
  {
    numero: 7,
    titre: "G(V) — Réglementation nationale spécifique de l'activité de VTC",
    dureeHeures: 2,
    contenu: [
      "Conditions d'exercice spécifiques à l'activité VTC",
      "Carte professionnelle VTC : obtention, renouvellement, retrait",
      "Obligations en matière de véhicule (ancienneté, puissance, dimensions)",
      "Réglementation sur la prise en charge et la dépose",
      "Interdiction de la maraude et du stationnement sur la voie publique",
      "Tarification libre et obligations de transparence",
      "Articulation avec les autres modes de transport public particulier"
    ],
    objectifs: [
      "Maîtriser le cadre réglementaire spécifique VTC",
      "Connaître les obligations propres au conducteur VTC",
      "Distinguer les droits et limites de l'activité VTC"
    ]
  },
  MODULE_EXAMEN_BLANC,
  MODULE_PRATIQUE_CONDUITE
];
// Programme TAXI National conforme à l'arrêté du 6 avril 2017 modifié (2024) - Durée totale : 34 heures
// Nomenclature officielle des épreuves : A, B, C, D, E + F(T), G(T) + Pratique
export const PROGRAMME_TAXI: ModuleFormation[] = [
  {
    numero: 1,
    titre: "A — Réglementation du transport public particulier de personnes et prévention des discriminations et des violences sexuelles et sexistes",
    dureeHeures: 5,
    contenu: [
      "Réglementation s'appliquant aux différents modes de transports publics particuliers : taxis, VTC, VMDTR",
      "Réglementation relative à l'utilisation de la voie publique pour la prise en charge de la clientèle",
      "Obligations générales relatives aux véhicules taxi",
      "Conditions d'accès et d'exercice de la profession de conducteur de taxi",
      "Obligations de formation continue",
      "Composition et rôle des organismes administratifs, consultatifs et professionnels",
      "Agents susceptibles de procéder à des contrôles et leurs prérogatives",
      "Sanctions administratives et pénales encourues",
      "Règles relatives à la prise en charge des personnes à mobilité réduite",
      "Connaître les comportements constituant des infractions à caractère sexuel et/ou sexiste",
      "Connaître les discriminations listées à l'article 225-1 du code pénal ainsi que les peines encourues",
      "Connaître les acteurs au service de la prévention en matière de violences sexuelles et sexistes et de lutte contre les discriminations"
    ],
    objectifs: [
      "Maîtriser le cadre réglementaire du transport taxi",
      "Identifier les obligations légales du conducteur",
      "Connaître les sanctions encourues en cas d'infraction",
      "Prévenir et lutter contre les discriminations et les violences"
    ]
  },
  {
    numero: 2,
    titre: "B — Gestion",
    dureeHeures: 5,
    contenu: [
      "Principes de base de gestion et de comptabilité",
      "Obligations et documents comptables",
      "Charges entrant dans le calcul du coût de revient (fixes et variables)",
      "Détermination du produit d'exploitation, bénéfice, résultat, seuil de rentabilité",
      "Amortissement du véhicule et des équipements",
      "Différentes formes juridiques d'exploitation et leurs modes d'exploitation",
      "Régimes d'imposition et déclarations fiscales",
      "Régimes sociaux (régime général, indépendants)",
      "Devis et facturation pour la réalisation d'une prestation",
      "Calcul du coût de revient et de la marge"
    ],
    objectifs: [
      "Comprendre les principes de gestion d'une entreprise taxi",
      "Calculer sa rentabilité",
      "Maîtriser les obligations fiscales et sociales"
    ]
  },
  {
    numero: 3,
    titre: "C — Sécurité routière",
    dureeHeures: 5,
    contenu: [
      "Obligations en matière d'entretien et de visite technique des véhicules",
      "Mécanisme du permis à points",
      "Règles du code de la route : restrictions de circulation, limitations de vitesse",
      "Utilisation de la ceinture de sécurité",
      "Conduite rationnelle pour économiser le carburant et préserver l'environnement",
      "Règles de conduite à tenir en cas d'accident",
      "Risques liés à l'alcoolémie, stupéfiants, médicaments, stress, fatigue",
      "Règles de prudence pour préserver la sécurité",
      "Règles de sécurité concernant l'utilisation du téléphone"
    ],
    objectifs: [
      "Adopter une conduite sécuritaire et responsable",
      "Prévenir les risques d'accidents",
      "Réagir efficacement en situation d'urgence"
    ]
  },
  {
    numero: 4,
    titre: "D — Français (compréhension et expression)",
    dureeHeures: 5,
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
    titre: "E — Anglais",
    dureeHeures: 4,
    contenu: [
      "Accueil et salutations en anglais",
      "Vocabulaire professionnel du transport taxi",
      "Indications d'itinéraire et orientation",
      "Situations courantes de transport (aéroports, gares, hôtels)",
      "Gestion tarifaire et paiement en anglais",
      "Compréhension orale et expression",
      "Présentation touristique"
    ],
    objectifs: [
      "Accueillir une clientèle anglophone",
      "Communiquer dans les situations professionnelles courantes",
      "Comprendre et répondre aux demandes en anglais"
    ]
  },
  {
    numero: 6,
    titre: "F(T) — Connaissance du territoire et réglementation locale",
    dureeHeures: 4,
    contenu: [
      "Topographie et connaissance du territoire d'exercice",
      "Principaux axes routiers, monuments et sites d'intérêt",
      "Gares, aéroports, hôpitaux et lieux stratégiques",
      "Zones de stationnement taxi et emplacements réservés",
      "Réglementation locale spécifique au département",
      "Restrictions de circulation et ZFE (Zone à Faibles Émissions)",
      "Articulation entre réglementations nationales et locales"
    ],
    objectifs: [
      "Connaître le territoire d'exercice",
      "Maîtriser les principaux itinéraires et points d'intérêt",
      "Appliquer la réglementation locale"
    ]
  },
  {
    numero: 7,
    titre: "G(T) — Réglementation nationale de l'activité taxis et gestion propre à cette activité",
    dureeHeures: 4,
    contenu: [
      "Fonctionnement des équipements spéciaux obligatoires (taximètre, lumineux)",
      "Terminal de paiement électronique",
      "Régime des autorisations de stationnement (ADS)",
      "Règles de tarification d'une course taxi",
      "Activités complémentaires : services réguliers, TAP",
      "Détaxation partielle TICPE",
      "Réglementation relative à la taxe de stationnement"
    ],
    objectifs: [
      "Maîtriser les équipements spécifiques taxi",
      "Connaître le régime des ADS",
      "Appliquer correctement la tarification"
    ]
  },
  {
    numero: 8,
    titre: "Épreuve pratique d'admission",
    dureeHeures: 2,
    contenu: [
      "Conduite en sécurité et respect du code de la route",
      "Souplesse de la conduite assurant le confort des passagers",
      "Prise en charge et dépose des clients et de leurs bagages",
      "Présentation générale et attitude adaptées",
      "Accueil du client, comportement durant le parcours, prise de congé",
      "Vérification de l'état du véhicule avant et après la prestation",
      "Élaboration et suivi d'un parcours",
      "Utilisation des équipements spéciaux taxi",
      "Établissement du prix, facturation et encaissement"
    ],
    objectifs: [
      "Maîtriser la conduite professionnelle taxi",
      "Assurer un service client de qualité",
      "Utiliser correctement les équipements taxi"
    ]
  },
  MODULE_EXAMEN_BLANC
];
// Programme TAXI PARIS (75) - Arrêté du 6 avril 2017 modifié (2024) - Durée totale : 34 heures
// Nomenclature officielle : A, B, C, D, E + F(T) spécifique Paris, G(T) + Pratique
export const PROGRAMME_TAXI_75: ModuleFormation[] = [
  {
    numero: 1,
    titre: "A — Réglementation du transport public particulier de personnes et prévention des discriminations et des violences sexuelles et sexistes",
    dureeHeures: 5,
    contenu: [
      "Réglementation s'appliquant aux différents modes de transports publics particuliers : taxis, VTC, VMDTR",
      "Réglementation relative à l'utilisation de la voie publique pour la prise en charge de la clientèle",
      "Obligations générales relatives aux véhicules taxi",
      "Conditions d'accès et d'exercice de la profession de conducteur de taxi",
      "Obligations de formation continue",
      "Composition et rôle des organismes administratifs, consultatifs et professionnels",
      "Agents susceptibles de procéder à des contrôles et leurs prérogatives",
      "Sanctions administratives et pénales encourues",
      "Règles relatives à la prise en charge des personnes à mobilité réduite",
      "Connaître les comportements constituant des infractions à caractère sexuel et/ou sexiste",
      "Connaître les discriminations listées à l'article 225-1 du code pénal ainsi que les peines encourues",
      "Connaître les acteurs au service de la prévention en matière de violences sexuelles et sexistes et de lutte contre les discriminations"
    ],
    objectifs: [
      "Maîtriser le cadre réglementaire du transport taxi",
      "Identifier les obligations légales du conducteur",
      "Connaître les sanctions encourues en cas d'infraction",
      "Prévenir et lutter contre les discriminations et les violences"
    ]
  },
  {
    numero: 2,
    titre: "B — Gestion",
    dureeHeures: 4,
    contenu: [
      "Principes de base de gestion et de comptabilité",
      "Obligations et documents comptables",
      "Charges entrant dans le calcul du coût de revient (fixes et variables)",
      "Détermination du produit d'exploitation, bénéfice, résultat, seuil de rentabilité",
      "Amortissement du véhicule et des équipements",
      "Différentes formes juridiques d'exploitation et leurs modes d'exploitation",
      "Régimes d'imposition et déclarations fiscales",
      "Régimes sociaux (régime général, indépendants)",
      "Devis et facturation pour la réalisation d'une prestation"
    ],
    objectifs: [
      "Comprendre les principes de gestion d'une entreprise taxi",
      "Calculer sa rentabilité",
      "Maîtriser les obligations fiscales et sociales"
    ]
  },
  {
    numero: 3,
    titre: "C — Sécurité routière",
    dureeHeures: 4,
    contenu: [
      "Obligations en matière d'entretien et de visite technique des véhicules",
      "Mécanisme du permis à points",
      "Règles du code de la route : restrictions de circulation, limitations de vitesse",
      "Utilisation de la ceinture de sécurité",
      "Conduite rationnelle pour économiser le carburant et préserver l'environnement",
      "Règles de conduite à tenir en cas d'accident",
      "Risques liés à l'alcoolémie, stupéfiants, médicaments, stress, fatigue",
      "Règles de sécurité concernant l'utilisation du téléphone"
    ],
    objectifs: [
      "Adopter une conduite sécuritaire et responsable",
      "Prévenir les risques d'accidents",
      "Réagir efficacement en situation d'urgence"
    ]
  },
  {
    numero: 4,
    titre: "D — Français (compréhension et expression)",
    dureeHeures: 4,
    contenu: [
      "Accueil et présentation professionnelle",
      "Communication efficace avec la clientèle",
      "Vocabulaire professionnel du transport de personnes",
      "Compréhension et transmission d'informations",
      "Gestion des réclamations et situations conflictuelles",
      "Rédaction de messages professionnels"
    ],
    objectifs: [
      "Communiquer efficacement en français",
      "Adopter un langage professionnel adapté",
      "Gérer les situations difficiles avec diplomatie"
    ]
  },
  {
    numero: 5,
    titre: "E — Anglais",
    dureeHeures: 3,
    contenu: [
      "Accueil et salutations en anglais",
      "Vocabulaire professionnel du transport taxi",
      "Indications d'itinéraire et orientation",
      "Situations courantes de transport (aéroports, gares, hôtels)",
      "Gestion tarifaire et paiement en anglais",
      "Présentation touristique de Paris"
    ],
    objectifs: [
      "Accueillir une clientèle anglophone",
      "Communiquer dans les situations professionnelles courantes",
      "Présenter les sites touristiques parisiens"
    ]
  },
  {
    numero: 6,
    titre: "F(T) — Connaissance du territoire Paris (75) et réglementation locale",
    dureeHeures: 5,
    contenu: [
      "Topographie de Paris : arrondissements, quartiers, limites administratives",
      "Principaux monuments et sites touristiques de Paris",
      "Gares parisiennes et aéroports de la région",
      "Hôpitaux, administrations et lieux stratégiques",
      "Axes routiers principaux, périphérique et portes de Paris",
      "Zones de stationnement taxi et emplacements réservés",
      "Réglementation locale spécifique à Paris",
      "Restrictions de circulation et ZFE (Zone à Faibles Émissions)"
    ],
    objectifs: [
      "Connaître parfaitement le territoire parisien",
      "Maîtriser les principaux itinéraires et points d'intérêt",
      "Appliquer la réglementation locale Paris"
    ]
  },
  {
    numero: 7,
    titre: "G(T) — Réglementation nationale de l'activité taxis et gestion propre à cette activité",
    dureeHeures: 4,
    contenu: [
      "Fonctionnement des équipements spéciaux obligatoires (taximètre, lumineux)",
      "Terminal de paiement électronique",
      "Articulation entre réglementations nationales et locales",
      "Régime des autorisations de stationnement (ADS)",
      "Règles de tarification d'une course taxi parisien",
      "Activités complémentaires : services réguliers, TAP",
      "Détaxation partielle TICPE",
      "Réglementation relative à la taxe de stationnement"
    ],
    objectifs: [
      "Maîtriser les équipements spécifiques taxi",
      "Connaître le régime des ADS parisien",
      "Appliquer correctement la tarification parisienne"
    ]
  },
  {
    numero: 8,
    titre: "Épreuve pratique d'admission",
    dureeHeures: 2,
    contenu: [
      "Conduite en sécurité dans Paris et respect du code de la route",
      "Souplesse de la conduite assurant le confort des passagers",
      "Prise en charge et dépose des clients (aéroports, gares)",
      "Présentation générale et attitude adaptées",
      "Élaboration et suivi d'un parcours parisien",
      "Informations touristiques et pratiques sur Paris",
      "Utilisation des équipements spéciaux taxi",
      "Établissement du prix, facturation et encaissement"
    ],
    objectifs: [
      "Maîtriser la conduite professionnelle taxi à Paris",
      "Assurer un service client de qualité",
      "Délivrer des informations touristiques pertinentes"
    ]
  },
  {
    numero: 9,
    titre: "Prévention et lutte contre la traite des êtres humains et le harcèlement et agressions sexuels",
    dureeHeures: 1,
    contenu: [
      "Définitions : traite des êtres humains, harcèlement, agressions sexuelles",
      "Signaux d'alerte et situations à risque",
      "Obligations légales de signalement",
      "Numéros d'urgence : 119 (enfance), 3919 (violences), 17 (police)",
      "Procédures de signalement et protection des victimes"
    ],
    objectifs: [
      "Reconnaître les situations de danger",
      "Connaître ses obligations de signalement",
      "Savoir réagir face à ces situations"
    ]
  },
  MODULE_EXAMEN_BLANC
];
// Programme VMDTR conforme 2024 - Durée totale : 34 heures
// Nomenclature alignée sur l'arrêté du 6 avril 2017 (adaptation VMDTR)
export const PROGRAMME_VMDTR: ModuleFormation[] = [
  {
    numero: 1,
    titre: "A — Réglementation du transport public particulier de personnes et prévention des discriminations et des violences sexuelles et sexistes",
    dureeHeures: 6,
    contenu: [
      "Cadre réglementaire du VMDTR",
      "Différences avec le transport à 4 roues (taxi, VTC)",
      "Conditions d'accès et d'exercice de la profession VMDTR",
      "Obligations du conducteur VMDTR",
      "Documents obligatoires à bord",
      "Sanctions administratives et pénales applicables",
      "Règles relatives à la prise en charge des personnes à mobilité réduite",
      "Connaître les comportements constituant des infractions à caractère sexuel et/ou sexiste",
      "Connaître les discriminations listées à l'article 225-1 du code pénal ainsi que les peines encourues",
      "Connaître les acteurs au service de la prévention en matière de violences sexuelles et sexistes et de lutte contre les discriminations"
    ],
    objectifs: [
      "Maîtriser le cadre réglementaire du transport VMDTR",
      "Identifier les obligations légales du conducteur",
      "Prévenir et lutter contre les discriminations et les violences"
    ]
  },
  {
    numero: 2,
    titre: "B — Gestion",
    dureeHeures: 4,
    contenu: [
      "Statuts juridiques adaptés à l'activité VMDTR",
      "Investissement et coûts spécifiques deux-roues",
      "Assurances professionnelles et garanties obligatoires",
      "Obligations comptables et charges sociales",
      "Tarification et calcul de la rentabilité",
      "Développement commercial et fidélisation"
    ],
    objectifs: [
      "Comprendre les statuts juridiques adaptés",
      "Calculer sa rentabilité",
      "Maîtriser les obligations comptables"
    ]
  },
  {
    numero: 3,
    titre: "C — Sécurité routière spécifique deux-roues",
    dureeHeures: 6,
    contenu: [
      "Conduite défensive spécifique deux-roues",
      "Risques spécifiques moto/scooter en milieu urbain",
      "Équipements de protection obligatoires (conducteur et passager)",
      "Conduite par conditions difficiles (pluie, nuit, vent)",
      "Transport de passagers en deux-roues : règles de sécurité",
      "Anticipation, visibilité et positionnement sur la chaussée",
      "Entretien et vérification du véhicule deux-roues"
    ],
    objectifs: [
      "Adopter une conduite sécuritaire en deux-roues",
      "Garantir la sécurité du passager",
      "Prévenir les risques spécifiques au deux-roues"
    ]
  },
  {
    numero: 4,
    titre: "D — Français (compréhension et expression)",
    dureeHeures: 6,
    contenu: [
      "Communication adaptée au contexte VMDTR",
      "Accueil et professionnalisme",
      "Gestion de la relation client spécifique au deux-roues",
      "Instructions de sécurité au passager",
      "Vocabulaire professionnel du transport de personnes"
    ],
    objectifs: [
      "Communiquer efficacement en français",
      "Adopter un langage professionnel adapté",
      "Transmettre les consignes de sécurité au passager"
    ]
  },
  {
    numero: 5,
    titre: "E — Anglais",
    dureeHeures: 6,
    contenu: [
      "Vocabulaire professionnel VMDTR en anglais",
      "Instructions de sécurité en anglais",
      "Communication avec une clientèle anglophone",
      "Informations touristiques en anglais",
      "Situations courantes de transport"
    ],
    objectifs: [
      "Accueillir une clientèle anglophone",
      "Communiquer les consignes de sécurité en anglais",
      "Assurer un service professionnel en anglais"
    ]
  },
  {
    numero: 6,
    titre: "F(M) — Sécurité routière spécifique à l'usage et à la conduite de motocyclettes",
    dureeHeures: 4,
    contenu: [
      "Spécificités de la conduite de motocyclette avec passager",
      "Réglementation routière applicable aux deux-roues motorisés",
      "Équipements de sécurité obligatoires et recommandés",
      "Techniques de freinage d'urgence et d'évitement",
      "Gestion des situations d'urgence en deux-roues"
    ],
    objectifs: [
      "Maîtriser la conduite professionnelle en motocyclette",
      "Garantir la sécurité du conducteur et du passager",
      "Réagir efficacement en situation d'urgence"
    ]
  },
  {
    numero: 7,
    titre: "G(M) — Prise en charge du passager",
    dureeHeures: 2,
    contenu: [
      "Accueil et installation du passager",
      "Équipements de protection à fournir au passager",
      "Briefing de sécurité avant départ",
      "Confort et communication pendant le trajet",
      "Dépose sécurisée du passager"
    ],
    objectifs: [
      "Assurer un accueil professionnel",
      "Garantir la sécurité et le confort du passager",
      "Maîtriser le protocole de prise en charge"
    ]
  },
  MODULE_EXAMEN_BLANC,
  MODULE_PRATIQUE_CONDUITE
];

// ═══════════════════════════════════════════════════════════════════
// PROGRAMMES DE FORMATION CONTINUE (14h — arrêté du 11 août 2017)
// 4 blocs de 3h30 : modules A, B, C obligatoires + 1 module au choix.
// Seul le module B (réglementation spécifique) change selon le métier.
// ═══════════════════════════════════════════════════════════════════

// Module A — commun Taxi / VTC / VMDTR
const MODULE_CONTINUE_A: ModuleFormation = {
  numero: 1,
  titre: "A — Droit du transport public particulier de personnes",
  dureeHeures: 3.5,
  contenu: [
    "Évolutions récentes du cadre légal du T3P (Code des transports, décret n°2017-483)",
    "Acteurs et organismes : préfecture, Chambre de Métiers et de l'Artisanat, organisations professionnelles",
    "Conditions d'accès et d'exercice, obligations du conducteur",
    "Agents habilités au contrôle et prérogatives ; sanctions administratives et pénales",
    "Prévention des discriminations (art. 225-1 du Code pénal) et des violences sexuelles et sexistes",
  ],
  objectifs: [
    "Situer son activité dans le cadre réglementaire actualisé",
    "Identifier ses obligations et les sanctions encourues",
  ],
  methodologie: ["Apport théorique", "Étude de cas à partir de situations réelles"],
  evaluation: ["QCM de fin de module"],
};

// Module C — commun Taxi / VTC / VMDTR
const MODULE_CONTINUE_C: ModuleFormation = {
  numero: 3,
  titre: "C — Sécurité routière",
  dureeHeures: 3.5,
  contenu: [
    "Facteurs de risque du transport de personnes : fatigue, vigilance, distracteurs",
    "Éco-conduite et entretien préventif du véhicule",
    "Gestion des conflits et des situations difficiles avec la clientèle",
    "Conduite à tenir et premiers réflexes en cas d'accident",
  ],
  objectifs: [
    "Adopter les comportements de sécurité adaptés à une activité professionnelle",
    "Réagir de manière adaptée en situation d'urgence",
  ],
  methodologie: ["Ateliers", "Supports vidéo", "Échanges de pratiques"],
  evaluation: ["Grille d'observation en atelier"],
};

// Module au choix (E par défaut — configurable : D anglais / F secourisme PSC1)
const MODULE_CONTINUE_CHOIX: ModuleFormation = {
  numero: 4,
  titre: "Module au choix — E : Gestion et développement commercial (dont nouvelles technologies)",
  dureeHeures: 3.5,
  contenu: [
    "Relation client, fidélisation et gestion des avis en ligne",
    "Applications, plateformes de réservation et outils numériques",
    "Bases de gestion : facturation, suivi du chiffre d'affaires, coût de revient",
    "Développement de son activité et de sa clientèle",
  ],
  objectifs: [
    "Mobiliser des outils numériques pour développer son activité",
    "Piloter les bases de gestion de son entreprise",
  ],
  methodologie: ["Atelier numérique", "Élaboration d'un plan d'action individuel"],
  evaluation: ["Plan d'action individuel"],
};

const makeModuleContinueB = (metier: string, contenu: string[]): ModuleFormation => ({
  numero: 2,
  titre: `B — Réglementation spécifique à l'activité ${metier}`,
  dureeHeures: 3.5,
  contenu,
  objectifs: [`Appliquer les règles propres à l'activité ${metier}`],
  methodologie: ["Cas pratiques", "Mises en situation"],
  evaluation: ["Mise en situation notée"],
});

export const PROGRAMME_CONTINUE_TAXI: ModuleFormation[] = [
  MODULE_CONTINUE_A,
  makeModuleContinueB("taxi", [
    "Tarification et fonctionnement du taximètre ; contrôle des équipements",
    "Stationnement, maraude, autorisation de stationnement (ADS)",
    "Course, prise en charge et obligations envers le client",
    "Taxi conventionné (transport de malades assis, CPAM)",
  ]),
  MODULE_CONTINUE_C,
  MODULE_CONTINUE_CHOIX,
];

export const PROGRAMME_CONTINUE_VTC: ModuleFormation[] = [
  MODULE_CONTINUE_A,
  makeModuleContinueB("VTC", [
    "Obligations spécifiques VTC : réservation préalable, interdiction de la maraude",
    "Signalétique, carte professionnelle et registre VTC",
    "Retour au lieu de stationnement ou d'établissement",
    "Relations avec les plateformes de mise en relation",
  ]),
  MODULE_CONTINUE_C,
  MODULE_CONTINUE_CHOIX,
];

export const PROGRAMME_CONTINUE_VMDTR: ModuleFormation[] = [
  MODULE_CONTINUE_A,
  makeModuleContinueB("VMDTR (moto-taxi)", [
    "Obligations spécifiques au véhicule motorisé à deux ou trois roues",
    "Équipements de sécurité obligatoires (conducteur et passager)",
    "Réservation préalable et conditions de prise en charge",
    "Signalétique et carte professionnelle VMDTR",
  ]),
  MODULE_CONTINUE_C,
  MODULE_CONTINUE_CHOIX,
];

// ═══════════════════════════════════════════════════════════════════
// PROGRAMMES DE MOBILITÉ TAXI (arrêté du 11 août 2017, art. 2)
// Permet à un conducteur de taxi d'exercer dans un autre département.
// 2 modules : connaissance du territoire + réglementation locale.
// Paris (75) : 35h (zone taxi parisienne, plus dense). Autres dép. : 14h.
// ═══════════════════════════════════════════════════════════════════

export type MobiliteDept = "75" | "92";

export const PROGRAMME_MOBILITE_75: ModuleFormation[] = [
  {
    numero: 1,
    titre: "A — Connaissance du territoire parisien",
    dureeHeures: 21,
    contenu: [
      "Topographie de Paris : arrondissements, quartiers, axes principaux",
      "Gares, aéroports, monuments et pôles touristiques majeurs",
      "Points d'intérêt, hôpitaux, palais des congrès et sites d'affaires",
      "Recherche et optimisation d'itinéraires en zone dense",
    ],
    objectifs: [
      "Se repérer et optimiser ses trajets dans Paris intra-muros",
      "Orienter et informer une clientèle française et internationale",
    ],
    methodologie: ["Étude de plans", "Cas d'itinéraires", "Mises en situation"],
    evaluation: ["Test de connaissance du territoire"],
  },
  {
    numero: 2,
    titre: "B — Réglementation locale parisienne",
    dureeHeures: 14,
    contenu: [
      "Règlement des taxis parisiens et zone des taxis parisiens",
      "Autorisations de stationnement (ADS) et stations de la zone parisienne",
      "Tarifs et modalités fixés par la Préfecture de Police de Paris",
      "Obligations spécifiques de contrôle et de comportement à Paris",
    ],
    objectifs: [
      "Appliquer la réglementation propre à la zone des taxis parisiens",
      "Respecter les règles de stationnement et de tarification de Paris",
    ],
    methodologie: ["Apport réglementaire", "Étude de cas"],
    evaluation: ["QCM réglementation locale"],
  },
];

export const PROGRAMME_MOBILITE_92: ModuleFormation[] = [
  {
    numero: 1,
    titre: "A — Connaissance du territoire des Hauts-de-Seine (92)",
    dureeHeures: 7,
    contenu: [
      "Géographie des Hauts-de-Seine : communes, pôles (La Défense, Boulogne, Nanterre…)",
      "Axes routiers, gares et liaisons avec Paris et les aéroports",
      "Points d'intérêt économiques, hospitaliers et administratifs du département",
    ],
    objectifs: [
      "Se repérer et optimiser ses trajets dans les Hauts-de-Seine",
      "Informer la clientèle sur les liaisons du département",
    ],
    methodologie: ["Étude de plans", "Cas d'itinéraires"],
    evaluation: ["Test de connaissance du territoire"],
  },
  {
    numero: 2,
    titre: "B — Réglementation locale des Hauts-de-Seine",
    dureeHeures: 7,
    contenu: [
      "Règlement départemental des taxis des Hauts-de-Seine",
      "Autorisations de stationnement (ADS) et communes de rattachement",
      "Tarifs et modalités fixés par la Préfecture des Hauts-de-Seine",
      "Obligations spécifiques de contrôle dans le département",
    ],
    objectifs: [
      "Appliquer la réglementation propre aux Hauts-de-Seine",
      "Respecter le stationnement et la tarification départementale",
    ],
    methodologie: ["Apport réglementaire", "Étude de cas"],
    evaluation: ["QCM réglementation locale"],
  },
];

export const getProgrammeMobilite = (dept: MobiliteDept): ModuleFormation[] =>
  dept === "75" ? PROGRAMME_MOBILITE_75 : PROGRAMME_MOBILITE_92;

export const PREREQUIS_MOBILITE = [
  "Être titulaire de la carte professionnelle de conducteur de taxi en cours de validité",
  "Souhaiter exercer l'activité de taxi dans un nouveau département",
];

export const OBJECTIFS_MOBILITE = [
  "Maîtriser la connaissance du territoire du département d'exercice visé",
  "Appliquer la réglementation locale des taxis propre à ce département",
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

export const OBJECTIFS_TAXI_75 = [
  "Maîtriser la réglementation spécifique au transport taxi parisien",
  "Connaître parfaitement le territoire de Paris (75)",
  "Comprendre le fonctionnement économique de l'activité taxi",
  "Adopter une conduite professionnelle adaptée à l'environnement urbain parisien",
  "Communiquer efficacement en français et en anglais avec une clientèle internationale",
  "Respecter les obligations de non-discrimination",
  "Exercer un rôle de vigilance contre les violences et la traite",
  "Réussir l'examen taxi de la Chambre des Métiers et de l'Artisanat de Paris"
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
    case "TAXI-75":
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
  },
  TAXI: {
    journee: 990,
    soiree: 1090,
  },
  "TAXI-75": {
    journee: 990,
    soiree: 1090,
  },
  VMDTR: {
    journee: 990,
    soiree: 1090,
  },
  RECUPERATION_POINTS: {
    standard: 250
  }
} as const;

// ═══════════════════════════════════════════════════════════════════
// FORMULES DE FORMATION (offre réelle)
// ═══════════════════════════════════════════════════════════════════

export const FORMULES = {
  soiree: {
    label: "Formule Soir",
    dureeHeures: 33,
    conduiteIncluse: 2,
    description: "33 heures dont 2 heures de conduite incluses",
  },
  journee: {
    label: "Formule Journée",
    dureeHeures: 40,
    conduiteIncluse: 2,
    description: "40 heures dont 2 heures de conduite incluses",
  },
  examen_blanc: {
    label: "Examen blanc final",
    dureeHeures: 3,
    conduiteIncluse: 0,
    description: "3 heures d'examen blanc en conditions réelles (dernier samedi, 14h-17h)",
  },
} as const;

// ═══════════════════════════════════════════════════════════════════
// HORAIRES TYPES
// ═══════════════════════════════════════════════════════════════════

export const HORAIRES = {
  // Formule journée : 1 semaine, 9h30-12h30 et 13h30-16h30 (30h)
  journee: {
    matin: "9h30 - 12h30",
    apresMidi: "13h30 - 16h30"
  },
  // Formule soir : 2 semaines, bloc unique 18h-21h30 (35h)
  soiree: {
    matin: "18h00 - 21h30",
    apresMidi: ""
  },
} as const;

// ═══════════════════════════════════════════════════════════════════
// TYPES TYPESCRIPT
// ═══════════════════════════════════════════════════════════════════

export type TypeFormation = "VTC" | "TAXI" | "TAXI-75" | "VMDTR" | "RECUPERATION_POINTS";

/** Initiale (préparation examen carte pro) ou continue (renouvellement 14h). */
export type FormationMode = "initiale" | "continue";

/** Prérequis communs à toutes les formations continues T3P. */
export const PREREQUIS_CONTINUE = [
  "Être titulaire de la carte professionnelle T3P correspondante en cours de validité",
  "Exercer ou avoir exercé l'activité de conducteur de transport public particulier de personnes",
];

/** Objectifs de la formation continue (renouvellement quinquennal). */
export const OBJECTIFS_CONTINUE = [
  "Actualiser ses connaissances de la réglementation du transport public particulier de personnes",
  "Appliquer la réglementation spécifique à son métier dans sa pratique quotidienne",
  "Adopter les comportements de sécurité routière adaptés à l'activité",
  "Mobiliser des outils de gestion et de développement de son activité",
];
export type Modalite = "journée" | "soirée";
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

export const getProgramme = (type: TypeFormation, mode: FormationMode = "initiale"): ModuleFormation[] => {
  if (mode === "continue") {
    switch (type) {
      case "VTC":
        return PROGRAMME_CONTINUE_VTC;
      case "VMDTR":
        return PROGRAMME_CONTINUE_VMDTR;
      case "TAXI":
      case "TAXI-75":
        return PROGRAMME_CONTINUE_TAXI;
      default:
        return [];
    }
  }
  switch (type) {
    case "VTC":
      return PROGRAMME_VTC;
    case "TAXI":
      return PROGRAMME_TAXI;
    case "TAXI-75":
      return PROGRAMME_TAXI_75;
    case "VMDTR":
      return PROGRAMME_VMDTR;
    default:
      return [];
  }
};

export const getPrerequis = (type: TypeFormation, mode: FormationMode = "initiale"): string[] => {
  if (mode === "continue") return PREREQUIS_CONTINUE;
  switch (type) {
    case "VTC":
      return PREREQUIS_VTC;
    case "TAXI":
    case "TAXI-75":
      return PREREQUIS_TAXI;
    case "VMDTR":
      return PREREQUIS_VMDTR;
    default:
      return [];
  }
};

export const getObjectifs = (type: TypeFormation, mode: FormationMode = "initiale"): string[] => {
  if (mode === "continue") return OBJECTIFS_CONTINUE;
  switch (type) {
    case "VTC":
      return OBJECTIFS_VTC;
    case "TAXI":
      return OBJECTIFS_TAXI;
    case "TAXI-75":
      return OBJECTIFS_TAXI_75;
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
  PROGRAMME_TAXI_75,
  PROGRAMME_VMDTR,
  PREREQUIS_VTC,
  PREREQUIS_TAXI,
  PREREQUIS_VMDTR,
  OBJECTIFS_VTC,
  OBJECTIFS_TAXI,
  OBJECTIFS_TAXI_75,
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
