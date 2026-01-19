// ============================================================
// RÈGLEMENT INTÉRIEUR - Template pour génération PDF
// Établi conformément aux articles L.6352-3 et suivants et 
// R.6352-1 à R.6352-15 du Code du travail
// ============================================================

import { ORGANISME } from '@/constants/formations';

export interface SousArticle {
  numero: string;
  titre: string;
  contenu: string[];
}

export interface Article {
  numero: number;
  titre: string;
  contenu?: string[];
  sous_articles?: SousArticle[];
}

export interface ReglementInterieur {
  titre: string;
  reference_legale: string;
  date_application: string;
  preambule: string[];
  articles: Article[];
  signataire: {
    nom: string;
    fonction: string;
  };
}

export const REGLEMENT_INTERIEUR: ReglementInterieur = {
  titre: "RÈGLEMENT INTÉRIEUR",
  reference_legale: "Articles L.6352-3 et suivants et R.6352-1 à R.6352-15 du Code du travail",
  date_application: "01/01/2026",
  
  preambule: [
    `Le présent règlement s'applique à tous les stagiaires inscrits à une formation dispensée par ${ORGANISME.nom}, et ce pour toute la durée de la formation suivie.`,
    "Conformément à la réglementation en vigueur, le règlement intérieur a pour objet de définir les règles d'hygiène et de sécurité, les règles générales et permanentes relatives à la discipline ainsi que la nature et l'échelle des sanctions applicables aux stagiaires ainsi que les garanties procédurales."
  ],
  
  articles: [
    {
      numero: 1,
      titre: "CHAMP D'APPLICATION",
      contenu: [
        `Le présent règlement s'applique à l'ensemble des stagiaires inscrits à une session de formation organisée par ${ORGANISME.nom}, quels que soient :`,
        "• Le type de formation suivie",
        "• La durée de la formation",
        "• Le mode de financement"
      ]
    },
    {
      numero: 2,
      titre: "DISPOSITIONS GÉNÉRALES",
      sous_articles: [
        {
          numero: "2.1",
          titre: "Principes généraux",
          contenu: [
            "Chaque stagiaire est tenu de respecter :",
            "• Les dispositions du présent règlement intérieur",
            "• Les instructions données par la direction et les formateurs",
            "• Les consignes générales et particulières de sécurité",
            "• Les règles d'hygiène applicables aux locaux"
          ]
        },
        {
          numero: "2.2",
          titre: "Laïcité et neutralité",
          contenu: [
            "Conformément aux principes de laïcité et de neutralité du service public, le port de signes ou de tenues par lesquels les stagiaires manifestent ostensiblement une appartenance religieuse est interdit dans l'enceinte de l'établissement."
          ]
        },
        {
          numero: "2.3",
          titre: "Respect et non-discrimination",
          contenu: [
            "Aucun stagiaire ne doit subir de discrimination, quelle qu'en soit la nature, au sens de l'article L.1132-1 du Code du travail (origine, sexe, religion, orientation sexuelle, handicap, etc.).",
            "Tout comportement discriminatoire, raciste, sexiste ou homophobe est strictement interdit et passible de sanctions, pouvant aller jusqu'à l'exclusion définitive."
          ]
        }
      ]
    },
    {
      numero: 3,
      titre: "RÈGLES D'HYGIÈNE ET DE SÉCURITÉ",
      sous_articles: [
        {
          numero: "3.1",
          titre: "Hygiène",
          contenu: [
            "Les stagiaires doivent :",
            "• Se présenter en formation dans un état de propreté corporelle conforme aux règles d'hygiène élémentaires",
            "• Maintenir en état de propreté les locaux et le matériel mis à disposition",
            "• Ne pas introduire de nourriture ou boissons dans les salles de formation (sauf bouteille d'eau)",
            "• Utiliser les espaces de restauration dédiés"
          ]
        },
        {
          numero: "3.2",
          titre: "Sécurité - Consignes générales",
          contenu: [
            "Les stagiaires doivent :",
            "• Respecter les consignes de sécurité incendie affichées dans les locaux",
            "• Signaler immédiatement tout incident ou accident au responsable de formation",
            "• Ne pas pénétrer dans les locaux en état d'ivresse ou sous l'emprise de stupéfiants",
            "• Ne pas entraver les voies de circulation, les sorties de secours et l'accès au matériel de lutte contre l'incendie",
            "• Participer aux exercices d'évacuation"
          ]
        },
        {
          numero: "3.3",
          titre: "Sécurité incendie",
          contenu: [
            "En cas d'alarme incendie :",
            "• Évacuer calmement les locaux par les issues de secours",
            "• Se diriger vers le point de rassemblement indiqué",
            "• Ne pas utiliser les ascenseurs",
            "• Ne jamais revenir en arrière",
            "• Attendre les instructions du responsable de sécurité"
          ]
        },
        {
          numero: "3.4",
          titre: "Secours",
          contenu: [
            "Numéros d'urgence affichés :",
            "• SAMU : 15",
            "• Pompiers : 18",
            "• Police : 17",
            "• Numéro d'urgence européen : 112",
            "",
            "Une trousse de premiers secours est disponible à l'accueil."
          ]
        },
        {
          numero: "3.5",
          titre: "Interdiction de fumer et de vapoter",
          contenu: [
            "Il est strictement interdit de fumer (cigarettes, cigarettes électroniques, vapoteuses) dans l'ensemble des locaux de formation, conformément au décret n°2006-1386 du 15 novembre 2006.",
            "Un espace fumeurs est mis à disposition à l'extérieur du bâtiment."
          ]
        },
        {
          numero: "3.6",
          titre: "Accident",
          contenu: [
            "Tout accident ou incident survenu pendant la formation ou sur le trajet doit être immédiatement déclaré à l'organisme de formation, qui établira une déclaration d'accident."
          ]
        }
      ]
    },
    {
      numero: 4,
      titre: "DISCIPLINE GÉNÉRALE",
      sous_articles: [
        {
          numero: "4.1",
          titre: "Horaires et assiduité",
          contenu: [
            "Les stagiaires doivent :",
            "• Respecter scrupuleusement les horaires de formation",
            "• Signer la feuille d'émargement à chaque demi-journée",
            "• En cas d'absence ou de retard, prévenir l'organisme dans les meilleurs délais",
            "• Fournir un justificatif d'absence dans les 48 heures",
            "",
            "Toute absence non justifiée pourra entraîner :",
            "• La non-délivrance de l'attestation de formation",
            "• L'impossibilité de se présenter à l'examen",
            "• La facturation des heures non suivies"
          ]
        },
        {
          numero: "4.2",
          titre: "Accès aux locaux",
          contenu: [
            "L'accès aux locaux de formation est autorisé uniquement :",
            "• Pendant les horaires de formation",
            "• Pour les personnes dûment inscrites",
            "",
            "Toute personne extérieure doit se présenter à l'accueil."
          ]
        },
        {
          numero: "4.3",
          titre: "Comportement",
          contenu: [
            "Les stagiaires doivent adopter un comportement respectueux envers :",
            "• Les formateurs et le personnel de l'organisme",
            "• Les autres stagiaires",
            "• Les locaux et le matériel mis à disposition",
            "",
            "Sont notamment interdits :",
            "• Les comportements agressifs, violents ou menaçants",
            "• Les injures, insultes ou propos discriminatoires",
            "• Le harcèlement sous toutes ses formes",
            "• Les dégradations volontaires",
            "• Le vol"
          ]
        },
        {
          numero: "4.4",
          titre: "Tenue vestimentaire",
          contenu: [
            "Les stagiaires doivent porter une tenue décente, propre et adaptée à un contexte professionnel de formation.",
            "Le port de couvre-chef est interdit dans les salles de formation (sauf prescription médicale)."
          ]
        },
        {
          numero: "4.5",
          titre: "Utilisation des équipements",
          contenu: [
            "Téléphones portables et appareils électroniques :",
            "• Doivent être éteints ou en mode silencieux pendant les cours",
            "• Peuvent être utilisés uniquement pendant les pauses",
            "• Les photos et enregistrements sont interdits sans autorisation expresse",
            "",
            "Matériel informatique :",
            "• Utilisation autorisée uniquement dans le cadre pédagogique",
            "• Interdiction de télécharger des contenus illégaux ou inappropriés",
            "• Respect de la charte informatique"
          ]
        },
        {
          numero: "4.6",
          titre: "Supports pédagogiques",
          contenu: [
            "Les supports de cours fournis sont :",
            "• Strictement réservés à un usage personnel",
            "• Protégés par le droit d'auteur",
            "• Ne peuvent être reproduits, diffusés ou commercialisés sans autorisation"
          ]
        },
        {
          numero: "4.7",
          titre: "Consommation de substances",
          contenu: [
            "Il est strictement interdit :",
            "• De consommer de l'alcool dans l'enceinte de l'établissement",
            "• De se présenter en formation sous l'emprise d'alcool ou de stupéfiants",
            "• De consommer ou détenir des substances illicites",
            "",
            "Tout manquement sera sanctionné par une exclusion immédiate."
          ]
        }
      ]
    },
    {
      numero: 5,
      titre: "REPRÉSENTATION DES STAGIAIRES",
      contenu: [
        "Conformément à l'article L.6352-6 du Code du travail, pour les formations d'une durée supérieure à 500 heures, il est procédé simultanément à l'élection d'un délégué titulaire et d'un délégué suppléant au scrutin uninominal à deux tours.",
        "",
        "Les stagiaires ainsi élus peuvent :",
        "• Présenter toute réclamation relative à la formation",
        "• Faire des suggestions pour améliorer le déroulement de la formation"
      ]
    },
    {
      numero: 6,
      titre: "SANCTIONS ET PROCÉDURES DISCIPLINAIRES",
      sous_articles: [
        {
          numero: "6.1",
          titre: "Nature des sanctions",
          contenu: [
            "Tout manquement du stagiaire à l'une des prescriptions du présent règlement intérieur pourra faire l'objet d'une sanction.",
            "",
            "Constitue une sanction toute mesure, autre que les observations verbales, prise par le responsable de l'organisme de formation à la suite d'un agissement du stagiaire considéré par lui comme fautif.",
            "",
            "Les sanctions applicables sont, par ordre croissant de gravité :",
            "1. Rappel à l'ordre oral",
            "2. Avertissement écrit",
            "3. Exclusion temporaire (1 à 3 jours)",
            "4. Exclusion définitive de la formation"
          ]
        },
        {
          numero: "6.2",
          titre: "Échelle des sanctions selon la gravité des faits",
          contenu: [
            "Manquements mineurs (rappel à l'ordre ou avertissement) :",
            "• Retards répétés non justifiés",
            "• Non-respect des horaires",
            "• Utilisation du téléphone en cours",
            "• Tenue non appropriée",
            "",
            "Manquements graves (exclusion temporaire) :",
            "• Absences répétées non justifiées",
            "• Comportement perturbateur",
            "• Non-respect des consignes de sécurité",
            "• Dégradation légère du matériel",
            "",
            "Manquements très graves (exclusion définitive) :",
            "• Violence physique ou verbale",
            "• Harcèlement ou discrimination",
            "• État d'ivresse ou consommation de stupéfiants",
            "• Vol ou dégradation volontaire grave",
            "• Fraude à l'examen",
            "• Récidive après exclusion temporaire"
          ]
        },
        {
          numero: "6.3",
          titre: "Procédure disciplinaire",
          contenu: [
            "Pour les sanctions autres que l'exclusion définitive :",
            "",
            "Aucune sanction ne peut être infligée au stagiaire sans que celui-ci ait été informé au préalable des griefs retenus contre lui.",
            "",
            "Lorsque le responsable de l'organisme de formation envisage de prendre une sanction, il convoque le stagiaire par lettre recommandée avec AR ou remise en main propre contre décharge en lui indiquant l'objet de la convocation.",
            "",
            "Lors de l'entretien, le stagiaire peut :",
            "• Se faire assister par une personne de son choix (stagiaire ou salarié de l'organisme)",
            "• Présenter ses explications",
            "",
            "La sanction ne peut intervenir moins d'un jour franc ni plus de 15 jours après l'entretien.",
            "",
            "Elle fait l'objet d'une décision écrite et motivée, notifiée au stagiaire par lettre recommandée avec AR ou remise en main propre.",
            "",
            "Pour l'exclusion définitive :",
            "",
            "L'exclusion définitive ne peut être prononcée que par le responsable de l'organisme.",
            "",
            "La procédure est identique à celle décrite ci-dessus, mais le délai avant notification est porté à 2 jours francs minimum.",
            "",
            "Le stagiaire est informé qu'il dispose d'un délai de 8 jours pour présenter ses observations écrites.",
            "",
            "En cas d'exclusion définitive :",
            "• Le stagiaire n'obtient pas l'attestation de formation",
            "• Les sommes versées restent acquises à l'organisme (sauf faute de l'organisme)",
            "• L'organisme peut demander des dommages-intérêts en cas de préjudice"
          ]
        },
        {
          numero: "6.4",
          titre: "Exclusion immédiate pour motif de sécurité",
          contenu: [
            "En cas de faute grave portant atteinte à la sécurité des personnes ou des biens, le responsable de formation peut prononcer une exclusion immédiate à titre conservatoire.",
            "",
            "Cette mesure ne préjuge pas de la sanction définitive qui sera prise après application de la procédure disciplinaire."
          ]
        }
      ]
    },
    {
      numero: 7,
      titre: "PROTECTION DES DONNÉES PERSONNELLES (RGPD)",
      contenu: [
        "Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés :",
        "",
        "Les données personnelles collectées sont utilisées uniquement pour :",
        "• La gestion administrative et pédagogique de la formation",
        "• Les obligations réglementaires (déclarations, contrôles)",
        "• L'amélioration de nos services",
        "",
        "Durée de conservation : 3 ans après la fin de la formation.",
        "",
        "Droits des stagiaires :",
        "• Droit d'accès, de rectification et de suppression",
        "• Droit d'opposition et de limitation du traitement",
        "• Droit à la portabilité des données",
        "",
        `Contact : ${ORGANISME.email}`
      ]
    },
    {
      numero: 8,
      titre: "PUBLICITÉ DU RÈGLEMENT",
      contenu: [
        "Un exemplaire du présent règlement est remis à chaque stagiaire lors de son inscription.",
        "",
        "Il est également :",
        "• Affiché dans les locaux de formation",
        "• Disponible sur demande à l'accueil",
        "• Consultable sur notre site internet"
      ]
    },
    {
      numero: 9,
      titre: "MODIFICATION DU RÈGLEMENT",
      contenu: [
        `Le présent règlement peut être modifié à tout moment par la direction de ${ORGANISME.nom}.`,
        "",
        "Toute modification sera portée à la connaissance des stagiaires par voie d'affichage."
      ]
    }
  ],
  
  signataire: {
    nom: ORGANISME.responsablePedagogique.nom,
    fonction: `${ORGANISME.responsablePedagogique.fonction} - ${ORGANISME.nom}`
  }
};

// Fonction utilitaire pour obtenir le contenu formaté d'un article
export function getArticleContent(article: Article): string[] {
  const lines: string[] = [];
  
  if (article.contenu) {
    lines.push(...article.contenu);
  }
  
  if (article.sous_articles) {
    for (const sa of article.sous_articles) {
      lines.push(`${sa.numero} - ${sa.titre}`);
      lines.push(...sa.contenu);
      lines.push('');
    }
  }
  
  return lines;
}

// Fonction pour obtenir tous les articles formatés
export function getAllArticlesFormatted(): { titre: string; contenu: string[] }[] {
  return REGLEMENT_INTERIEUR.articles.map(article => ({
    titre: `ARTICLE ${article.numero} - ${article.titre}`,
    contenu: getArticleContent(article)
  }));
}
