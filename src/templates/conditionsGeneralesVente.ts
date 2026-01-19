// ============================================================
// CONDITIONS GÉNÉRALES DE VENTE (CGV) - Template pour génération PDF
// ============================================================

import { ORGANISME, TARIFS } from '@/constants/formations';

export interface SousArticleCGV {
  numero: string;
  titre: string;
  contenu: string[];
}

export interface ArticleCGV {
  numero: number;
  titre: string;
  contenu?: string[];
  sous_articles?: SousArticleCGV[];
}

export interface ConditionsGeneralesVente {
  titre: string;
  version: string;
  articles: ArticleCGV[];
  signataire: {
    nom: string;
    fonction: string;
  };
}

export const CONDITIONS_GENERALES_VENTE: ConditionsGeneralesVente = {
  titre: "CONDITIONS GÉNÉRALES DE VENTE",
  version: "01/01/2026",
  
  articles: [
    {
      numero: 1,
      titre: "CHAMP D'APPLICATION",
      contenu: [
        `Les présentes Conditions Générales de Vente (CGV) s'appliquent à toutes les formations dispensées par ${ORGANISME.nom}, organisme de formation professionnelle.`,
        "",
        "Toute inscription à une formation implique l'acceptation sans réserve des présentes CGV."
      ]
    },
    {
      numero: 2,
      titre: "OBJET",
      contenu: [
        `${ORGANISME.nom} propose des formations professionnelles dans le domaine du transport public particulier de personnes (T3P), notamment :`,
        "• Formation VTC (Voiture de Transport avec Chauffeur)",
        "• Formation TAXI",
        "• Formation VMDTR (Véhicule Motorisé à Deux ou Trois Roues)",
        "• Stages de récupération de points"
      ]
    },
    {
      numero: 3,
      titre: "INSCRIPTION",
      sous_articles: [
        {
          numero: "3.1",
          titre: "Modalités d'inscription",
          contenu: [
            "L'inscription devient définitive après :",
            "1. Réception du dossier d'inscription complet",
            "2. Vérification des prérequis réglementaires",
            "3. Signature de la convention de formation",
            "4. Paiement de l'acompte (sauf mention contraire)"
          ]
        },
        {
          numero: "3.2",
          titre: "Dossier d'inscription",
          contenu: [
            "Le dossier complet comprend :",
            "• Formulaire d'inscription rempli et signé",
            "• Copie de la pièce d'identité en cours de validité",
            "• Copie du permis de conduire (catégorie B depuis 3 ans minimum)",
            "• Justificatif de domicile de moins de 3 mois",
            "• Photo d'identité récente",
            "• Attestation de recensement ou JDC (pour les -25 ans)"
          ]
        },
        {
          numero: "3.3",
          titre: "Délai d'inscription",
          contenu: [
            "Les inscriptions sont acceptées jusqu'à 3 jours ouvrés avant le début de la formation, sous réserve de places disponibles.",
            "",
            "Effectif maximum : 12 stagiaires par session."
          ]
        }
      ]
    },
    {
      numero: 4,
      titre: "TARIFS ET MODALITÉS DE PAIEMENT",
      sous_articles: [
        {
          numero: "4.1",
          titre: "Tarifs",
          contenu: [
            "Les tarifs sont indiqués en euros Hors Taxes (HT).",
            "",
            "TVA non applicable - Article 261.4.4°a du CGI (formations continues).",
            "",
            "Les tarifs en vigueur sont :",
            `• Formation VTC journée (35h) : ${TARIFS.VTC.journee} € HT`,
            `• Formation VTC soirée (35h) : ${TARIFS.VTC.soiree} € HT`,
            `• Formation VTC weekend (35h) : ${TARIFS.VTC.weekend} € HT`,
            `• Formation TAXI journée (35h) : ${TARIFS.TAXI.journee} € HT`,
            `• Formation VMDTR (35h) : ${TARIFS.VMDTR.journee} € HT`,
            "",
            "Ces tarifs comprennent :",
            "• Les 35 heures de formation",
            "• Les supports pédagogiques",
            "• L'accès plateforme e-learning (3 mois)",
            "• L'attestation de fin de formation",
            "",
            "Ces tarifs ne comprennent pas :",
            "• Les frais d'inscription à l'examen CMA (environ 192 €)",
            "• Les frais de transport et d'hébergement",
            "• Les repas"
          ]
        },
        {
          numero: "4.2",
          titre: "Modalités de paiement",
          contenu: [
            "Option 1 - Paiement comptant :",
            "Paiement intégral à l'inscription (avantage : aucun frais supplémentaire)",
            "",
            "Option 2 - Paiement échelonné :",
            "• Acompte de 30% à l'inscription",
            "• Solde de 70% au premier jour de formation",
            "",
            "Moyens de paiement acceptés :",
            "• Virement bancaire (RIB sur demande)",
            `• Chèque à l'ordre de "${ORGANISME.raisonSociale}"`,
            "• Espèces (dans la limite légale de 1 000 €)",
            "• Carte bancaire (paiement sécurisé en ligne)"
          ]
        },
        {
          numero: "4.3",
          titre: "Retard de paiement",
          contenu: [
            "En cas de retard de paiement :",
            "• Relance écrite à J+7",
            "• Pénalités de retard de 3 fois le taux d'intérêt légal",
            "• Indemnité forfaitaire pour frais de recouvrement : 40 €",
            "• Suspension possible de l'accès à la formation",
            "",
            "Un retard de paiement de plus de 15 jours peut entraîner l'annulation de l'inscription sans remboursement de l'acompte versé."
          ]
        }
      ]
    },
    {
      numero: 5,
      titre: "FINANCEMENT",
      sous_articles: [
        {
          numero: "5.1",
          titre: "Compte Personnel de Formation (CPF)",
          contenu: [
            "Nos formations VTC, TAXI et VMDTR sont éligibles au CPF.",
            "",
            "Code CPF : 235802",
            "",
            "Procédure :",
            "1. Créer un compte sur moncompteformation.gouv.fr",
            `2. Rechercher "${ORGANISME.nom}" ou la formation souhaitée`,
            "3. S'inscrire directement en ligne",
            "4. Validation sous 48h (jours ouvrés)",
            "",
            "En cas de financement CPF, aucun acompte n'est requis. Le paiement est directement versé par la Caisse des Dépôts."
          ]
        },
        {
          numero: "5.2",
          titre: "Autres financements",
          contenu: [
            "Nos formations peuvent être prises en charge par :",
            "• France Travail (AIF - Aide Individuelle à la Formation)",
            "• Région Île-de-France (selon dispositifs en vigueur)",
            "• OPCO (Opérateurs de Compétences)",
            "• Entreprises (plan de développement des compétences)",
            "",
            `Contact pour étude de financement : ${ORGANISME.email}`
          ]
        }
      ]
    },
    {
      numero: 6,
      titre: "ANNULATION ET REPORT",
      sous_articles: [
        {
          numero: "6.1",
          titre: "Annulation par le stagiaire avant le début de la formation",
          contenu: [
            "Délai de rétractation légal (article L.6353-5 du Code du travail) :",
            "• Délai : 10 jours à compter de la signature de la convention",
            "• Modalités : Lettre recommandée avec AR",
            "• Effet : Remboursement intégral des sommes versées (délai 30 jours)",
            "",
            "Après le délai de rétractation :",
            "• Plus de 30 jours avant le début : remboursement intégral (- 50 € frais de dossier)",
            "• Entre 30 et 15 jours avant : retenue de 30% du montant total",
            "• Entre 14 et 7 jours avant : retenue de 50% du montant total",
            "• Moins de 7 jours avant : retenue de 100% (sauf cas de force majeure)",
            "",
            "Cas de force majeure (avec justificatif) :",
            "• Maladie grave ou accident (certificat médical)",
            "• Décès d'un proche (acte de décès)",
            "• Mutation professionnelle (attestation employeur)",
            "",
            "Dans ces cas : report sur une autre session sans frais ou remboursement intégral."
          ]
        },
        {
          numero: "6.2",
          titre: "Annulation par le stagiaire en cours de formation",
          contenu: [
            "En cas d'abandon :",
            "• Facturation au prorata des heures effectuées",
            "• Indemnité forfaitaire de 100 € (frais de dossier)",
            "• Aucun remboursement des heures non effectuées (sauf force majeure)"
          ]
        },
        {
          numero: "6.3",
          titre: "Report demandé par le stagiaire",
          contenu: [
            "Un report est possible une seule fois :",
            "• Demande par écrit minimum 7 jours avant le début",
            "• Frais de report : 50 € (si hors délai de rétractation)",
            "• Report sur une session dans les 6 mois",
            "• Au-delà de 6 mois : annulation et application des CGV"
          ]
        },
        {
          numero: "6.4",
          titre: `Annulation par ${ORGANISME.nom}`,
          contenu: [
            `${ORGANISME.nom} se réserve le droit d'annuler une session en cas de :`,
            "• Nombre insuffisant de participants (minimum 4 stagiaires)",
            "• Force majeure (grève, catastrophe naturelle, pandémie, etc.)",
            "• Indisponibilité du formateur",
            "",
            `En cas d'annulation par ${ORGANISME.nom} :`,
            "• Information des stagiaires minimum 7 jours avant (sauf force majeure)",
            "• Proposition d'une nouvelle session ou remboursement intégral",
            "• Aucune indemnité supplémentaire ne pourra être réclamée"
          ]
        }
      ]
    },
    {
      numero: 7,
      titre: "DÉROULEMENT DE LA FORMATION",
      sous_articles: [
        {
          numero: "7.1",
          titre: "Convocation",
          contenu: [
            "Une convocation est adressée au stagiaire par email 7 jours avant le début de la formation, précisant :",
            "• Dates et horaires",
            "• Lieu de formation (adresse, plan d'accès)",
            "• Programme",
            "• Liste des documents à apporter"
          ]
        },
        {
          numero: "7.2",
          titre: "Assiduité",
          contenu: [
            "La présence à 100% des heures est obligatoire pour :",
            "• Obtenir l'attestation de fin de formation",
            "• Se présenter à l'examen CMA",
            "",
            "Émargement obligatoire matin et après-midi."
          ]
        },
        {
          numero: "7.3",
          titre: "Absence et retard",
          contenu: [
            "Toute absence doit être :",
            "• Signalée immédiatement par téléphone",
            "• Justifiée par écrit sous 48h",
            "",
            "Absence non justifiée > 4h :",
            "• Non-délivrance de l'attestation",
            "• Facturation des heures non suivies",
            "• Obligation de se réinscrire et repayer"
          ]
        },
        {
          numero: "7.4",
          titre: "Évaluation",
          contenu: [
            "Évaluation continue :",
            "• QCM réguliers",
            "• Exercices pratiques",
            "• Examen blanc en conditions réelles",
            "",
            "L'obtention d'une note < 10/20 à l'examen blanc ne permet pas l'obtention de l'attestation. Le stagiaire devra suivre des heures de renforcement (facturation supplémentaire)."
          ]
        }
      ]
    },
    {
      numero: 8,
      titre: "OBLIGATIONS DU STAGIAIRE",
      contenu: [
        "Le stagiaire s'engage à :",
        "• Respecter le règlement intérieur",
        "• Être assidu et ponctuel",
        "• Participer activement à la formation",
        "• Respecter le matériel et les locaux",
        "• Avoir un comportement respectueux",
        "• Fournir des informations exactes et à jour"
      ]
    },
    {
      numero: 9,
      titre: `OBLIGATIONS DE ${ORGANISME.nom}`,
      contenu: [
        `${ORGANISME.nom} s'engage à :`,
        "• Dispenser une formation conforme au programme annoncé",
        "• Mettre à disposition des formateurs qualifiés",
        "• Fournir les supports pédagogiques nécessaires",
        "• Délivrer une attestation de fin de formation",
        "• Respecter la réglementation en vigueur",
        "• Maintenir la certification Qualiopi"
      ]
    },
    {
      numero: 10,
      titre: "EXAMEN CMA",
      sous_articles: [
        {
          numero: "10.1",
          titre: "Inscription à l'examen",
          contenu: [
            "L'inscription à l'examen CMA se fait :",
            "• En ligne sur le site de la CMA",
            "• Minimum 3 semaines avant la date souhaitée",
            "• Sur présentation de l'attestation de fin de formation",
            "",
            "Frais d'examen : environ 192 € (à régler directement à la CMA)"
          ]
        },
        {
          numero: "10.2",
          titre: "Assistance administrative",
          contenu: [
            `${ORGANISME.nom} assiste le stagiaire pour :`,
            "• Constitution du dossier",
            "• Choix de la date d'examen",
            "• Conseils sur les formalités"
          ]
        },
        {
          numero: "10.3",
          titre: "Résultats",
          contenu: [
            "Les résultats sont disponibles sous 48h après l'examen sur le site de la CMA.",
            "",
            "En cas d'échec :",
            "• Possibilité de repasser l'examen (nouveaux frais CMA)",
            `• Possibilité de suivre des heures de renforcement chez ${ORGANISME.nom} (tarif horaire : 50 €/h)`
          ]
        }
      ]
    },
    {
      numero: 11,
      titre: "PROPRIÉTÉ INTELLECTUELLE",
      contenu: [
        `Tous les supports de formation (cours, exercices, QCM) sont la propriété exclusive de ${ORGANISME.nom}.`,
        "",
        "Ils sont protégés par le Code de la Propriété Intellectuelle.",
        "",
        "Toute reproduction, diffusion ou commercialisation est strictement interdite sans autorisation écrite préalable."
      ]
    },
    {
      numero: 12,
      titre: "RESPONSABILITÉ ET ASSURANCE",
      sous_articles: [
        {
          numero: "12.1",
          titre: `Responsabilité de ${ORGANISME.nom}`,
          contenu: [
            `${ORGANISME.nom} est assurée en responsabilité civile professionnelle.`,
            "",
            "Sa responsabilité ne pourra être engagée qu'en cas de faute prouvée.",
            "",
            `${ORGANISME.nom} ne peut être tenue responsable :`,
            "• De l'échec à l'examen CMA",
            "• Des conséquences d'absences du stagiaire",
            "• De la non-obtention d'un financement",
            "• De vols ou dégradations de biens personnels"
          ]
        },
        {
          numero: "12.2",
          titre: "Responsabilité du stagiaire",
          contenu: [
            "Le stagiaire doit être couvert par une assurance responsabilité civile.",
            "",
            "Il est responsable des dommages causés aux personnes, matériels et locaux pendant la formation."
          ]
        }
      ]
    },
    {
      numero: 13,
      titre: "PROTECTION DES DONNÉES PERSONNELLES",
      contenu: [
        "Conformément au RGPD :",
        "",
        "Finalités de la collecte :",
        "• Gestion administrative de la formation",
        "• Obligations légales et réglementaires",
        "• Amélioration de nos services",
        "• Communication (avec accord)",
        "",
        "Durée de conservation : 3 ans après la fin de la formation",
        "",
        "Droits du stagiaire :",
        "• Accès, rectification, suppression",
        "• Opposition, limitation",
        "• Portabilité",
        "",
        `Contact DPO : ${ORGANISME.email}`
      ]
    },
    {
      numero: 14,
      titre: "RÉCLAMATION ET MÉDIATION",
      sous_articles: [
        {
          numero: "14.1",
          titre: "Réclamation",
          contenu: [
            "Toute réclamation doit être adressée par écrit à :",
            ORGANISME.email,
            "",
            "Délai de réponse : 15 jours ouvrés maximum"
          ]
        },
        {
          numero: "14.2",
          titre: "Médiation de la consommation",
          contenu: [
            "En cas de litige non résolu à l'amiable, le stagiaire peut saisir gratuitement le médiateur de la consommation :",
            "",
            "MEDICYS",
            "73 Boulevard de Clichy",
            "75009 PARIS",
            "contact@medicys.fr",
            "https://www.medicys.fr"
          ]
        },
        {
          numero: "14.3",
          titre: "Plateforme européenne de RLL (Règlement en Ligne des Litiges)",
          contenu: [
            "https://ec.europa.eu/consumers/odr"
          ]
        }
      ]
    },
    {
      numero: 15,
      titre: "MODIFICATION DES CGV",
      contenu: [
        `${ORGANISME.nom} se réserve le droit de modifier les présentes CGV à tout moment.`,
        "",
        "Les CGV applicables sont celles en vigueur à la date d'inscription."
      ]
    },
    {
      numero: 16,
      titre: "DROIT APPLICABLE ET JURIDICTION",
      contenu: [
        "Les présentes CGV sont soumises au droit français.",
        "",
        "En cas de litige non résolu à l'amiable, compétence exclusive est attribuée aux tribunaux de Nanterre, nonobstant pluralité de défendeurs ou appel en garantie."
      ]
    }
  ],
  
  signataire: {
    nom: ORGANISME.responsablePedagogique.nom,
    fonction: ORGANISME.responsablePedagogique.fonction
  }
};

// Fonction utilitaire pour obtenir le contenu formaté d'un article
export function getArticleCGVContent(article: ArticleCGV): string[] {
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
export function getAllCGVArticlesFormatted(): { titre: string; contenu: string[] }[] {
  return CONDITIONS_GENERALES_VENTE.articles.map(article => ({
    titre: `ARTICLE ${article.numero} - ${article.titre}`,
    contenu: getArticleCGVContent(article)
  }));
}
